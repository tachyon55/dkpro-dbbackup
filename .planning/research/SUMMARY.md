# Project Research Summary

**Project:** Database Backup Manager Web App
**Domain:** Internal DevOps / Database Operations Tool
**Researched:** 2026-03-28
**Confidence:** HIGH

## Executive Summary

This is a web-based database backup management system — a migration of an existing Delphi desktop tool to a modern web UI. The product sits between lightweight dev tools (TablePlus, pgAdmin) and enterprise ops platforms (Barman, Veeam). Experts in this domain build it as a layered system: stateless REST for CRUD operations, long-running async processes for backup execution decoupled from the request cycle, and WebSocket for real-time progress delivery. The recommended stack is Next.js 15 (App Router) + TypeScript + PostgreSQL/Prisma for the application layer, with Socket.io for real-time communication via a custom HTTP server since Next.js App Router does not natively support WebSocket.

The key architectural decisions that must be locked in early are: AES-256-GCM credential encryption with the key stored only in environment variables (never the DB), `child_process.spawn()` (not `exec()`) for all dump tool invocations, and a per-DB driver abstraction layer to isolate the behavioral differences between MySQL, PostgreSQL, SQL Server, Oracle, and SQLite dump tools. The single differentiator that lifts this above a basic backup script is combining real-time progress, scheduling, retention management, and a SQL query executor in one interface.

The top risks are security-first: shell injection via exec(), encryption key exposure, and WebSocket progress leaking to unauthorized users. These are not recoverable bugs — they require architectural fixes. All three must be addressed in Phase 1-2 before any feature work proceeds. Retention cleanup deleting the last remaining backup is the other existential risk and must be defended against in Phase 3.

## Key Findings

### Recommended Stack

The stack is well-established with high confidence across all choices. Next.js 15 with App Router and TypeScript provides the full-stack foundation. PostgreSQL 16 + Prisma 5 handles the application database (users, connections, schedules, backup history). Auth is NextAuth.js v5 with a custom RBAC middleware enforcing three roles: `admin`, `operator`, and `viewer`. Socket.io 4 runs on a custom `server.ts` HTTP server alongside Next.js — this is required because App Router has no native WebSocket support.

For backup execution, node-cron handles scheduling on single-server deployments (upgrade path to BullMQ + Redis exists if multi-instance is needed). Each supported database type has its own native driver: mysql2 for MySQL/MariaDB, pg for PostgreSQL, mssql for SQL Server, oracledb for Oracle (requires Instant Client in Docker), better-sqlite3 for SQLite. Credential encryption uses Node.js built-in `crypto` with AES-256-GCM, storing `iv:authTag:ciphertext` as Base64. Cloud upload uses `@aws-sdk/client-s3` v3 with streaming multipart upload.

**Core technologies:**
- Next.js 15 (App Router): Full-stack framework, SSR + API Routes, React 19 built-in
- TypeScript 5: Type safety throughout, required for Prisma integration
- PostgreSQL 16 + Prisma 5: Application data store, type-safe queries, migration management
- NextAuth.js v5: Authentication with Credentials support and custom RBAC via session roles
- Socket.io 4: Real-time backup progress with room-scoped broadcasting
- node-cron 3: Lightweight cron scheduler, sufficient for single-server deployment
- AES-256-GCM (Node crypto): Authenticated encryption for stored DB credentials
- child_process.spawn(): Safe dump tool invocation — shell injection prevention
- @aws-sdk/client-s3 v3: Cloud storage with streaming multipart upload
- Nodemailer 6 + @slack/web-api 7: Email and Slack notifications

### Expected Features

See `FEATURES.md` for the full dependency graph and build sequence.

**Must have (table stakes):**
- Multi-DB connection CRUD (MySQL, MariaDB, PostgreSQL, SQL Server, Oracle, SQLite)
- Connection test (verify credentials before saving)
- Encrypted credential storage (AES-256-GCM)
- Manual backup execution with real-time progress
- Scheduled automatic backup (per-connection cron)
- Backup history with pass/fail status and error logs
- Backup file download
- Local server storage with configurable path
- Multi-user auth with RBAC (admin / operator / viewer)
- Dashboard (connection status, recent backups, schedule summary)
- Backup retention / auto-cleanup by age
- Clear error visibility on failure

**Should have (differentiators):**
- Real-time backup progress via WebSocket (elevates from script to product)
- Email + Slack notifications on success/failure
- SQL query executor with statement-level RBAC
- Saved queries management
- Overdue backup detection and alert
- Cloud storage upload option (S3/S3-compatible)
- Backup integrity check (SHA-256 hash)
- Audit log (who triggered what, when)

**Defer to v2+:**
- Full database restore via UI (too dangerous — restore via deliberate CLI)
- Automated restore testing (requires sandbox environments)
- In-browser schema browser / ERD (use dedicated tools)
- Query notebooks
- Multi-tenancy
- Real-time DB performance monitoring (different product category)

### Architecture Approach

