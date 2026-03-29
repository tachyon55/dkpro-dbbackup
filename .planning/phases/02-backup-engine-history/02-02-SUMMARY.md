---
phase: 02-backup-engine-history
plan: "02"
subsystem: api, ui
tags: [sse, server-sent-events, backup, react, shadcn, progress, nextjs, rbac]

# Dependency graph
requires:
  - phase: 02-01
    provides: runBackup() engine, backup-store concurrency locks, BackupHistory Prisma model

provides:
  - POST /api/backups — creates BackupHistory record, returns jobId, enforces viewer RBAC + concurrency 409
  - GET /api/backups/[jobId]/stream — SSE route driving runBackup() with force-dynamic
  - BackupConfirmDialog — AlertDialog for backup confirmation before trigger
  - BackupProgressModal — Dialog with SSE EventSource, Progress bar, dark log area, result/error summary
  - ConnectionCard — updated with backup button (Play/Loader2), viewer-hidden, isBackingUp prop
  - ConnectionsPageClient — full backup flow state machine (confirm → POST → SSE → modal close)

affects: [03-scheduler, 04-history-ui, dashboard]

# Tech tracking
tech-stack:
  added: [shadcn/ui Progress component]
  patterns:
    - SSE route with ReadableStream + TextEncoder, force-dynamic, X-Accel-Buffering
    - Backup flow: POST creates record + lock, then GET SSE drives execution
    - Client disconnect closes stream only — never kills backup process
    - RBAC at API layer (viewer 403) AND UI layer (button hidden)
    - backingUpConnections Set tracks per-connection in-progress state in React
    - Modal close blocked while status is started|running via onOpenChange guard

key-files:
  created:
    - src/app/api/backups/route.ts
    - src/app/api/backups/[jobId]/stream/route.ts
    - src/components/backup/BackupConfirmDialog.tsx
    - src/components/backup/BackupProgressModal.tsx
    - src/components/ui/progress.tsx
  modified:
    - src/components/connections/ConnectionCard.tsx
    - src/app/(app)/connections/ConnectionsPageClient.tsx
    - src/app/(app)/connections/page.tsx

key-decisions:
  - "Backup execution is split: POST creates record + lock, SSE GET drives runBackup() — decoupled for clean separation"
  - "Client disconnect closes SSE stream only, not the backup process — ensures backup completes even if browser navigates away"
  - "Progress component installed via shadcn CLI (not pre-existing) — added to repo"
  - "userRole passed from server component (page.tsx) to ConnectionsPageClient to avoid extra fetch"

patterns-established:
  - "SSE routes: export const dynamic = 'force-dynamic', ReadableStream + TextEncoder, X-Accel-Buffering: no"
  - "Backup button: viewer role hidden entirely, isBackingUp shows Loader2 spinner with cursor-not-allowed"
  - "Modal close guard: onOpenChange only passes through when status is complete | failed | idle"

requirements-completed: [BKUP-01, BKUP-03, BKUP-05]

# Metrics
duration: 11min
completed: 2026-03-29
---

# Phase 02 Plan 02: Backup Trigger API + SSE Stream + UI Flow Summary

**POST /api/backups + SSE stream route + full backup execution UI (confirm dialog, real-time progress modal with log stream, connection card backup button with RBAC)**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-29T08:18:49Z
- **Completed:** 2026-03-29T08:29:49Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- POST /api/backups creates BackupHistory record, acquires concurrency lock, returns jobId; blocks viewers (403) and concurrent jobs (409)
- GET /api/backups/[jobId]/stream opens SSE connection with ReadableStream, drives runBackup(), streams started/log/progress/complete/error events
- Full backup execution UI: connection card backup button → BackupConfirmDialog → POST → BackupProgressModal with live EventSource log stream, Progress bar, and result/error summary
- Viewer role hides backup button on ConnectionCard; modal close blocked during active backup

## Task Commits

1. **Task 1: POST /api/backups + GET SSE stream** - `e743551` (feat)
2. **Task 2: Backup UI components + ConnectionCard + ConnectionsPageClient** - `5ff8bf2` (feat)

## Files Created/Modified

- `src/app/api/backups/route.ts` — POST trigger: auth, viewer guard, concurrency 409, BackupHistory.create, lockBackup
- `src/app/api/backups/[jobId]/stream/route.ts` — GET SSE: force-dynamic, ReadableStream, runBackup(), SSE headers
- `src/components/backup/BackupConfirmDialog.tsx` — AlertDialog with connection name + DB type badge, cancel/confirm
- `src/components/backup/BackupProgressModal.tsx` — Dialog with EventSource SSE, Progress bar, dark mono log area, result/error summary, close guard
- `src/components/ui/progress.tsx` — shadcn Progress component (newly installed)
- `src/components/connections/ConnectionCard.tsx` — added onBackup, isBackingUp, userRole props; backup button with Play/Loader2
- `src/app/(app)/connections/ConnectionsPageClient.tsx` — full backup flow state: confirmConnection, backupJobId, progressConnection, backingUpConnections Set
- `src/app/(app)/connections/page.tsx` — extracts userRole from session, passes to ConnectionsPageClient

## Decisions Made

- Split POST (create+lock) from GET SSE (execute) — cleaner separation; POST is instant, SSE drives actual work
- Client disconnect closes stream only, not the backup process — backup runs to completion server-side
- userRole sourced from server component (page.tsx) to avoid an additional /api/session fetch in the client

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing shadcn Progress component**
- **Found during:** Task 2 (BackupProgressModal creation)
- **Issue:** `src/components/ui/progress.tsx` did not exist; plan said "install if missing"
- **Fix:** Ran `npx shadcn add progress --yes`
- **Files modified:** src/components/ui/progress.tsx (created)
- **Verification:** TypeScript compile passes
- **Committed in:** 5ff8bf2 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Passed userRole via server component prop**
- **Found during:** Task 2 (ConnectionsPageClient integration)
- **Issue:** ConnectionsPageClient had no access to session/role; plan required passing `userRole` from session to ConnectionCard
- **Fix:** Updated page.tsx to extract role from session and pass as prop to ConnectionsPageClient; added `userRole` prop to ConnectionsPageClient
- **Files modified:** src/app/(app)/connections/page.tsx, ConnectionsPageClient.tsx
- **Verification:** TypeScript compile passes; viewer prop flows to ConnectionCard
- **Committed in:** 5ff8bf2 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking — missing component, 1 missing critical — role prop wiring)
**Impact on plan:** Both necessary for plan to work correctly. No scope creep.

## Issues Encountered

None — TypeScript compile clean (only pre-existing `@radix-ui/react-tabs` error in tabs.tsx unrelated to this plan).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Full backup execution flow is live end-to-end: connection card → confirm → SSE stream → progress modal
- BackupHistory records are created and updated by runBackup() — ready for history UI in Phase 03
- SSE pattern established for reuse in scheduler live-progress if needed

---
*Phase: 02-backup-engine-history*
*Completed: 2026-03-29*
