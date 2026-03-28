---
phase: 01-foundation-auth-connections
plan: 03
subsystem: connections-api
tags: [crypto, aes-256-gcm, db-drivers, mysql, postgres, mssql, sqlite, oracle, api-routes, rbac]

requires:
  - 01-01 (Prisma schema with DbConnection model, auth session, prisma client)

provides:
  - AES-256-GCM encrypt/decrypt utility (ENCRYPTION_KEY env var, lazy validation)
  - Multi-DB driver registry: testConnection + listDatabases for all 6 DB types
  - Connection CRUD API: GET list, POST create, GET single, PUT update, DELETE (admin only)
  - Connection test API: POST /api/connections/[id]/test → TestResult with latency
  - Connection databases API: GET /api/connections/[id]/databases → string[]
  - Zod validation schemas for connection create and update

affects:
  - 01-02 (connections UI — depends on these API routes)
  - All backup plans (require testConnection + decrypt for running backups)

tech-stack:
  added:
    - Node.js built-in crypto (aes-256-gcm, no new dependency)
    - mysql2/promise (dynamic import for mysql + mariadb)
    - pg Client (dynamic import for postgresql)
    - mssql (dynamic import for sqlserver)
    - better-sqlite3 (dynamic import for sqlite)
    - oracledb (dynamic import, lazy-loaded, graceful error if Instant Client missing)
  patterns:
    - Lazy dynamic imports for DB drivers (especially Oracle) to avoid startup cost
    - AES-256-GCM with lazy key validation — getKey() throws descriptive errors
    - Password never returned to client (select excludes password field explicitly)
    - Re-encrypt only when new non-empty password provided in PUT; keep existing otherwise
    - Role guards inline per route: viewer=read, operator=create/update, admin=delete

key-files:
  created:
    - src/lib/crypto.ts (AES-256-GCM encrypt/decrypt, getKey with validation)
    - src/lib/db-drivers/index.ts (testConnection, listDatabases, DbConnectionConfig, TestResult)
    - src/lib/db-drivers/mysql.ts (testMysql, listMysqlDatabases via mysql2/promise)
    - src/lib/db-drivers/postgres.ts (testPostgres, listPostgresDatabases via pg Client)
    - src/lib/db-drivers/mssql.ts (testMssql, listMssqlDatabases via mssql)
    - src/lib/db-drivers/sqlite.ts (testSqlite, listSqliteDatabases via better-sqlite3)
    - src/lib/db-drivers/oracle.ts (testOracle, listOracleDatabases via oracledb with graceful fallback)
    - src/lib/validations/connection.ts (createConnectionSchema, updateConnectionSchema)
    - src/app/api/connections/route.ts (GET list, POST create)
    - src/app/api/connections/[id]/route.ts (GET, PUT, DELETE)
    - src/app/api/connections/[id]/test/route.ts (POST test)
    - src/app/api/connections/[id]/databases/route.ts (GET databases)

key-decisions:
  - "Oracle driver uses any type instead of typeof import('oracledb') — oracledb has no bundled TypeScript declarations, avoids @types/oracledb dependency"
  - "password field excluded via Prisma select (not post-filter) — prevents accidental inclusion if select is updated"
  - "DELETE is admin-only; POST/PUT are operator+admin — aligns with D-15 principle"
  - "updateConnectionSchema: empty/null password keeps existing encrypted value (don't overwrite with null)"

metrics:
  duration: 6 min
  completed: 2026-03-28T11:04:02Z
  tasks: 2 of 2
  files_created: 12
  files_modified: 0
---

# Phase 01 Plan 03: Connection API + Crypto + DB Drivers Summary

**AES-256-GCM credential encryption, 6-driver DB registry (testConnection/listDatabases via dynamic imports), and complete connection CRUD API with role-based access and password-at-rest protection.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-28T10:57:44Z
- **Completed:** 2026-03-28T11:04:02Z
- **Tasks:** 2 of 2
- **Files modified:** 12 created, 0 modified

## Accomplishments

### Task 1: AES-256-GCM crypto utility and multi-DB driver registry

- `src/lib/crypto.ts`: encrypt/decrypt using Node.js built-in `crypto` module (no new dependencies). `getKey()` is lazy — throws descriptive errors if `ENCRYPTION_KEY` is missing or wrong length. Output format: `iv:authTag:ciphertext` (all hex).
- `src/lib/db-drivers/index.ts`: driver registry with `testConnection(config)` and `listDatabases(config)`. All drivers are dynamically imported (`await import(...)`) — avoids startup cost and allows Oracle's Instant Client to fail gracefully.
- All 6 drivers implemented: mysql (covers mariadb), postgres, mssql, sqlite, oracle. Each has a test function and a list-databases function.
- Oracle driver uses `any` type (no bundled type declarations for oracledb) and wraps import in try-catch with Korean error message for missing Instant Client.

### Task 2: Connection management API routes

- `src/lib/validations/connection.ts`: Zod v4 schemas. `createConnectionSchema` uses `superRefine` for type-conditional validation (SQLite requires `filePath`; others require `host` + `port`). `updateConnectionSchema` makes all fields optional for partial updates.
- `GET /api/connections`: returns all connections ordered by name, password field excluded via Prisma `select`.
- `POST /api/connections`: operator/admin only. Encrypts password with `encrypt()` before storing. Returns 201 with created connection (no password).
- `GET /api/connections/[id]`: any authenticated user. Returns single connection without password.
- `PUT /api/connections/[id]`: operator/admin only. Re-encrypts password only if a new non-empty password is provided. Empty/null password keeps existing encrypted value.
- `DELETE /api/connections/[id]`: admin only. Returns `{ deleted: true }`.
- `POST /api/connections/[id]/test`: any authenticated user. Fetches connection, decrypts password, builds `DbConnectionConfig`, calls `testConnection()`. Returns `{ success, latencyMs, error }`.
- `GET /api/connections/[id]/databases`: any authenticated user. Same decrypt flow, calls `listDatabases()`. Returns `{ databases: string[] }`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] oracledb has no TypeScript type declarations**
- **Found during:** Task 1 build verification
- **Issue:** `typeof import("oracledb")` caused `Type error: Could not find a declaration file for module 'oracledb'` during `npx next build` type check
- **Fix:** Changed oracle driver to use `any` type for oracledb variable with ESLint disable comment. Avoids `@types/oracledb` dependency (doesn't exist on npm for oracledb v6).
- **Files modified:** src/lib/db-drivers/oracle.ts
- **Commit:** 2eb2edd (included in Task 1 commit)

## Known Stubs

None. All API routes are fully implemented. No placeholder logic.

## Self-Check: PASSED
