# Pitfalls Research: Database Backup Manager Web App

**Researched:** 2026-03-28
**Confidence:** HIGH (common failure patterns well-documented)

## Critical Pitfalls (Security Breaches or Rewrites)

### 1. Shell Injection via child_process.exec()
**What goes wrong:** Connection fields (host, username, database name) interpolated into shell command string. Attacker with connection edit access injects shell commands.

**Example:**
```
Database name: "mydb; rm -rf /"
Command: mysqldump -h host -u user mydb; rm -rf /
```

**Consequences:** Remote code execution on backup server.

**Prevention:**
- Use `child_process.spawn()` with arguments as array (never string concatenation)
- Validate connection fields against allowlist regex (alphanumeric, dots, hyphens only)
- Run backup process as restricted OS user

**Warning signs:** Any use of `exec()` or template literals in command construction.

**Phase:** Phase 2 (Backup Engine) — must be correct from the first implementation.

---

### 2. Encryption Key in Database
**What goes wrong:** AES encryption key stored in same PostgreSQL database as encrypted passwords. DB compromise = all credentials exposed.

**Consequences:** All target database credentials leaked in single breach.

**Prevention:**
- Encryption key ONLY in environment variable (`ENCRYPTION_KEY`)
- Never log, persist, or transmit the key
- Different keys per environment (dev/staging/prod)
- Key rotation strategy documented (re-encrypt all credentials)

**Warning signs:** Key in config file, .env committed to git, key in Prisma schema/seed.

**Phase:** Phase 1 (Foundation) — encryption architecture set before any credentials stored.

---

### 3. Concurrent Backup Collisions
**What goes wrong:** Two backup jobs for the same database run simultaneously (manual + scheduled, or duplicate schedule triggers). Result: corrupted dumps, file overwrites, or target DB lock contention.

**Consequences:** Corrupted backup files, false success status, DB performance impact.

**Prevention:**
- Per-connection mutex/lock before backup starts
- Check `isRunning` flag in BackupHistory before starting
- Use connection-scoped file naming with timestamp (already in Delphi: `{DB}_{YYYYMMDD}_{HHMMSS}.sql`)
- Scheduler skips if backup already in progress for that connection

**Warning signs:** "Backup completed" logs with 0-byte files, duplicate timestamps in history.

**Phase:** Phase 2 (Backup Engine) — concurrency control built into backup service.

---

### 4. Large Dump Files Through Node.js Memory
**What goes wrong:** Reading entire backup file into memory for processing, size calculation, or cloud upload. Multi-GB dumps cause OOM crash.

**Consequences:** Server crash during backup of large databases, all scheduled jobs affected.

**Prevention:**
- Stream `spawn` stdout directly to file via `pipe()` — never buffer
- Use `fs.stat()` for file size after write completes
- Cloud upload: use multipart/streaming upload (S3 `Upload` from `@aws-sdk/lib-storage`)
- Set memory limits and monitor heap usage

**Warning signs:** `Buffer.concat()` or `data += chunk` patterns in backup code.

**Phase:** Phase 2 (Backup Engine) and Phase 3+ (Cloud Storage).

---

### 5. WebSocket Progress Leaking to Wrong Users
**What goes wrong:** Backup progress events broadcast globally instead of scoped to authorized users. Connection credentials, file paths, or error messages visible to other users.

**Consequences:** Information disclosure — connection names, hosts, file paths exposed.

**Prevention:**
- WebSocket authentication middleware (verify session/JWT on connect)
- Room-based scoping: `io.to(\`user:${userId}\`).emit()` or `io.to(\`backup:${connectionId}\`).emit()`
- RBAC check before joining rooms
- Never include credentials in progress events

**Warning signs:** `io.emit()` (global) instead of `io.to(room).emit()`.

**Phase:** Phase 2 (Real-time Progress) — security model from first WebSocket implementation.

---

### 6. Cloud Upload Memory / Silent Failure
**What goes wrong:** Cloud storage upload reads entire file into memory, or fails silently without marking backup as partially failed.

**Consequences:** OOM on large files, or users think backup is in cloud but it isn't.

**Prevention:**
- Use streaming multipart upload (`@aws-sdk/lib-storage` Upload class)
- Separate backup status from upload status (backup can succeed, upload can fail)
- Retry logic for transient upload failures (network timeouts)
- Verify upload with HEAD request after completion

**Warning signs:** `fs.readFileSync()` before upload, no error handling on upload promise.

**Phase:** Phase 3+ (Cloud Storage option).

---

### 7. Retention Cleanup Deleting Last Backup
**What goes wrong:** Retention cleanup runs and deletes old backups for a connection whose recent backups have been failing. Result: zero backups exist.

**Consequences:** Complete backup loss for a database — the one scenario this tool exists to prevent.

**Prevention:**
- Never delete if it would leave fewer than N (configurable, default 1) successful backups
- Check last successful backup age before cleanup
- Alert if no successful backup in X days (overdue detection)
- Retention cleanup logs every deletion for audit

**Warning signs:** Backup count drops to 0, retention runs without checking success status.

