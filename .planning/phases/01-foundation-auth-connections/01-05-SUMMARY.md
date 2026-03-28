---
phase: 01
plan: 05
subsystem: audit-logging
tags: [audit, security, rbac, logging]
dependency_graph:
  requires: [01-01, 01-02, 01-03, 01-04]
  provides: [audit-log-helper, audit-log-api, audit-log-ui]
  affects: [auth, users-api, connections-api]
tech_stack:
  added: []
  patterns: [silent-audit-failure, prisma-json-null-sentinel]
key_files:
  created:
    - src/lib/audit.ts
    - src/app/api/audit-logs/route.ts
    - src/app/(app)/audit-logs/AuditLogsPageClient.tsx
  modified:
    - src/auth.ts
    - src/app/api/users/route.ts
    - src/app/api/users/[id]/route.ts
    - src/app/api/connections/route.ts
    - src/app/api/connections/[id]/route.ts
    - src/app/(app)/audit-logs/page.tsx
decisions:
  - "Prisma JSON null requires Prisma.JsonNull sentinel (not JS null) for nullable Json fields"
  - "Audit failures caught silently in createAuditLog — never propagate to the main operation"
  - "Lockout events logged with LOGIN event type plus metadata.lockout=true flag (same enum value)"
metrics:
  duration: 4 min
  completed_date: "2026-03-29"
  tasks_completed: 2
  files_changed: 9
---

# Phase 01 Plan 05: Audit Logging Summary

**One-liner:** AES-256 audit trail wired to all mutations (login, user CRUD, connection CRUD) with admin-only listing UI backed by paginated/filtered API.

## What Was Built

### Task 1: Audit Log Helper + Mutation Wires

Created `src/lib/audit.ts` with a single exported `createAuditLog()` function that wraps `prisma.auditLog.create()` in a try/catch — audit failures log to console but never throw, so they never break the main operation.

Wired audit calls at every mutation point:

| File | Events Written |
|------|---------------|
| src/auth.ts | LOGIN (success), LOGIN+lockout=true (after 5 failed attempts) |
| src/app/api/users/route.ts | USER_CREATE |
| src/app/api/users/[id]/route.ts | USER_UPDATE, ROLE_CHANGE (when role changes), USER_DELETE |
| src/app/api/connections/route.ts | CONN_CREATE |
| src/app/api/connections/[id]/route.ts | CONN_UPDATE, CONN_DELETE |

### Task 2: Audit Log API + UI

**`GET /api/audit-logs`** — admin-only endpoint supporting:
- `event` filter (AuditEventType)
- `userId` filter
- `from`/`to` ISO date range
- `page`/`limit` pagination (default 50/page)
- Returns `{ data: logs[], pagination: { page, limit, total, totalPages } }`

**`AuditLogsPageClient`** — client component with:
- Event type select dropdown (Korean labels)
- Date range inputs (from/to)
- Table: time (formatted), event (Korean label), user (email or "시스템"), target (truncated cuid), metadata (truncated JSON)
- Skeleton loading state
- Empty state message
- Previous/next pagination controls

**`page.tsx`** — Replaced static stub with server-side auth check delegating to `AuditLogsPageClient`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Prisma JSON null type error**
- **Found during:** Task 1 TypeScript compilation check
- **Issue:** `prisma.auditLog.create()` requires `Prisma.JsonNull` sentinel (not JS `null`) for nullable `Json` fields — `null` is not assignable to `NullableJsonNullValueInput | InputJsonValue`
- **Fix:** Import `Prisma` namespace from `@prisma/client` and use `Prisma.JsonNull` when `metadata` param is null/undefined; otherwise cast to `Prisma.InputJsonValue`
- **Files modified:** src/lib/audit.ts
- **Commit:** 2202d16

## Known Stubs

None — all audit log data flows from real `prisma.auditLog` records.

## Self-Check: PASSED

All created files exist on disk. Both task commits verified in git log (1c4f7ea, 2202d16).
