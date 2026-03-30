---
phase: 03-automation-notifications
plan: 01
subsystem: infra
tags: [node-cron, scheduler, prisma, cron, nodemailer, slack, retention, cleanup, instrumentation]

requires:
  - phase: 02-backup-engine-history
    provides: runBackup(), BackupHistory model, backup-store locks, backup-tools

provides:
  - Schedule Prisma model (1:1 with DbConnection, retentionDays, catchUpOnRestart)
  - NotificationSettings Prisma model (global singleton, SMTP + Slack)
  - node-cron scheduler registry with globalThis singleton (survives hot reload)
  - startSchedule/stopSchedule/loadAllSchedules/runScheduledBackup exports
  - Retention cleanup with safety guard (always preserves most recent success)
  - instrumentation.ts server bootstrap (orphan recovery + schedule loading)
  - 6 new AuditEventType values for schedule and notification events

affects:
  - 03-02 (Schedule CRUD API — imports startSchedule, stopSchedule, loadAllSchedules)
  - 03-03 (Notification service — imports runRetentionCleanup, NotificationSettings model)

tech-stack:
  added:
    - node-cron 4.2.1 (cron task scheduling with timezone support)
    - nodemailer 8.0.4 (SMTP email notifications — used in plan 03-03)
    - "@slack/web-api 7.15.0" (Slack notifications — used in plan 03-03)
    - "@types/node-cron 3.0.11" (dev — @types for node-cron v3 API; actual types from node-cron v4 package itself)
  patterns:
    - globalThis singleton pattern for cron registry (same as backup-store inProgressSet)
    - Dynamic imports in runScheduledBackup to avoid circular dependencies
    - lastRunAt updated BEFORE runBackup call to prevent duplicate catch-ups (D-Pitfall-6)
    - Safety guard on retention cleanup — always preserves most recent successful backup
    - Next.js instrumentation.ts for server-side bootstrap (register() with NEXT_RUNTIME guard)

key-files:
  created:
    - src/lib/scheduler.ts (cron registry, startSchedule, stopSchedule, loadAllSchedules, runScheduledBackup)
    - src/lib/cleanup.ts (runRetentionCleanup with D-07 safety guard)
    - src/instrumentation.ts (Next.js server bootstrap hook)
    - prisma/migrations/20260330000000_add_schedule_notification_settings/migration.sql
  modified:
    - prisma/schema.prisma (Schedule + NotificationSettings models, 6 new AuditEventType values, schedule relation on DbConnection)
    - package.json (node-cron, nodemailer, @slack/web-api, @types/node-cron added)

key-decisions:
  - "node-cron v4 TaskOptions has no 'scheduled' property — tasks start automatically; removed that option"
  - "@types/node-cron (v3 types) conflicts with node-cron v4 runtime API; using node-cron v4 built-in .d.ts via named import"
  - "Dynamic imports in runScheduledBackup avoid circular dependency: scheduler -> backup-engine -> backup-store -> scheduler"
  - "Migration created manually (consistent with Phase 2 decision — DB not running locally)"

patterns-established:
  - "Scheduler registry: globalThis._cronRegistry Map<string, ScheduledTask> — same singleton pattern as backup-store"
  - "runScheduledBackup: lockBackup before runBackup, cleanup in finally — cleanup always runs"
  - "Catch-up detection: getMostRecentFireTime() compared against lastRunAt, update lastRunAt first"

requirements-completed: [SCHD-01, SCHD-02, SCHD-04, SCHD-05, SCHD-06]

duration: 5min
completed: 2026-03-30
---

# Phase 3 Plan 01: Scheduler Engine + Schema Extension Summary

**node-cron v4 scheduler with per-connection cron registry, retention cleanup with safety guard, and Next.js instrumentation bootstrap wired to existing runBackup()**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-30T08:57:38Z
- **Completed:** 2026-03-30T09:02:40Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Extended Prisma schema with `Schedule` (1:1 with DbConnection) and `NotificationSettings` (global singleton) models plus 6 new `AuditEventType` enum values
- Installed node-cron, nodemailer, @slack/web-api; regenerated Prisma client with new types
- Built scheduler engine: globalThis-safe cron registry, `startSchedule`/`stopSchedule`/`loadAllSchedules`/`runScheduledBackup` with Asia/Seoul timezone, catch-up detection on restart (D-08), and optimistic `lastRunAt` update before backup (D-Pitfall-6)
- Built `runRetentionCleanup` with D-07 safety guard that always preserves the most recent successful backup even if it falls outside the retention window
- Wired `src/instrumentation.ts` server bootstrap: recovers orphaned backups then loads all active schedules on every server start

