---
phase: 02-backup-engine-history
plan: "03"
subsystem: backup-history-read-path
tags: [api, ui, history, pagination, download, sha256]
dependency_graph:
  requires: ["02-01", "02-02"]
  provides: ["HIST-01", "HIST-02", "HIST-03"]
  affects: ["sidebar-nav", "backup-history-table", "backup-detail-panel"]
tech_stack:
  added: []
  patterns:
    - "Cursor-based pagination with take+1 pattern for hasMore detection"
    - "BigInt serialization: fileSizeBytes.toString() for JSON compatibility"
    - "Readable.toWeb() to bridge Node.js streams to Web ReadableStream for file download"
    - "useCallback + useEffect filter dependency pattern for re-fetching on filter change"
    - "prevCursors stack for bidirectional cursor pagination navigation"
key_files:
  created:
    - src/app/api/backups/[jobId]/route.ts
    - src/app/api/backups/[jobId]/download/route.ts
    - src/app/(app)/history/page.tsx
    - src/app/(app)/history/HistoryPageClient.tsx
    - src/components/backup/BackupDetailPanel.tsx
  modified:
    - src/app/api/backups/route.ts
    - src/components/layout/Sidebar.tsx
decisions:
  - "GET list excludes fullLog/sha256/filePath for performance; detail endpoint returns all fields"
  - "Cursor pagination preferred over offset for large datasets — consistent with index-optimized queries"
  - "BackupDetailPanel fetches on jobId change with cancellation flag to prevent stale updates"
  - "Download route uses Readable.toWeb() for Node.js→Web stream bridge without buffering entire file"
  - "fileExists computed server-side via existsSync to give accurate disabled-button state in UI"
metrics:
  duration_min: 2
  completed_date: "2026-03-29"
  tasks_completed: 2
  files_created: 5
  files_modified: 2
requirements_closed: [HIST-01, HIST-02, HIST-03]
---

# Phase 02 Plan 03: Backup History Read-Path Summary

**One-liner:** Cursor-paginated history API (list/detail/download) with full-featured table UI, right-side detail Sheet with SHA-256 copy and file download.

## What Was Built

Plans 02-01 and 02-02 wrote BackupHistory records but provided no way to view them. This plan closes the HIST-01/02/03 gaps:

1. **GET /api/backups** — Paginated history list with `connectionId`, `status`, `startDate`, `endDate` filters. Cursor-based pagination with `nextCursor` / `hasMore`. BigInt `fileSizeBytes` serialized to string. Excludes `fullLog` for performance.

2. **GET /api/backups/[jobId]** — Full detail record including `fullLog`, `sha256`, `errorMessage`, `filePath`, plus computed `fileExists` boolean (via `existsSync`).

3. **GET /api/backups/[jobId]/download** — Streams backup file to browser using `Readable.toWeb()`. Sets `Content-Disposition: attachment` with `encodeURIComponent(fileName)` for Korean filenames. Guards: status must be `success`, file must exist on disk.

4. **Sidebar.tsx** — Added `{ href: "/history", label: "백업 히스토리", icon: History }` nav item (no `adminOnly` — all roles can view history).

5. **HistoryPageClient.tsx** — Client component with:
   - Fetch history via `/api/backups` with filter params
   - Fetch connections via `/api/connections` for filter dropdown
   - `useCallback` + `useEffect` pattern resets cursor stack on filter change
   - `prevCursors` stack for bidirectional "이전"/"다음" navigation
   - Table with 7 columns, skeleton loading rows, empty state with Korean copy

6. **BackupDetailPanel.tsx** — Right-side Sheet (w-[480px]) with:
   - File info section (name, size, duration)
   - SHA-256 section with clipboard copy (복사 → 복사됨 → 복사 feedback)
   - Download button (disabled "파일을 찾을 수 없음" when fileExists=false)
   - Error message box for failed backups
   - Dark log viewer (`bg-neutral-950`) with `max-h-[320px]` scroll

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows from real API endpoints.

## Self-Check

Files created/modified:
- [x] src/app/api/backups/route.ts — GET handler added
- [x] src/app/api/backups/[jobId]/route.ts — created
- [x] src/app/api/backups/[jobId]/download/route.ts — created
- [x] src/app/(app)/history/page.tsx — created
- [x] src/app/(app)/history/HistoryPageClient.tsx — created
- [x] src/components/backup/BackupDetailPanel.tsx — created
- [x] src/components/layout/Sidebar.tsx — History nav item added

Commits:
- 884a9bc: feat(02-03): history API endpoints
- 8f8bb00: feat(02-03): history UI

TypeScript: 0 new errors (pre-existing tabs.tsx error unrelated to this plan).

## Self-Check: PASSED