**Phase:** Phase 3 (Scheduler/Retention) — retention logic must be defensive.

---

### 8. Query Executor Without Statement Controls
**What goes wrong:** SQL query executor allows any SQL including DROP TABLE, TRUNCATE, DELETE without WHERE. A viewer-role user or misclick destroys production data.

**Consequences:** Data loss on target production databases.

**Prevention:**
- RBAC: viewer = SELECT only, operator = SELECT + limited DML, admin = all
- Parse SQL statement type before execution (SELECT, INSERT, UPDATE, DELETE, DDL)
- Require confirmation for DML/DDL statements
- Query timeout to prevent long-running locks
- Consider read-only connection for query executor by default

**Warning signs:** Single "execute" function for all SQL types, no statement classification.

**Phase:** Phase 4 (Query Executor) — permission model before execution logic.

## Moderate Pitfalls

### 9. Native Dump Tool Missing in Container
**What goes wrong:** Docker image doesn't include mysqldump, pg_dump, etc. Backup silently fails or returns unhelpful error.

**Prevention:**
- Dockerfile explicitly installs all dump tool packages
- Health check endpoint verifies tool availability at startup
- Connection form validates dump tool path exists

**Phase:** Phase 1 (Foundation) — Docker setup.

---

### 10. Directory Traversal via Connection Name
**What goes wrong:** Connection name used in backup file path without sanitization. Name like `../../etc/passwd` writes outside backup directory.

**Prevention:**
- Sanitize connection name: replace non-alphanumeric with underscore
- Use `path.resolve()` + verify result is within backup directory
- Never use user input directly in file paths

**Phase:** Phase 2 (Backup Engine).

---

### 11. Scheduled Jobs Stuck After Server Restart
**What goes wrong:** Server crashes during backup. Schedule record shows `lastBackupResult: "running"`. After restart, scheduler thinks backup is still running and never retries.

**Prevention:**
- On startup: reset any `running` status older than max expected duration
- Use `startedAt` timestamp to detect stale jobs
- Backup timeout (kill after configurable duration)

**Phase:** Phase 3 (Scheduler).

---

### 12. Oracle/SQL Server Dump Behavior Differences
**What goes wrong:** Assuming all dump tools work like mysqldump (stdout streaming). Oracle `expdp` and SQL Server `BACKUP DATABASE` write directly to files, don't stream to stdout.

**Prevention:**
- Per-DB backup strategy in Driver Abstraction
- Oracle: use `expdp` with `DIRECTORY` object, read file after completion
- SQL Server: `BACKUP DATABASE ... TO DISK`, read file after completion
- Different progress reporting strategy per DB type

**Phase:** Phase 2 (Backup Engine) — driver abstraction handles this.

---

### 13. Zero-Byte Backup Counted as Success
**What goes wrong:** Dump tool exits with code 0 but produces empty file (auth issue, empty DB, permission denied on specific tables). Counted as successful backup.

**Prevention:**
- Verify file size > 0 after backup
- Verify file starts with expected header (e.g., SQL comment for mysqldump)
- Store file size in backup history, flag anomalies (sudden size drop > 50%)

**Phase:** Phase 2 (Backup Engine).

## Minor Pitfalls

### 14. RBAC at Route Level Only
**What goes wrong:** RBAC checked in API route handler but Prisma queries don't filter by user permissions. Direct DB manipulation bypasses authorization.

**Prevention:**
- Prisma middleware or helper that injects permission filters
- Integration tests that verify unauthorized access is blocked at data level

**Phase:** Phase 1 (Auth/RBAC).

---

### 15. Notification Failure Blocking Backup
**What goes wrong:** Notification service throws error (SMTP timeout, Slack API down), and backup job's promise chain rejects — marking backup as failed even though dump succeeded.

**Prevention:**
- Notifications always in try/catch, never block backup result
- Fire-and-forget pattern: `notify().catch(log)` after backup status saved
- Separate notification status from backup status

**Phase:** Phase 3 (Notifications).

---

### 16. Korean Characters in File Paths
**What goes wrong:** Connection name "대광통상" used in backup filename causes encoding issues on different OS or cloud storage.

**Prevention:**
- Transliterate or use connection ID (UUID) for file naming
- Display name kept for UI, internal name for file paths
- File naming pattern: `{connectionId}_{YYYYMMDD}_{HHMMSS}.sql`

**Phase:** Phase 2 (Backup Engine).

## Phase-Specific Warning Map

| Phase | Critical Pitfalls | Moderate Pitfalls | Minor Pitfalls |
|-------|------------------|-------------------|----------------|
| Phase 1 (Foundation) | #2 (encryption key) | #9 (container tools) | #14 (RBAC depth) |
| Phase 2 (Backup Engine) | #1 (shell injection), #3 (concurrent), #4 (memory), #5 (WebSocket leak) | #10 (traversal), #12 (Oracle/MSSQL), #13 (zero-byte) | #16 (Korean paths) |
| Phase 3 (Automation) | #6 (cloud upload), #7 (retention) | #11 (stuck jobs) | #15 (notification blocking) |
| Phase 4 (Query/Polish) | #8 (query executor) | — | — |
