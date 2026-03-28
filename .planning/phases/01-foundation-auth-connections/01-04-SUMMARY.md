---
phase: 01-foundation-auth-connections
plan: 01-04
title: Connections Management UI
subsystem: frontend/connections
tags: [ui, connections, react, shadcn]
dependency_graph:
  requires:
    - 01-03  # Connection API routes (CRUD + test + listDatabases)
  provides:
    - connections-ui  # Full /connections page with card grid, create/edit/delete/test
  affects:
    - app-navigation  # /connections is the default landing page after login
tech_stack:
  added:
    - shadcn/ui sheet
    - shadcn/ui tabs
    - shadcn/ui skeleton
    - shadcn/ui dropdown-menu
  patterns:
    - Server page.tsx auth check + client component delegation
    - react-hook-form + zodResolver for form validation
    - Lazy fetch on tab activation (databases tab)
    - Inline test result display
key_files:
  created:
    - src/components/connections/ColorPicker.tsx
    - src/components/connections/ConnectionCard.tsx
    - src/components/connections/ConnectionModal.tsx
    - src/components/connections/ConnectionDetail.tsx
    - src/app/(app)/connections/ConnectionsPageClient.tsx
  modified:
    - src/app/(app)/connections/page.tsx
    - src/components/ui/sheet.tsx (installed)
    - src/components/ui/tabs.tsx (installed)
    - src/components/ui/skeleton.tsx (installed)
    - src/components/ui/dropdown-menu.tsx (installed)
decisions:
  - ColorPicker uses inline box-shadow for selected ring state (no Tailwind ring-offset-color needed)
  - ConnectionModal uses a single unified form (not split create/edit) with conditional password logic
  - ConnectionDetail resets databases state on connection change to avoid stale data across connections
  - Delete handler also closes the detail sheet if the deleted connection was open in it
metrics:
  duration_seconds: 184
  completed_date: "2026-03-29"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 1
  files_installed: 4
---

# Phase 01 Plan 04: Connections Management UI Summary

## One-liner

Full /connections page with card grid, create/edit/delete modal, inline connection test, color picker, and detail sheet with lazy-loaded databases tab — wiring the existing API layer to a complete browser UI.

## What Was Built

### Task 1 — ColorPicker, ConnectionCard, ConnectionModal

**ColorPicker** (`src/components/connections/ColorPicker.tsx`): 10 preset color circles (16px) per D-13/CONN-08. Selected state shown via `box-shadow` ring (white inner + color outer). Props: `value`, `onChange`.

**ConnectionCard** (`src/components/connections/ConnectionCard.tsx`): 140px card with 4px left color border via inline style. DB type badge, name (semibold), host:port or filePath. DropdownMenu (MoreVertical) for edit/delete — click propagation stopped so card body click opens detail. Exports the `Connection` type used across all connection components.

**ConnectionModal** (`src/components/connections/ConnectionModal.tsx`): Three-section dialog (기본 정보, 접속 정보, 연결 테스트). Dynamic fields per DB type:
- SQLite: filePath only
- Oracle: host + port + SID/서비스명 Select toggle + username + password
- Others: host + port + database + username + password

Test section appears in edit mode only, POSTs to `/api/connections/[id]/test`, shows inline success (green CheckCircle) or failure (red XCircle) with response time. Test result clears on field change. Password field in edit mode has "변경하려면 입력" placeholder and is omitted from payload if empty.

Also installed shadcn/ui: `sheet`, `tabs`, `skeleton`, `dropdown-menu`.

### Task 2 — ConnectionDetail, ConnectionsPageClient, page.tsx

**ConnectionDetail** (`src/components/connections/ConnectionDetail.tsx`): Right Sheet (480px). Two tabs — 정보 (definition-list of all fields, adapts for SQLite/Oracle/standard) with "수정" button at bottom; 데이터베이스 (lazy fetch on tab activation from `/api/connections/[id]/databases`, loading skeletons, error state, list render).

**ConnectionsPageClient** (`src/app/(app)/connections/ConnectionsPageClient.tsx`): Follows UsersPageClient pattern exactly. Manages: connections[], loading, modalOpen/Mode/selectedConnection, deleteTarget/deleteDialogOpen/deleteLoading, detailConnection/detailOpen. Renders: grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`), 4 skeleton cards while loading, centered empty state with "연결 추가" CTA when empty, ConnectionModal, ConnectionDetail, AlertDialog for delete.

**connections/page.tsx**: Replaced static stub with `auth()` check + `<ConnectionsPageClient />` (no admin check — connections accessible to all authenticated roles per D-24).

## Verification Results

- `npx tsc --noEmit` — passes with 0 errors
- `grep -c "ConnectionsPageClient" src/app/(app)/connections/page.tsx` — 2
- `grep -c "fetch.*api/connections" ...ConnectionsPageClient.tsx` — 2
- `grep -c "ConnectionCard" ...ConnectionsPageClient.tsx` — 2
- `grep -c "ConnectionModal" ...ConnectionsPageClient.tsx` — 2
- `grep -c "AlertDialog" ...ConnectionsPageClient.tsx` — 22
- Static stub text "여기에 표시됩니다" — 0 (removed)
- ColorPicker preset colors count — 10

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all components fetch from real API endpoints. No hardcoded/mock data.

## Self-Check: PASSED
