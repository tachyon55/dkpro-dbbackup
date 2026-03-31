---
phase: "05-sql-query-executor"
plan: "01"
subsystem: "query-backend"
tags: ["sql-execution", "rbac", "multi-db", "saved-queries", "api"]
dependency_graph:
  requires:
    - "04-dashboard-query-executor-cloud-storage"
    - "src/lib/db-drivers (existing testConnection layer)"
    - "prisma/schema.prisma SavedQuery model"
    - "src/lib/crypto (decrypt)"
    - "src/auth (NextAuth session)"
  provides:
    - "executeQuery() multi-DB dispatcher with normalized QueryResult"
    - "POST /api/query/execute with RBAC + row cap"
    - "GET/POST /api/query/saved"
    - "PUT/DELETE /api/query/saved/[id] with ownership guard"
  affects:
    - "05-02 (query UI consumes these routes)"
tech_stack:
  added: []
  patterns:
    - "detectStatementType() regex-based SQL classifier (select/dml/other)"
    - "serializeRows() BigInt-to-string serialization before JSON return"
    - "ROW_CAP=500 applied in executeQuery() dispatcher after driver returns"
    - "userId in Prisma where clause for ownership guard (not post-query check)"
    - "Promise.race 30s timeout for Oracle (callTimeout uncertainty)"
    - "SQLite readonly mode selected by detectStatementType result"
key_files:
  created:
    - "src/app/api/query/execute/route.ts"
    - "src/app/api/query/saved/route.ts"
    - "src/app/api/query/saved/[id]/route.ts"
  modified:
    - "src/lib/db-drivers/index.ts"
    - "src/lib/db-drivers/mysql.ts"
    - "src/lib/db-drivers/postgres.ts"
    - "src/lib/db-drivers/mssql.ts"
    - "src/lib/db-drivers/sqlite.ts"
    - "src/lib/db-drivers/oracle.ts"
decisions:
  - "ROW_CAP enforced in dispatcher (index.ts), not in each driver — single enforcement point"
  - "SQLite readonly mode derived from detectStatementType to prevent accidental writes in SELECT"
  - "Oracle uses Promise.race timeout instead of callTimeout due to version uncertainty"
  - "Prisma userId compound where clause (not separate lookup) prevents TOCTOU ownership race"
  - "Prisma client required regeneration (npx prisma generate) — SavedQuery model existed in schema but client was stale"
metrics:
  duration: "4 min"
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 9
---

# Phase 05 Plan 01: SQL Query Execution Backend Summary

Normalized multi-DB executeQuery() abstraction with QueryResult type across all 6 drivers, RBAC-enforced execution route (viewer=SELECT-only), 500-row server-side cap, and full userId-scoped saved query CRUD.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add executeQuery() abstraction + per-driver execute functions | `680405a` | index.ts, mysql.ts, postgres.ts, mssql.ts, sqlite.ts, oracle.ts |
| 2 | Create query execution + saved query CRUD API routes | `6858546` | execute/route.ts, saved/route.ts, saved/[id]/route.ts |

## What Was Built

**Driver layer additions (src/lib/db-drivers/):**
- `QueryResult` interface: `{ type, columns?, rows?, rowCount?, durationMs, capped? }`
- `ROW_CAP = 500` — applied post-driver in dispatcher
- `detectStatementType(sql)` — regex classifier returning "select" | "dml" | "other"
- `serializeRows(rows)` — BigInt → string conversion preventing JSON serialization errors
- `executeQuery(config, sql)` — switch dispatcher matching testConnection pattern; slices rows and sets `capped=true` when > 500

**Per-driver execute functions:**
- `executeMysql` — `Array.isArray(rows)` distinguishes SELECT from `ResultSetHeader`
- `executePostgres` — `result.fields.length > 0` for SELECT detection; `query_timeout: 30000`
- `executeMssql` — `result.recordset !== undefined` for SELECT; `rowsAffected[0]` for DML
- `executeSqlite` — `readonly` mode for SELECT, read-write for DML/other; `better-sqlite3` sync API
- `executeOracle` — `OUT_FORMAT_OBJECT`, `Promise.race` 30s timeout, `metaData.length > 0` for SELECT

**API routes:**
- `POST /api/query/execute` — auth + Zod validation + connection fetch + viewer RBAC + executeQuery
- `GET /api/query/saved` — list user's own saved queries (userId scoped)
- `POST /api/query/saved` — create saved query with userId ownership
- `PUT /api/query/saved/[id]` — update with userId in where clause (ownership + existence in one query)
- `DELETE /api/query/saved/[id]` — delete with userId in where clause

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma client stale — SavedQuery not on PrismaClient**
- **Found during:** Task 2 TypeScript check
- **Issue:** `prisma.savedQuery` reported as non-existent property. SavedQuery model was in schema.prisma but `npx prisma generate` had not been re-run after the model was added in Phase 04.
- **Fix:** Ran `DATABASE_URL=... npx prisma generate` to regenerate the client
- **Files modified:** node_modules/@prisma/client (generated, not committed)
- **Commit:** Part of task 2 verification flow

### Out-of-Scope Issues Deferred

- `src/components/ui/tooltip.tsx` — missing `@radix-ui/react-tooltip` package (pre-existing, unrelated to this plan)

## Known Stubs

None — all routes are fully wired to real DB operations and Prisma queries.

## Self-Check: PASSED