The architecture is a layered service model with clear component boundaries. The UI (Next.js App Router pages) talks to API Routes for all CRUD and backup triggers, which delegate to discrete service modules: BackupService (orchestrates spawn + file management), SchedulerService (cron + due-check), CryptoService (AES-256-GCM), StorageService (local + S3), and NotificationService (email/Slack). A DB Driver Abstraction layer (`DatabaseDriver` interface) isolates per-DB behavioral differences. All backup execution is decoupled from the HTTP request cycle — the API returns `{ status: "started" }` immediately and progress flows via WebSocket rooms.

**Major components:**
1. Auth Middleware (`src/lib/auth.ts`) — Session validation + RBAC enforcement on every API route
2. DB Driver Abstraction (`src/lib/drivers/`) — Per-DB implementation of testConnection, getDumpCommand, executeQuery
3. Backup Service (`src/lib/services/backup.ts`) — Orchestrates decrypt → spawn → stream → save history → notify
4. Scheduler Service (`src/lib/services/scheduler.ts`) — Cron loop, due-schedule detection, concurrency guard
5. WebSocket Server (`server.ts`) — Socket.io over custom HTTP server, room-scoped progress broadcasting
6. Crypto Service (`src/lib/services/crypto.ts`) — AES-256-GCM envelope encryption for stored credentials
7. Storage Service (`src/lib/services/storage.ts`) — Local file management + streaming S3 multipart upload

### Critical Pitfalls

1. **Shell injection via exec()** — Use `spawn()` with args as array exclusively; never interpolate connection fields into command strings. Must be correct from the first backup implementation.
2. **Encryption key in the database** — `ENCRYPTION_KEY` must live only in environment variables. Key in DB = single breach exposes all target DB credentials. Set this architecture before any credentials are stored.
3. **Concurrent backup collisions** — Per-connection mutex/`isRunning` flag required. Scheduler must skip connections already running. Missing this produces corrupted dumps counted as success.
4. **Large dump files through Node.js memory** — Stream `spawn` stdout directly to file via `pipe()`. Never `Buffer.concat()`. Use `@aws-sdk/lib-storage` streaming upload for S3. OOM crash affects all scheduled jobs.
5. **Retention cleanup deleting last backup** — Never delete if it would leave zero successful backups. Check successful backup count before any deletion. This is the scenario the entire tool exists to prevent.
6. **WebSocket progress leaked to wrong users** — Always `io.to(room).emit()`, never `io.emit()`. Authenticate on connect via Socket.io middleware. Room-scope to `user:{userId}` or `backup:{connectionId}`.
7. **Zero-byte backup counted as success** — Verify file size > 0 and header content after dump tool exits with code 0. Store file size in history; flag anomalies.

## Implications for Roadmap

Based on combined research, a 4-phase structure is recommended. The ordering is driven by: (a) security architecture must precede any credential storage, (b) backup execution is the core value and unlocks all downstream features, (c) automation (scheduler + retention) builds on proven backup execution, (d) query executor and polish are high-value but not on the critical path.

### Phase 1: Foundation + Auth + Connection Management

**Rationale:** Security architecture (encryption key strategy, RBAC) must be locked before any credentials are stored. Connection management is the prerequisite for everything else — no backup runs without a working connection.
**Delivers:** Working app skeleton, user login with roles, full connection CRUD with encrypted credential storage, connection test (SELECT 1), DB driver abstraction interface with all 5 DB type implementations.
**Addresses:** Table stakes features 1-3, 10-11.
**Avoids:** Pitfall #2 (encryption key exposure), Pitfall #14 (RBAC at route level only).
**Research flag:** Standard patterns — NextAuth + Prisma + AES-256-GCM are well-documented. No phase research needed.

### Phase 2: Backup Engine + Real-time Progress

**Rationale:** This is the core product value. All downstream features (scheduling, retention, notifications, cloud upload) depend on correct backup execution. Security-critical: shell injection, memory streaming, WebSocket scoping must be correct from day one.
**Delivers:** Manual backup trigger, real-time progress via WebSocket, backup history with status/logs, backup file download, local storage management.
**Uses:** child_process.spawn(), Socket.io rooms, Storage Service, BackupService.
**Avoids:** Pitfall #1 (shell injection), Pitfall #3 (concurrent backups), Pitfall #4 (memory OOM), Pitfall #5 (WebSocket leak), Pitfall #10 (directory traversal), Pitfall #12 (Oracle/MSSQL stdout differences), Pitfall #13 (zero-byte success).
**Research flag:** Oracle expdp and SQL Server BACKUP DATABASE behavior differs significantly from mysqldump/pg_dump — these write to file directly and do not stream stdout. Needs careful per-driver implementation.

### Phase 3: Automation + Notifications + Retention

