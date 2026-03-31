---
phase: 04-dashboard-query-executor-cloud-storage
plan: "01"
subsystem: foundation
tags: [prisma, schema, migration, npm, sidebar, tooltip, s3, monaco]
dependency_graph:
  requires: [03-automation-notifications]
  provides: [SavedQuery model, CloudStorageSettings model, Schedule.cloudUpload, BackupHistory.cloudUploadStatus, tooltip component, monaco editor dep, aws sdk dep]
  affects: [04-02-PLAN.md, all phase-4 plans]
tech_stack:
  added: ["@monaco-editor/react", "@aws-sdk/client-s3", "@aws-sdk/lib-storage", "@radix-ui/react-tooltip"]
  patterns: [prisma schema extension, manual migration SQL, shadcn component pattern]
key_files:
  created:
    - prisma/migrations/20260331000000_phase4_models/migration.sql
    - src/components/ui/tooltip.tsx
  modified:
    - prisma/schema.prisma
    - package.json
    - package-lock.json
    - src/components/layout/Sidebar.tsx
decisions:
  - "shadcn CLI uses npm internally without --legacy-peer-deps flag — installed @radix-ui/react-tooltip manually and wrote tooltip.tsx from standard shadcn pattern to avoid peer dep conflict"
  - "Migration file uses standard PostgreSQL PRIMARY KEY constraint syntax (not inline PRIMARY KEY) to match Prisma migration conventions"
metrics:
  duration: "~10 min"
  completed: "2026-03-31T03:28:33Z"
  tasks: 2
  files: 6
---

# Phase 04 Plan 01: Foundation — Schema + Packages + Sidebar Summary

**One-liner:** Prisma schema extended with SavedQuery and CloudStorageSettings models, AWS SDK and Monaco Editor packages installed, and sidebar navigation updated with dashboard and query executor links.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Prisma schema migration + npm packages + shadcn tooltip | 0b48447 | prisma/schema.prisma, migration.sql, package.json, tooltip.tsx |
| 2 | Update Sidebar navigation with Dashboard and SQL Query links | f91a833 | src/components/layout/Sidebar.tsx |

## What Was Built

### Prisma Schema Changes

Added two new models:

- **SavedQuery** — stores per-user saved SQL queries with optional `connectionId` link, indexed on `userId`
- **CloudStorageSettings** — singleton-style S3/S3-compatible config with AES-256-GCM encrypted `secretAccessKey`

Added fields to existing models:

- `Schedule.cloudUpload` — Boolean flag (default `false`) enabling cloud upload for scheduled backups
- `BackupHistory.cloudUploadStatus` — nullable String tracking upload outcome (`null` / `"success"` / `"failed"` / `"skipped"`)
- `User.savedQueries` — back-relation to `SavedQuery[]`

Migration SQL created at `prisma/migrations/20260331000000_phase4_models/migration.sql` (applied on deploy — no local DB running).

### npm Packages Installed

| Package | Purpose |
|---------|---------|
| `@monaco-editor/react` | Code editor for SQL query executor (Plan 04-02) |
| `@aws-sdk/client-s3` | S3-compatible cloud storage upload (Plan 04-02) |
| `@aws-sdk/lib-storage` | Multipart upload helper for large backup files |
| `@radix-ui/react-tooltip` | Radix UI tooltip primitive for shadcn component |

### Sidebar Navigation

Updated `navItems` array from 5 to 7 items:

```
대시보드 (/dashboard)       ← NEW, position 0
연결 관리 (/connections)
SQL 쿼리 (/query)           ← NEW, position 2
백업 히스토리 (/history)
사용자 관리 (/users)        [admin only]
감사 로그 (/audit-logs)     [admin only]
설정 (/settings)            [admin only]
```

### shadcn Tooltip Component

Wrote `src/components/ui/tooltip.tsx` following the standard shadcn/ui pattern with `TooltipProvider`, `Tooltip`, `TooltipTrigger`, and `TooltipContent` exports. Uses Radix Portal for z-index isolation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] shadcn CLI peer dep conflict prevented `npx shadcn add tooltip`**
- **Found during:** Task 1
- **Issue:** `npx shadcn add tooltip` runs npm internally without `--legacy-peer-deps`, causing ERESOLVE on nodemailer version conflict between project (^8.0.4) and next-auth peer dependency (^7.0.7). Same issue encountered in previous phases with npm installs.
- **Fix:** Installed `@radix-ui/react-tooltip` manually with `--legacy-peer-deps`, then wrote `tooltip.tsx` directly using the standard shadcn component pattern (identical output to what shadcn CLI would have generated).
- **Files modified:** `src/components/ui/tooltip.tsx`, `package.json`
- **Commit:** 0b48447

## Verification Results

- `npx prisma validate` exits 0
- All 3 npm packages present in `package.json` dependencies
- `tooltip.tsx` exists in `src/components/ui/`
- Sidebar has `대시보드` as first item and `SQL 쿼리` at position 2

## Known Stubs

None — this plan is foundational (schema + packages + nav). No UI data flows to verify.

## Self-Check: PASSED
