---
phase: 04
plan: 02
subsystem: dashboard
tags: [dashboard, metrics, prisma, server-component, redirect]
dependency_graph:
  requires: ["04-01"]
  provides: ["/dashboard page", "DashboardClient", "login-redirect-dashboard"]
  affects: ["src/auth.config.ts", "src/app/page.tsx", "src/components/layout/Sidebar.tsx"]
tech_stack:
  added: []
  patterns: ["Server Component + Client wrapper", "Promise.all Prisma queries", "date-fns/locale/ko relative time"]
key_files:
  created:
    - src/app/(app)/dashboard/page.tsx
    - src/components/dashboard/DashboardClient.tsx
  modified:
    - src/auth.config.ts
    - src/app/page.tsx
    - src/components/layout/Sidebar.tsx
decisions:
  - "Server Component fetches all 6 dashboard queries in Promise.all for single-round-trip data load"
  - "BigInt fileSizeBytes serialized to string before passing to client component to avoid Next.js serialization error"
  - "Sidebar updated with Dashboard + SQL Query nav items per UI-SPEC position contracts"
  - "Login redirect updated in both auth.config.ts (post-login page redirect) and app/page.tsx (root redirect)"
metrics:
  duration: "15 min"
  completed: "2026-03-31"
  tasks: 2
  files: 5
---

# Phase 4 Plan 02: Dashboard Page Summary

Dashboard page with 4 metric cards (connections, today success/failed, next schedule), connection-level backup status grid, and recent 10 history list via Promise.all Prisma queries in a Server Component.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Dashboard Server Component + Client wrapper | 9fc3f13 | src/app/(app)/dashboard/page.tsx, src/components/dashboard/DashboardClient.tsx, src/components/layout/Sidebar.tsx |
| 2 | Update login redirect to /dashboard | 543244a | src/auth.config.ts, src/app/page.tsx |

## What Was Built

### Dashboard Server Component (`src/app/(app)/dashboard/page.tsx`)

Runs 6 Prisma queries in `Promise.all`:
1. `prisma.dbConnection.count()` — total connections
2. `prisma.backupHistory.count({ status: "success", startedAt >= today })` — today success
3. `prisma.backupHistory.count({ status: "failed", startedAt >= today })` — today failed
4. `prisma.schedule.findMany({ isEnabled: true })` — enabled schedules for next-fire computation
5. `prisma.backupHistory.findMany({ take: 10 })` — recent history
6. `prisma.dbConnection.findMany({ backupHistories: { take: 1 } })` — connection statuses

Computes next schedule fire time from enabled schedules, serializes `BigInt` `fileSizeBytes` as string, passes all data to `DashboardClient`.

### DashboardClient (`src/components/dashboard/DashboardClient.tsx`)

4 metric cards:
- `전체 연결` — total connection count
- `오늘 성공` — today success count in `text-green-700`
- `실패 건수` — failure count with `border-l-4 border-red-600` + `text-red-600` when count > 0
- `다음 스케줄` — nearest upcoming schedule name + relative time, or `스케줄 없음`

2 bottom panels:
- Left: connection status grid with color dot, DB type, status badge, relative time; failed rows `bg-red-50`; clicking row navigates to `/connections?highlight={id}`
- Right: recent 10 history table with status badges, file size (KB/MB/GB), relative time

Uses `date-fns` with `ko` locale for Korean relative time formatting.

### Sidebar Updates (`src/components/layout/Sidebar.tsx`)

Added per UI-SPEC:
- Position 0 (prepend): `{ href: "/dashboard", label: "대시보드", icon: LayoutDashboard }`
- Position 2 (after 연결 관리): `{ href: "/query", label: "SQL 쿼리", icon: Terminal }`

### Login Redirect Updates

- `src/auth.config.ts` line 15: `/connections` → `/dashboard` (post-login redirect for logged-in users hitting `/login`)
- `src/app/page.tsx`: root redirect updated to `/dashboard`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data is live from Prisma queries.

## Self-Check: PASSED

- [x] `src/app/(app)/dashboard/page.tsx` exists and contains `await auth()` and `Promise.all`
- [x] `src/components/dashboard/DashboardClient.tsx` exists and contains `"use client"`, `전체 연결`, `실패 건수`, `bg-red-50`, `border-red-600`, `스케줄 없음`, `연결이 없습니다`
- [x] `src/auth.config.ts` contains `/dashboard`
- [x] `src/app/page.tsx` contains `/dashboard`
- [x] Commits 9fc3f13 and 543244a exist