**Rationale:** Scheduling and retention are the "set it and forget it" value proposition — what separates this from running mysqldump manually. Must build on proven backup execution from Phase 2.
**Delivers:** Per-connection scheduled backup (node-cron), retention auto-cleanup with safety guard, email + Slack notifications, overdue backup detection, stale job recovery on server restart.
**Avoids:** Pitfall #6 (cloud upload OOM), Pitfall #7 (retention deletes last backup), Pitfall #11 (stuck jobs after restart), Pitfall #15 (notification failure blocking backup).
**Research flag:** Standard patterns for node-cron and Nodemailer. Stale job recovery logic (reset `running` status older than max duration on startup) is non-obvious — worth a brief implementation plan.

### Phase 4: Dashboard + Query Executor + Cloud Storage

**Rationale:** Dashboard aggregates all data sources so it can only be built after all data exists. Query executor is a high-value differentiator but not on the critical path. Cloud storage upload is optional enhancement.
**Delivers:** Dashboard (connection status, recent backups, schedule summary, overdue alerts), SQL query executor with RBAC statement controls, saved queries, cloud storage upload option (S3/S3-compatible), audit log, backup integrity check (SHA-256).
**Avoids:** Pitfall #8 (query executor without statement controls — DDL/DML must require confirmation and respect viewer/operator/admin roles).
**Research flag:** SQL statement classification (SELECT vs DML vs DDL) before execution needs explicit implementation. S3 multipart streaming upload pattern is well-documented in AWS SDK v3.

### Phase Ordering Rationale

- Auth and encryption architecture cannot be retrofitted after credentials are stored — they are Phase 1 non-negotiables.
- Backup execution (Phase 2) is intentionally isolated before adding automation (Phase 3) so that concurrency, streaming, and error handling are proven before the scheduler drives them unattended.
- Notifications are Phase 3 (not Phase 2) because they are fire-and-forget — they must never block backup result recording, and that discipline is easier to implement once the backup pipeline is stable.
- Dashboard is Phase 4 because it is a read aggregation layer that adds no new data — it can only be built meaningfully when all data sources exist.

### Research Flags

Phases needing deeper implementation research during planning:
- **Phase 2:** Oracle `expdp` and SQL Server `BACKUP DATABASE TO DISK` behave fundamentally differently from streaming dump tools. Per-driver progress reporting strategy needs explicit design before coding.
- **Phase 3:** Stale job recovery logic on server restart is not covered by standard cron library docs — needs explicit implementation pattern.

Phases with standard, well-documented patterns:
- **Phase 1:** NextAuth v5 + Prisma + AES-256-GCM are thoroughly documented.
- **Phase 4:** S3 multipart streaming via `@aws-sdk/lib-storage` is standard. SQL RBAC is straightforward given the driver abstraction already exists.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies are established and production-proven. Oracle driver caveat (Instant Client) is well-understood. |
| Features | MEDIUM | Core features are clear. Query executor scope (how much DML to allow for operator role) will need product decision during requirements. |
| Architecture | HIGH | Patterns are well-documented. Oracle/MSSQL dump stdout difference is a known gotcha, not an unknown. |
| Pitfalls | HIGH | All pitfalls are common failure modes with documented prevention strategies. |

**Overall confidence:** HIGH

### Gaps to Address

- **Oracle support scope:** oracledb requires Oracle Instant Client in the Docker image. If Oracle support is deferred to v2, the driver abstraction interface should still be designed to accommodate it — the connection form just disables Oracle as a DB type until the binary is available.
- **Query executor DML permissions:** The research recommends operator role can run "limited DML" but does not define the exact boundary. This needs a product decision during requirements: allow INSERT/UPDATE but not DROP/TRUNCATE? Or SELECT-only for operator by default with admin override?
- **BullMQ upgrade trigger:** The research notes node-cron is sufficient for single-server but BullMQ is needed for multi-instance. The decision point (when to upgrade) should be defined during roadmap — likely tied to a specific deployment requirement.
- **Backup directory configuration:** Research identifies local storage as table stakes but does not specify whether the backup directory is a fixed server path or user-configurable per connection. This needs a product decision.

## Sources

### Primary (HIGH confidence)
- Next.js 15 App Router official docs — App Router, custom server pattern for Socket.io
- Prisma 5 official docs — schema design, migrations, type-safe queries
- NextAuth.js v5 official docs — credentials provider, session role extension
- Socket.io 4 official docs — custom server integration, room-scoped emit
- AWS SDK v3 `@aws-sdk/lib-storage` docs — streaming multipart upload
- Node.js `child_process` docs — spawn() vs exec() security properties
- Node.js `crypto` docs — AES-256-GCM implementation with IV + AuthTag

### Secondary (MEDIUM confidence)
- node-cron GitHub README — single-server scheduling patterns
- shadcn/ui docs — component system, copy-paste model
- Community patterns for Next.js + WebSocket (custom server.ts) — well-established workaround

### Tertiary (LOW confidence)
- Oracle expdp behavior in containers — limited community documentation; needs validation during Phase 2 implementation
- SQL Server BACKUP DATABASE TO DISK streaming behavior — behavior documented in MSSQL docs but Node.js integration patterns are sparse

---
*Research completed: 2026-03-28*
*Ready for roadmap: yes*
