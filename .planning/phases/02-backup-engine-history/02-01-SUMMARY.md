---
phase: 02-backup-engine-history
plan: "01"
subsystem: backup-engine
tags: [prisma, backup, spawn, sha256, concurrency, sse]
dependency_graph:
  requires: [01-03, 01-04]
  provides: [backup-history-schema, backup-engine-lib, backup-store-lib, backup-tools-lib]
  affects: [02-02, 02-03]
tech_stack:
  added: [child_process.spawn, crypto.createHash, date-fns format, fs.createWriteStream]
  patterns: [globalThis-singleton-hot-reload, stdout-streaming-sha256, PGPASSWORD-env-var, args-array-no-exec]
key_files:
  created:
    - prisma/migrations/20260329000000_add_backup_history/migration.sql
    - prisma/migrations/migration_lock.toml
    - src/lib/backup-store.ts
    - src/lib/backup-tools.ts
    - src/lib/backup-engine.ts
  modified:
    - prisma/schema.prisma
    - .env.example
decisions:
  - "Migration created manually (DB not running locally) — migration file is valid SQL for apply-on-deploy"
  - "isStdoutDump() splits two execution paths: streaming file-write+hash for mysql/mariadb/pg/sqlite vs disk-write capture for sqlserver/oracle"
  - "Oracle expdp fileSizeBytes is null when file lives on DB server, not local disk — this is expected behavior"
  - "computeFileSha256 utility added for re-verification without loading file into memory"
metrics:
  duration: "25 min"
  completed_date: "2026-03-29"
  tasks_completed: 2
  files_created: 5
  files_modified: 2
---

# Phase 02 Plan 01: Backup Engine Foundation Summary

**One-liner:** Prisma BackupHistory schema + spawn-based backup engine with streaming SHA-256 hash, per-DB concurrency locks, and PGPASSWORD-secured PostgreSQL support.

## What Was Built

### Task 1: Prisma Schema Extension

Extended `prisma/schema.prisma` with:

- `BackupStatus` enum: `running | success | failed`
- Three new `AuditEventType` values: `BACKUP_START`, `BACKUP_COMPLETE`, `BACKUP_FAIL`
- `BackupHistory` model with all required fields including `fileSizeBytes BigInt`, `fullLog @db.Text`, `connectionId?` (nullable with `onDelete: SetNull`)
- `backupHistories BackupHistory[]` reverse relation on `DbConnection`

Migration file created at `prisma/migrations/20260329000000_add_backup_history/migration.sql`. Prisma client regenerated with updated TypeScript types.

### Task 2: Backup Library Modules

**`src/lib/backup-store.ts`**
- `globalThis._backupInProgress` Set survives Next.js hot-reload
- `isBackupRunning()`, `lockBackup()`, `unlockBackup()` for concurrency control
- `recoverOrphanedBackups()` marks all `status=running` records as `failed` on server restart

**`src/lib/backup-tools.ts`**
- `buildSpawnArgs()` per-DB strategy: mysqldump, pg_dump (PGPASSWORD env), sqlcmd, expdp, sqlite3
- All args passed as arrays — never string interpolation (shell injection prevention)
- `getFileExtension()`, `generateBackupFileName()` (sanitized `{dbName}_{yyyyMMdd_HHmmss}.ext`)
- `getBackupDir()` creates `{BACKUP_BASE_DIR}/{connectionId}/` directory
- `isStdoutDump()` splits stdout-streaming vs disk-write execution paths

**`src/lib/backup-engine.ts`**
- `runBackup(historyId, send)` — main orchestrator
- Stdout-dump path: pipes `child.stdout` to `fs.createWriteStream` and `crypto.createHash('sha256')` simultaneously
- Disk-write path (sqlserver/oracle): captures stdout/stderr for logs, parses SQL Server percent-complete messages
- SSE events emitted: `started`, `progress`, `log`, `complete`, `error`
- Audit logs created for `BACKUP_START`, `BACKUP_COMPLETE`, `BACKUP_FAIL` — all wrapped in try/catch per convention
- `finally` block always calls `unlockBackup(connectionId)` regardless of outcome

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | d71b2ac | feat(02-01): Prisma schema — BackupHistory model + BackupStatus enum |
| Task 2 | 727df29 | feat(02-01): backup-store, backup-tools, backup-engine modules |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Notes

1. **DB not running locally:** `prisma migrate dev` could not connect to PostgreSQL. Migration file was created manually with correct SQL. `prisma generate` succeeded and generated updated TypeScript client types. Migration will apply on first `prisma migrate deploy` against a running DB.

2. **computeFileSha256 utility added (Rule 2):** Added `computeFileSha256(filePath)` streaming utility to `backup-engine.ts` for re-verification of backup files without loading them into memory. This is a correctness addition for future verification use cases.

## Known Stubs

None. All functions are fully implemented with no placeholder data.

## Self-Check

### Files Created/Modified
- [x] `prisma/schema.prisma` — contains `model BackupHistory`, `enum BackupStatus`, `BACKUP_START`
- [x] `prisma/migrations/20260329000000_add_backup_history/migration.sql` — valid SQL migration
- [x] `prisma/migrations/migration_lock.toml` — provider = "postgresql"
- [x] `src/lib/backup-store.ts` — exports `isBackupRunning`, `lockBackup`, `unlockBackup`, `recoverOrphanedBackups`
- [x] `src/lib/backup-tools.ts` — exports `buildSpawnArgs`, `generateBackupFileName`, `getFileExtension`, `isStdoutDump`, `getBackupDir`
- [x] `src/lib/backup-engine.ts` — exports `runBackup`, uses `spawn()`, `createHash('sha256')`, no `exec()`
- [x] `.env.example` — contains `BACKUP_BASE_DIR`

### TypeScript
- [x] `npx tsc --noEmit` — 0 errors in backup files (1 pre-existing error in `tabs.tsx` unrelated to this plan)

### Security Checks
- [x] `grep -c "exec(" src/lib/backup-engine.ts` returns 0 — no shell injection risk
- [x] PostgreSQL uses PGPASSWORD env var, not CLI arg
- [x] All spawn args are arrays, never string interpolation

## Self-Check: PASSED
