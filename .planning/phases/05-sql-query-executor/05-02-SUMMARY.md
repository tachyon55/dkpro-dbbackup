---
phase: "05-sql-query-executor"
plan: "02"
subsystem: "query-frontend"
tags: ["sql-execution", "monaco-editor", "rbac", "saved-queries", "ui"]
dependency_graph:
  requires:
    - "05-01 (executeQuery API routes)"
    - "@monaco-editor/react v4.7.0"
    - "shadcn/ui: Button, Select, Tabs, Table, Dialog, AlertDialog, Input, Skeleton"
    - "sonner (toast notifications)"
    - "date-fns (date formatting)"
  provides:
    - "/query page with full SQL editor UI"
    - "QueryPageClient — state orchestrator for all query interactions"
    - "QueryEditor — Monaco wrapper with Ctrl+Enter binding"
    - "ResultTable — 4-state result display (empty/loading/SELECT/DML+error)"
    - "SavedQueryPanel — saved query list with load + AlertDialog delete"
  affects:
    - "Sidebar navigation (query link already present)"
tech_stack:
  added:
    - "@monaco-editor/react v4.7.0 (installed from package.json, was missing from node_modules)"
  patterns:
    - "Monaco dynamic import (ssr: false) to prevent server-side render errors"
    - "editor.addCommand(KeyMod.CtrlCmd | KeyCode.Enter) for Ctrl+Enter execution"
    - "isNonSelectSql() client-side detection for DDL warning banner (UX only)"
    - "AlertDialog for destructive delete confirmation (no custom modal needed)"
    - "saveConnectionId='' sentinel for 'no connection' (범용) in save modal"
key_files:
  created:
    - "src/app/(app)/query/page.tsx"
    - "src/components/query/QueryPageClient.tsx"
    - "src/components/query/QueryEditor.tsx"
    - "src/components/query/ResultTable.tsx"
    - "src/components/query/SavedQueryPanel.tsx"
  modified:
    - "package.json (npm install @monaco-editor/react)"
    - "package-lock.json"
decisions:
  - "Monaco dynamic import with ssr:false — Monaco uses browser APIs unavailable during SSR"
  - "DDL warning shown for operator/admin only — viewers see server 403 in error block instead"
  - "saveConnectionId='' maps to connectionId=null on POST (범용 query)"
  - "@monaco-editor/react was in package.json but node_modules was stale — npm install required (Rule 3)"
metrics:
  duration: "5 min"
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 7
---

# Phase 05 Plan 02: SQL Query Executor UI Summary

Complete /query page with Monaco SQL editor, connection selector with color dots, Ctrl+Enter keyboard shortcut, result table (4 states: empty/loading/SELECT/DML+error), save query modal, and saved query panel with row-click load + AlertDialog delete confirmation.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create query page server component + all client components | `3522c56` | page.tsx, QueryPageClient.tsx, QueryEditor.tsx, ResultTable.tsx, SavedQueryPanel.tsx |
| 2 | Verify complete SQL Query Executor page | ⚡ Auto-approved | n/a |

## What Was Built

**`src/app/(app)/query/page.tsx`** — Server Component:
- Auth guard with redirect to /login
- `prisma.dbConnection.findMany` with select of id/name/type/color
- Renders `<QueryPageClient connections={connections} userRole={role} />`

**`src/components/query/QueryEditor.tsx`** — Monaco wrapper:
- Dynamic import with `ssr: false` + loading fallback
- `editor.addCommand(KeyMod.CtrlCmd | KeyCode.Enter, onExecute)` in `onMount`
- Options: minimap off, fontSize 14, lineNumbers on, scrollBeyondLastLine off, wordWrap on
- Wrapper: `rounded-md border border-neutral-200 overflow-hidden`

**`src/components/query/ResultTable.tsx`** — 4-state result display:
- Empty: Terminal icon + Korean copy centered in py-12
- Loading: 5 Skeleton rows
- Error: red-50 block with AlertCircle + `role="alert"`
- SELECT: Clock meta row (durationMs + row count + capped warning) + shadcn Table, NULL values as italic span, font-mono text-xs cells
- DML/other: CheckCircle2 + rowCount + durationMs centered block

**`src/components/query/SavedQueryPanel.tsx`** — Saved query list:
- Empty state with Save icon
- Table: 이름 | 연결 | 저장일 | 액션 columns
- Row click calls `onLoad(sql, connectionId)` to load into editor
- Connection column: color dot + name, or "범용" text-neutral-400 if null
- AlertDialog for delete confirmation with destructive action button

**`src/components/query/QueryPageClient.tsx`** — Main orchestrator:
- Full state inventory per UI-SPEC section 8
- `useEffect` fetches GET /api/query/saved on mount
- `handleExecute()` with connection+sql validation (sonner toast)
- DDL warning banner for operator/admin when non-SELECT detected client-side
- Save modal: Dialog with name input, connection select (clearable), SQL preview pre-block
- `handleLoad()` sets sql + connection + switches to results tab

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @monaco-editor/react not installed in node_modules**
- **Found during:** Task 1 TypeScript verification
- **Issue:** `@monaco-editor/react` was listed in package.json v4.7.0 but not present in node_modules, causing TS2307 "Cannot find module" error + 4 cascading type errors
- **Fix:** Ran `npm install @monaco-editor/react --legacy-peer-deps` (--legacy-peer-deps required due to peer dep conflict same as in Phase 04)
- **Files modified:** package.json, package-lock.json
- **Commit:** Part of task 1 commit `3522c56`

### Out-of-Scope Issues Deferred

- `src/components/ui/tooltip.tsx` TS2307 — missing `@radix-ui/react-tooltip` package (pre-existing, logged in 05-01-SUMMARY.md deferred items)

## Known Stubs

None — all components are fully wired to live API routes from 05-01.

## Self-Check: PASSED
