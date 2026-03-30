---
phase: 03-automation-notifications
plan: "02"
subsystem: scheduling-ui
tags: [api, ui, schedule, cron, connection-card]
dependency_graph:
  requires: ["03-01"]
  provides: ["schedule-crud-api", "schedule-modal", "connection-card-schedule-row"]
  affects: ["03-03"]
tech_stack:
  added: []
  patterns:
    - "Schedule CRUD endpoints follow same auth+Zod+audit pattern as connections"
    - "Optimistic toggle update with error revert for schedule switch"
    - "Separate fetchSchedules() builds connectionId->ScheduleData map — avoids modifying connections API"
key_files:
  created:
    - src/app/api/schedules/route.ts
    - src/app/api/schedules/[id]/route.ts
    - src/components/schedule/ScheduleModal.tsx
  modified:
    - src/app/api/connections/[id]/route.ts
    - src/components/connections/ConnectionCard.tsx
    - src/app/(app)/connections/ConnectionsPageClient.tsx
decisions:
  - "schedules fetched separately (not via connections include) to avoid touching the connections API contract"
  - "stopSchedule called before prisma.schedule.delete per Pitfall 5 from plan context"
  - "Optimistic toggle update on ConnectionCard Switch — revert on PATCH failure"
metrics:
  duration_seconds: 241
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_changed: 6
---

# Phase 03 Plan 02: Schedule CRUD API + Schedule UI Summary

Schedule CRUD API (GET/POST/PUT/DELETE/PATCH) with cron sync, ScheduleModal dialog for per-connection configuration, and ConnectionCard schedule row with optimistic toggle switch and next-run display.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Schedule CRUD API + connection delete wiring | cef710b | src/app/api/schedules/route.ts, src/app/api/schedules/[id]/route.ts, src/app/api/connections/[id]/route.ts |
| 2 | ConnectionCard schedule row + ScheduleModal + page client wiring | d6351c3 | src/components/schedule/ScheduleModal.tsx, src/components/connections/ConnectionCard.tsx, src/app/(app)/connections/ConnectionsPageClient.tsx |

## What Was Built

### Schedule CRUD API

`src/app/api/schedules/route.ts`:
- GET: list all schedules with connection name/type
- POST: create schedule with Zod validation (minute restricted to 0/15/30/45), 409 on duplicate, 404 if connection missing, `startSchedule()` if isEnabled true

`src/app/api/schedules/[id]/route.ts`:
- GET: single schedule with connection info
- PUT: full update — syncs cron task (start or stop based on isEnabled)
- DELETE: `stopSchedule()` BEFORE `prisma.schedule.delete()` (Pitfall 5 prevention)
- PATCH: toggle-only handler, validates `{ isEnabled: boolean }`, optimistic-friendly

`src/app/api/connections/[id]/route.ts` (modified):
- Added `stopSchedule(id)` call in DELETE handler before `prisma.dbConnection.delete()` — prevents orphaned cron tasks when a connection is removed

All endpoints: auth check (401), viewer 403, Zod validation, audit log (SCHEDULE_CREATE / SCHEDULE_UPDATE / SCHEDULE_DELETE).

### ScheduleModal

`src/components/schedule/ScheduleModal.tsx`:
- Dialog `max-w-md` with title "스케줄 설정 — {connectionName}"
- Hour select (aria-label="시 선택"), minute select restricted to [0, 15, 30, 45] (aria-label="분 선택")
- Backup path input (empty = default), retention days input with "일" suffix
- Catch-up on restart switch (aria-label="서버 재시작 시 놓친 백업 자동 실행")
- Notifications switch (aria-label="이 연결 알림 활성화") with link to /settings
- Footer: left = "스케줄 삭제" ghost button (edit mode only), right = "취소" + "스케줄 저장"
- AlertDialog delete confirmation: "스케줄을 삭제하면 자동 백업이 중단됩니다"
- Save: POST create with `isEnabled: true`, PUT edit with current isEnabled preserved

### ConnectionCard

`src/components/connections/ConnectionCard.tsx`:
- Card height: `h-[160px]` → `h-[200px]`
- `Connection` type extended with optional `schedule` field
- New props: `onScheduleToggle` and `onScheduleClick`
- Schedule row below backup button, separated by `border-t`
- When schedule exists: Switch toggle (aria-label="스케줄 활성화/비활성화"), 활성/비활성 badge, next run time
- When no schedule: "스케줄 미설정" + "설정하기" link for non-viewers
- `getNextRunDisplay(hour, minute)` helper: shows "HH:MM 오늘" or "HH:MM 내일"

### ConnectionsPageClient

`src/app/(app)/connections/ConnectionsPageClient.tsx`:
- `fetchSchedules()` fetches `/api/schedules` and builds `Record<connectionId, ScheduleData>`
- Both `fetchConnections()` and `fetchSchedules()` called in initial `useEffect`
- `handleScheduleToggle()`: optimistic update with error revert + toast on failure
- `handleScheduleClick()`: opens ScheduleModal with correct connection context
- `handleScheduleSaved()`: calls `fetchSchedules()` to refresh
- `handleDeleteConfirm()`: now also calls `fetchSchedules()` after connection deletion
- `ScheduleModal` rendered at bottom of component tree
- Skeleton height updated from `h-[160px]` to `h-[200px]`
- Schedule merged into each connection object: `{ ...conn, schedule: schedules[conn.id] ?? null }`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All data is wired: schedules fetched from `/api/schedules`, merged into ConnectionCard, toggles call real PATCH endpoint, modal POSTs/PUTs to real API.

## Self-Check: PASSED

- src/app/api/schedules/route.ts: FOUND
- src/app/api/schedules/[id]/route.ts: FOUND
- src/components/schedule/ScheduleModal.tsx: FOUND
- commit cef710b: FOUND
- commit d6351c3: FOUND