## Task Commits

1. **Task 1: Install dependencies + Prisma schema extension + migration** - `6721564` (feat)
2. **Task 2: Scheduler engine + cleanup + instrumentation bootstrap** - `e04a63b` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `prisma/schema.prisma` - Added Schedule, NotificationSettings models; 6 new AuditEventType values; schedule relation on DbConnection
- `prisma/migrations/20260330000000_add_schedule_notification_settings/migration.sql` - Migration SQL for apply-on-deploy
- `package.json` / `package-lock.json` - node-cron 4.x, nodemailer 8.x, @slack/web-api 7.x, @types/node-cron
- `src/lib/scheduler.ts` - Cron task registry and scheduler engine
- `src/lib/cleanup.ts` - Retention-based backup file and record deletion
- `src/instrumentation.ts` - Next.js server bootstrap hook

## Decisions Made

- **node-cron v4 API change:** `TaskOptions` in v4 has no `scheduled` property (tasks start immediately on creation); removed that option. Tasks are started automatically when `cronSchedule()` is called.
- **Import style:** `@types/node-cron` package provides v3 type declarations that conflict with v4 runtime; used named import `{ schedule as cronSchedule }` from node-cron directly (v4 ships its own `.d.ts`).
- **Dynamic imports in runScheduledBackup:** Avoid circular dependency cycle `scheduler -> backup-engine -> backup-store -> scheduler` by using `await import()` inside the function body.
- **Migration created manually:** Consistent with Phase 2 decision — DB not running locally; migration applied on deploy.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] node-cron v4 TaskOptions does not have `scheduled` property**
- **Found during:** Task 2 (scheduler.ts TypeScript compilation)
- **Issue:** Plan spec used `{ scheduled: true, timezone: "Asia/Seoul" }` — correct for node-cron v3 but node-cron v4 changed the API; `scheduled` no longer exists in `TaskOptions`
- **Fix:** Removed `scheduled: true` from options object; node-cron v4 tasks start automatically on creation, so the behavior is equivalent
- **Files modified:** src/lib/scheduler.ts
- **Verification:** `npx tsc --noEmit` passes with only pre-existing `tabs.tsx` error
- **Committed in:** e04a63b (Task 2 commit)

**2. [Rule 1 - Bug] `@types/node-cron` ScheduledTask type conflicts with node-cron v4 built-in types**
- **Found during:** Task 2 (scheduler.ts TypeScript compilation)
- **Issue:** `import cron from "node-cron"` default import + `cron.ScheduledTask` caused TS2503 (namespace not found); `@types/node-cron` is for v3 while installed package is v4
- **Fix:** Switched to named imports `{ schedule as cronSchedule }` and `type { ScheduledTask }` from node-cron package directly (v4 ships `.d.ts` in dist/cjs/)
- **Files modified:** src/lib/scheduler.ts
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** e04a63b (Task 2 commit)

**3. [Rule 1 - Bug] cleanup.ts type extraction `Parameters<typeof prisma.backupHistory.findMany>[0]["where"]` fails**
- **Found during:** Task 2 (cleanup.ts TypeScript compilation)
- **Issue:** Prisma v7 `findMany` first argument type is an object with optional `where` key — extracting `["where"]` yields a union type that TypeScript cannot index as assignment target
- **Fix:** Used `Prisma.BackupHistoryWhereInput` named type import instead
- **Files modified:** src/lib/cleanup.ts
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** e04a63b (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3x Rule 1 — API version mismatch bugs)
**Impact on plan:** All three fixes necessary for TypeScript compilation. node-cron v4 (latest) was installed but plan spec assumed v3 API. Behavior is functionally identical.

## Issues Encountered

- `npm install` initially failed with peer deps conflict (next-auth beta version); resolved with `--legacy-peer-deps` flag (existing project-wide constraint)
- Pre-existing `tabs.tsx` error (missing `@radix-ui/react-tabs` package) present before this plan — logged to deferred items, out of scope

## Known Stubs

None — this plan is backend-only infrastructure. No UI components, no hardcoded empty values flowing to rendering.

## Next Phase Readiness

- Plan 03-02 (Schedule CRUD API) can now import `startSchedule`, `stopSchedule`, `loadAllSchedules` from `@/lib/scheduler`
- Plan 03-03 (Notification service) can now import `runRetentionCleanup` from `@/lib/cleanup` and use the `NotificationSettings` Prisma model
- Migration SQL ready to apply on deploy alongside Phase 2 migration
- `@types/node-cron` dev dependency is technically for v3 — future cleanup opportunity but does not affect runtime

---
*Phase: 03-automation-notifications*
*Completed: 2026-03-30*
