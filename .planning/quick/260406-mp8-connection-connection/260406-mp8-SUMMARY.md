---
phase: quick
plan: 260406-mp8
subsystem: connections, backup-engine, scheduler
tags: [connections, backup-storage, cloud-upload, schema, ui]
tech-stack:
  added: []
  patterns:
    - Connection-level backup storage configuration (local path or cloud)
    - Read-only schedule modal deriving storage config from connection
key-files:
  created: []
  modified:
    - prisma/schema.prisma
    - src/lib/validations/connection.ts
    - src/app/api/connections/route.ts
    - src/app/api/connections/[id]/route.ts
    - src/components/connections/ConnectionCard.tsx
    - src/components/connections/ConnectionModal.tsx
    - src/components/connections/ConnectionDetail.tsx
    - src/components/schedule/ScheduleModal.tsx
    - src/app/(app)/connections/ConnectionsPageClient.tsx
    - src/lib/backup-engine.ts
    - src/lib/scheduler.ts
decisions:
  - Store backupStorageType as String (not Prisma enum) for migration simplicity
  - Cloud upload in manual backups added inline in backup-engine.ts after dump success
  - Scheduler shouldCloudUpload combines schedule.cloudUpload OR conn.backupStorageType==='cloud'
  - ScheduleModal no longer stores or sends backupPath — derives display from connection props
metrics:
  duration: ~25min
  completed: 2026-04-06
  tasks: 3
  files: 11
---

# Quick Task 260406-mp8: Connection-Level Backup Storage Configuration

**One-liner:** Added per-connection backup storage type (local path or cloud) with UI selection in ConnectionModal, read-only display in ScheduleModal, and backup-engine/scheduler using connection settings as the authoritative source.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | DB schema + validation + API fields | 459595f | Done |
| 2 | Connection modal/card/detail UI + ScheduleModal read-only | 6183b07 | Done |
| 3 | Backup execution uses connection storage settings | 2ce5e5d | Done |

## What Was Built

### Task 1 — Schema + API
- `DbConnection` Prisma model: added `backupStorageType String @default("local")` and `backupLocalPath String?`
- `prisma/schema.prisma` also received `toolPath String?` (was already staged from prior work)
- Prisma client regenerated with placeholder DATABASE_URL (actual migration must be run with real DB)
- `connection.ts` validation: `backupStorageType` and `backupLocalPath` added to `baseFields`
- GET `/api/connections` select: includes both new fields
- POST `/api/connections` create: writes both new fields with defaults
- GET/PUT `/api/connections/[id]`: `CONNECTION_SELECT` and `updateData` include both fields

### Task 2 — UI
- `Connection` type in `ConnectionCard.tsx`: `backupStorageType: string` and `backupLocalPath: string | null`
- `ConnectionModal.tsx`: new Section 3 "백업 저장 설정" with local/cloud radio buttons; local selection shows optional path input; cloud shows informational text
- `ConnectionDetail.tsx`: info tab shows "백업 저장" field (로컬/클라우드) and "백업 경로" field for local type
- `ScheduleModal.tsx`: Section 2 changed from editable `Input` to read-only display; `backupPath` removed from save payload; new props `backupStorageType` and `backupLocalPath`
- `ConnectionsPageClient.tsx`: passes `scheduleTarget.backupStorageType` and `scheduleTarget.backupLocalPath` to ScheduleModal

### Task 3 — Backup Execution
- `backup-engine.ts`: `resolvedBackupDir` now follows priority: caller `backupDir` > `conn.backupLocalPath` (local type) > `getBackupDir()` default; cloud-type connections trigger S3 upload after successful manual backup via dynamic import of `uploadToS3`
- `scheduler.ts`: `backupDir` derived from `conn.backupLocalPath` when `backupStorageType === "local"` and path set; `shouldCloudUpload = schedule.cloudUpload || conn.backupStorageType === "cloud"` extends cloud upload to connection-level cloud type

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Prisma generate required before TypeScript check**
- **Found during:** Task 1
- **Issue:** No `.env` file in worktree, so `npx prisma migrate dev` failed with `DATABASE_URL` not resolved
- **Fix:** Used `DATABASE_URL=placeholder npx prisma generate` to regenerate client types so `tsc --noEmit` could validate the new fields
- **Files modified:** `node_modules/@prisma/client` (generated, not committed)
- **Note:** Actual migration `npx prisma migrate dev --name add-backup-storage-to-connection` must be run in the dev environment with a live PostgreSQL DATABASE_URL

**2. [Rule 1 - Bug] modalSchema backupStorageType type conflict with react-hook-form**
- **Found during:** Task 2
- **Issue:** Using `.default("local")` on `z.enum(["local","cloud"])` caused TypeScript error — inferred type allowed `undefined` which conflicted with `Resolver` type
- **Fix:** Changed to plain `z.enum(["local","cloud"])` without `.default()` and used explicit `"local" as "local" | "cloud"` in `defaultValues`

## Known Stubs

None — all fields are wired end-to-end from schema through API to UI.

## Migration Note

The following migration must be run in the development environment before deploying:
```bash
npx prisma migrate dev --name add-backup-storage-to-connection
```
This adds `backupStorageType` and `backupLocalPath` columns to the `DbConnection` table.

## Self-Check: PASSED

- [x] `prisma/schema.prisma` modified with new fields
- [x] `src/lib/validations/connection.ts` updated
- [x] `src/app/api/connections/route.ts` updated
- [x] `src/app/api/connections/[id]/route.ts` updated
- [x] `src/components/connections/ConnectionCard.tsx` Connection type updated
- [x] `src/components/connections/ConnectionModal.tsx` new backup storage section
- [x] `src/components/connections/ConnectionDetail.tsx` new fields displayed
- [x] `src/components/schedule/ScheduleModal.tsx` read-only backup storage display
- [x] `src/app/(app)/connections/ConnectionsPageClient.tsx` props passed to ScheduleModal
- [x] `src/lib/backup-engine.ts` resolvedBackupDir + cloud upload
- [x] `src/lib/scheduler.ts` connection-priority backupDir + shouldCloudUpload
- [x] Commits: 459595f, 6183b07, 2ce5e5d — all exist
- [x] `npx tsc --noEmit` — no errors
