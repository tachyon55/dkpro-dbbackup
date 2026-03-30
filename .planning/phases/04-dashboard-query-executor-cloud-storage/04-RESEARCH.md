# Phase 4: Dashboard + Query Executor + Cloud Storage - Research

**Researched:** 2026-03-31
**Domain:** Next.js Server Components, Monaco Editor, AWS SDK v3 S3 multipart upload, multi-DB query execution
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dashboard (DASH-01~04)**
- D-01: 로그인 후 기본 랜딩 페이지를 `/dashboard`로 변경 — `src/auth.ts` 또는 루트 redirect 수정
- D-02: 상단 4개 메트릭 카드 한 줄 — 총 연결 수 / 오늘 백업 성공 건수 / 실패 건수(경고 배지) / 다음 스케줄까지 남은 시간
- D-03: 하단 2개 패널 — 좌: 연결별 최근 백업 1건 상태 그리드, 우: 전체 최근 히스토리 10건 리스트
- D-04: 실패 건수 카드 빨간색 + 연결 상태 그리드에서 실패 행 강조. 별도 경고 섹션 없음
- D-05: 사이드바에 '대시보드' 메뉴를 최상단에 추가 (`Sidebar.tsx` navItems 배열 맨 앞에 삽입)

**SQL Query Executor (QURY-01~07)**
- D-06: 진입 방식 — 연결 카드의 'SQL 실행' 버튼 클릭 → `/query/[connectionId]` 전체 페이지로 이동. 사이드바 메뉴에도 'SQL 쿼리' 항목 추가
- D-07: 에디터 컴포넌트 — Monaco Editor (`@monaco-editor/react`) — 현재 미설치
- D-08: 페이지 레이아웃 — 상단: 연결 선택 드롭다운 + 실행 버튼 / 중단: Monaco 에디터 / 하단: 결과 패널
- D-09: 저장된 쿼리 범위 — 개인 저장 (user별). `SavedQuery` Prisma 모델 추가 필요
- D-10: RBAC — viewer: SELECT만, operator: DML, admin: 모든 SQL. 서버 측 SQL 타입 파싱으로 강제

**Cloud Storage (CLOD-01~04)**
- D-11: S3 연결 정보 — `/settings` 페이지에 'Cloud Storage' 탭 추가. admin 전용
- D-12: 스케줄별 업로드 ON/OFF — `ScheduleModal`에 '클라우드 업로드' 토글 추가. 글로벌 S3 설정 없으면 토글 비활성화
- D-13: 업로드 실패 시 — 로컬 백업은 성공으로 유지, S3 업로드 실패는 알림으로 별도 통보. `BackupHistory`에 `cloudUploadStatus` 필드 추가 검토
- D-14: 대용량 파일 — AWS SDK v3 multipart upload 사용. `@aws-sdk/client-s3` 미설치 확인됨 → 설치 필요

### Claude's Discretion

- 대시보드 데이터 fetch 방식 (서버 컴포넌트 직접 쿼리 vs 전용 API route)
- SQL 쿼리 결과 테이블의 페이지네이션 방식 (결과 행이 많을 때)
- `executeQuery` 함수를 `db-drivers/index.ts`에 추가하는 구체적 구현 (드라이버별 분기)
- `CloudStorageSettings` Prisma 모델 설계 (암호화 저장 방식은 AES-256-GCM으로 기존 패턴 따름)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | 전체 연결 상태를 한눈에 볼 수 있다 | Server Component Prisma query pattern; connections + latest BackupHistory per connection |
| DASH-02 | 최근 백업 결과(성공/실패)를 요약하여 보여준다 | BackupHistory aggregation: count by status WHERE startedAt >= today |
| DASH-03 | 다음 예정된 스케줄 백업을 표시한다 | Schedule.findFirst ordered by next fire time computation |
| DASH-04 | 백업 실패 또는 오래된 백업에 대한 경고를 표시한다 | Failure count card + red row highlighting — no separate alert section |
| QURY-01 | 사용자가 연결을 선택하고 SQL을 실행할 수 있다 | executeQuery() added to db-drivers/index.ts; POST /api/query route |
| QURY-02 | SELECT 결과가 테이블 형태로 표시된다 | Client-side table with max-h-96 scroll, 500-row client truncation |
| QURY-03 | DML 실행 시 영향받은 행 수가 표시된다 | Driver returns { rows, affectedRows, durationMs } union type |
| QURY-04 | 역할에 따라 실행 가능한 SQL 타입이 제한된다 | Server: SQL type detection via regex on first keyword; viewer blocks non-SELECT |
| QURY-05 | 쿼리 실행 시간이 표시된다 | Date.now() delta in executeQuery wrapper |
| QURY-06 | 자주 사용하는 SQL을 저장하고 불러올 수 있다 | SavedQuery Prisma model; POST /api/saved-queries |
| QURY-07 | 저장된 쿼리를 수정/삭제할 수 있다 | PUT/DELETE /api/saved-queries/[id] with userId ownership check |
| CLOD-01 | 백업 파일을 S3 호환 클라우드 스토리지에 업로드할 수 있다 | @aws-sdk/client-s3 + @aws-sdk/lib-storage Upload helper |
| CLOD-02 | 클라우드 스토리지 연결 정보를 설정할 수 있다 | CloudStorageSettings Prisma model; GET/PUT /api/settings/cloud-storage |
| CLOD-03 | 스케줄별로 클라우드 업로드 활성화/비활성화할 수 있다 | Schedule.cloudUpload Boolean field; ScheduleModal toggle |
| CLOD-04 | 대용량 파일은 멀티파트 업로드로 처리된다 | @aws-sdk/lib-storage Upload class handles multipart automatically |
</phase_requirements>

---

## Summary

Phase 4 delivers three independent feature areas on top of the existing Phase 1-3 foundation. The codebase is mature — established patterns for API routes, settings forms, encrypted single-record storage, and Prisma schema migrations are all directly reusable.

Two new npm packages must be installed before any Phase 4 implementation work begins: `@monaco-editor/react@4.7.0` and `@aws-sdk/client-s3@3.x` + `@aws-sdk/lib-storage@3.x`. Neither is currently in `package.json`. The AWS SDK v3 uses a modular architecture; `@aws-sdk/lib-storage` is required separately for the `Upload` helper class that handles multipart uploads automatically.

The dashboard is the simplest area — it is pure data aggregation via Server Component Prisma queries with no new API routes needed. The SQL Query Executor is the most complex area because it requires: (1) new `executeQuery()` function per driver, (2) server-side SQL type detection for RBAC, (3) Monaco Editor SSR compatibility handling (requires dynamic import with `ssr: false`), and (4) a new `SavedQuery` Prisma model. Cloud Storage follows the exact same pattern as `NotificationSettings` — single-record upsert, AES-256-GCM encrypted secret key.

**Primary recommendation:** Build in dependency order: Prisma schema migration first (adds SavedQuery + CloudStorageSettings models + Schedule.cloudUpload field), then Dashboard (no new deps), then Cloud Storage (install AWS SDK, follow NotificationSettings pattern), then Query Executor last (most complex, install Monaco).

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| next | 15.5.14 | App Router, Server Components | Installed |
| @prisma/client | 7.6.0 | ORM for new models | Installed |
| @radix-ui/react-tabs | 1.1.13 | Settings Cloud Storage tab | Installed |
| lucide-react | 1.7.0 | LayoutDashboard, Terminal icons | Installed |
| sonner | 2.0.7 | Toast notifications | Installed |
| @radix-ui/react-dialog | 1.1.15 | Save query name dialog | Installed |

### New Dependencies Required
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @monaco-editor/react | 4.7.0 | SQL editor with syntax highlight | Decision D-07 |
| @aws-sdk/client-s3 | 3.1020.0 | S3 API client (PutObject, CreateMultipartUpload) | Decision D-14 |
| @aws-sdk/lib-storage | 3.1020.0 | Upload helper — handles multipart automatically | CLOD-04 |

**Installation:**
```bash
npm install @monaco-editor/react
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
```

### shadcn Components to Add
```bash
npx shadcn add tooltip
```
Required per UI-SPEC for collapsed sidebar icon labels and Monaco toolbar icons.

**Version verification (confirmed 2026-03-31):**
- `@monaco-editor/react`: 4.7.0 (npm registry)
- `@aws-sdk/client-s3`: 3.1020.0 (npm registry)
- `@aws-sdk/lib-storage`: 3.1020.0 (npm registry)

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
src/
├── app/
│   ├── (app)/
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Server Component — direct Prisma queries
│   │   └── query/
│   │       └── [connectionId]/
│   │           └── page.tsx          # Server Component shell → QueryPageClient
│   └── api/
│       ├── query/
│       │   └── route.ts              # POST — execute SQL
│       ├── saved-queries/
│       │   ├── route.ts              # GET list, POST create
│       │   └── [id]/
│       │       └── route.ts          # PUT update, DELETE remove
│       └── settings/
│           └── cloud-storage/
│               └── route.ts          # GET, PUT — mirrors notifications pattern
├── components/
│   ├── dashboard/
│   │   └── DashboardClient.tsx       # Client wrapper for skeleton/hydration
│   └── query/
│       └── QueryPageClient.tsx       # Monaco + results + saved queries
└── lib/
    ├── db-drivers/
    │   ├── index.ts                  # Add executeQuery() function
    │   ├── mysql.ts                  # Add executeMysqlQuery()
    │   ├── postgres.ts               # Add executePostgresQuery()
    │   ├── mssql.ts                  # Add executeMssqlQuery()
    │   ├── sqlite.ts                 # Add executeSqliteQuery()
    │   └── oracle.ts                 # Add executeOracleQuery()
    └── s3-upload.ts                  # S3 multipart upload utility
```

### Pattern 1: Dashboard — Server Component Direct Prisma Queries

**What:** Dashboard page is a Server Component that runs Prisma queries directly. No dedicated API route needed. Data is never stale because every page load fetches fresh.

**When to use:** Read-only display data with no real-time requirement. UI-SPEC confirms: "Auto-refresh: dashboard data does NOT auto-refresh. User refreshes page manually."

**Example:**
```typescript
// src/app/(app)/dashboard/page.tsx
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // All queries run in parallel
  const [totalConnections, todaySuccess, todayFailed, nextSchedule, recentHistory, connectionStatuses] =
    await Promise.all([
      prisma.dbConnection.count(),
      prisma.backupHistory.count({
        where: { status: "success", startedAt: { gte: today } },
      }),
      prisma.backupHistory.count({
        where: { status: "failed", startedAt: { gte: today } },
      }),
      prisma.schedule.findFirst({
        where: { isEnabled: true },
        orderBy: { updatedAt: "asc" },
        include: { connection: { select: { name: true } } },
      }),
      prisma.backupHistory.findMany({
        take: 10,
        orderBy: { startedAt: "desc" },
        select: { id: true, connectionName: true, dbType: true, status: true,
                  fileName: true, fileSizeBytes: true, startedAt: true, durationMs: true },
      }),
      // Latest backup per connection: raw query or groupBy workaround
      prisma.dbConnection.findMany({
        include: {
          backupHistories: {
            take: 1,
            orderBy: { startedAt: "desc" },
            select: { status: true, startedAt: true },
          },
        },
      }),
    ])
  // ...render
}
```

**Pitfall — Prisma groupBy for "latest per connection":** Prisma does not support `DISTINCT ON` or lateral joins directly. The pattern above (include with take: 1 + orderBy) works correctly and is idiomatic Prisma. Do NOT use groupBy for this.

### Pattern 2: Monaco Editor with SSR Disabled

**What:** Monaco Editor requires browser APIs (window, document) and cannot render server-side. Must use Next.js dynamic import with `ssr: false`.

**When to use:** Any component importing `@monaco-editor/react`.

**Example:**
```typescript
// src/components/query/QueryPageClient.tsx
"use client"
import dynamic from "next/dynamic"

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react"),
  { ssr: false, loading: () => <div className="h-64 bg-neutral-100 animate-pulse rounded" /> }
)

// Usage:
<MonacoEditor
  height="256px"
  language="sql"
  theme="vs"         // or "vs-dark" based on system preference
  value={sql}
  onChange={(val) => setSql(val ?? "")}
  options={{
    fontFamily: "Geist Mono",
    fontSize: 14,
    minimap: { enabled: false },
    lineNumbers: "on",
    scrollBeyondLastLine: false,
  }}
  onMount={(editor) => {
    // Ctrl+Enter / Cmd+Enter to execute
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => handleExecute()
    )
  }}
/>
```

### Pattern 3: executeQuery — Driver-per-DB Implementation

**What:** New function in each db-driver file returning a union result type. Server-side only — never runs in browser.

**Return type:**
```typescript
export interface QueryResult {
  rows: Record<string, unknown>[]   // SELECT results
  columns: string[]                  // column names in order
  affectedRows?: number              // DML only
  durationMs: number
}
```

**MySQL/MariaDB example:**
```typescript
// src/lib/db-drivers/mysql.ts
export async function executeMysqlQuery(
  config: DbConnectionConfig,
  sql: string
): Promise<QueryResult> {
  const mysql2 = await import("mysql2/promise")
  const connection = await mysql2.createConnection({ /* ...same as testMysql */ })
  const start = Date.now()
  try {
    const [result, fields] = await connection.execute(sql)
    const durationMs = Date.now() - start
    if (Array.isArray(result)) {
      // SELECT
      return {
        rows: result as Record<string, unknown>[],
        columns: fields?.map((f) => f.name) ?? [],
        durationMs,
      }
    } else {
      // DML — result is ResultSetHeader
      return {
        rows: [],
        columns: [],
        affectedRows: (result as { affectedRows: number }).affectedRows,
        durationMs,
      }
    }
  } finally {
    await connection.end()
  }
}
```

**PostgreSQL uses `pg` directly:**
```typescript
// src/lib/db-drivers/postgres.ts
import { Client } from "pg"
export async function executePostgresQuery(config: DbConnectionConfig, sql: string): Promise<QueryResult> {
  const client = new Client({ host: config.host ?? undefined, ... })
  await client.connect()
  const start = Date.now()
  try {
    const result = await client.query(sql)
    return {
      rows: result.rows,
      columns: result.fields.map((f) => f.name),
      affectedRows: result.rowCount ?? undefined,
      durationMs: Date.now() - start,
    }
  } finally {
    await client.end()
  }
}
```

**SQLite (better-sqlite3 is synchronous):**
```typescript
// src/lib/db-drivers/sqlite.ts
import Database from "better-sqlite3"
export function executeSqliteQuery(config: DbConnectionConfig, sql: string): QueryResult {
  const db = new Database(config.filePath ?? ":memory:", { readonly: false })
  const start = Date.now()
  try {
    const stmt = db.prepare(sql)
    if (stmt.reader) {
      const rows = stmt.all() as Record<string, unknown>[]
      const columns = rows.length > 0 ? Object.keys(rows[0]) : []
      return { rows, columns, durationMs: Date.now() - start }
    } else {
      const info = stmt.run()
      return { rows: [], columns: [], affectedRows: info.changes, durationMs: Date.now() - start }
    }
  } finally {
    db.close()
  }
}
```

### Pattern 4: Server-Side SQL Type Detection (QURY-04 RBAC)

**What:** Extract the first keyword from the SQL string (ignoring comments and whitespace) and classify as SELECT vs DML vs DDL.

**Example:**
```typescript
// src/lib/sql-type.ts
type SqlCategory = "SELECT" | "DML" | "DDL" | "OTHER"

export function classifySql(sql: string): SqlCategory {
  const normalized = sql
    .replace(/--[^\n]*/g, "")      // strip line comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // strip block comments
    .trim()
    .toUpperCase()

  const first = normalized.split(/\s+/)[0]
  if (first === "SELECT" || first === "WITH" || first === "SHOW" || first === "EXPLAIN") {
    return "SELECT"
  }
  if (["INSERT", "UPDATE", "DELETE", "MERGE", "REPLACE"].includes(first)) {
    return "DML"
  }
  if (["CREATE", "ALTER", "DROP", "TRUNCATE", "RENAME"].includes(first)) {
    return "DDL"
  }
  return "OTHER"
}

// In API route:
const category = classifySql(sql)
if (session.user.role === "viewer" && category !== "SELECT") {
  return NextResponse.json({ error: "뷰어 권한으로는 SELECT만 실행할 수 있습니다." }, { status: 403 })
}
```

### Pattern 5: S3 Multipart Upload via @aws-sdk/lib-storage

**What:** `@aws-sdk/lib-storage` `Upload` class automatically switches between single PutObject and multipart upload based on file size (threshold: 5 MB by default). Handles all multipart complexity internally.

**Example:**
```typescript
// src/lib/s3-upload.ts
import { S3Client } from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"
import { createReadStream } from "fs"

interface S3Config {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
}

export async function uploadToS3(
  config: S3Config,
  filePath: string,
  key: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true, // required for non-AWS S3-compatible endpoints (MinIO, NCP)
  })

  const upload = new Upload({
    client,
    params: {
      Bucket: config.bucket,
      Key: key,
      Body: createReadStream(filePath),
    },
    queueSize: 4,      // 4 parallel part uploads
    partSize: 5 * 1024 * 1024, // 5 MB parts
  })

  upload.on("httpUploadProgress", (progress) => {
    if (progress.loaded && progress.total) {
      onProgress?.(Math.round((progress.loaded / progress.total) * 100))
    }
  })

  await upload.done()
}
```

**Key insight — `forcePathStyle: true`:** AWS SDK v3 defaults to virtual-hosted-style (`bucket.endpoint.com`). For S3-compatible services (NCP Object Storage, MinIO, local dev), `forcePathStyle: true` is required to use path-style (`endpoint.com/bucket`).

### Pattern 6: CloudStorageSettings — Mirrors NotificationSettings

**What:** Single-record Prisma model with upsert. AES-256-GCM encryption for `secretAccessKey`. GET returns `secretAccessKeySet: boolean` instead of the actual value.

**Prisma model to add:**
```prisma
model CloudStorageSettings {
  id              String   @id @default(cuid())
  endpoint        String?
  region          String?
  bucket          String?
  accessKeyId     String?
  secretAccessKey String?  // AES-256-GCM encrypted
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**API pattern:** Identical to `src/app/api/settings/notifications/route.ts` — GET + PUT, findFirst + update-or-create, encrypt on write, strip on read.

### Pattern 7: Schedule.cloudUpload Migration

**Prisma field to add to Schedule model:**
```prisma
model Schedule {
  // ... existing fields ...
  cloudUpload Boolean @default(false)  // NEW
}
```

**Migration approach:** Following Phase 2 precedent ("Migration created manually — DB not running locally"), create the migration SQL file manually. The field has a default value so it is safe to add to existing rows.

### Anti-Patterns to Avoid

- **`exec()` for anything:** All child_process calls already use `spawn()`. No new shell commands in this phase.
- **Monaco Editor imported without `ssr: false`:** Will crash Next.js build with "window is not defined". Always dynamic import.
- **Storing S3 secretAccessKey as plaintext:** Must use existing `encrypt()` / `decrypt()` from `src/lib/crypto.ts`.
- **Blocking S3 upload in the HTTP request cycle:** S3 upload happens after backup completes in `scheduler.ts`, not as a synchronous step in the backup API response.
- **Using `exec()` instead of createReadStream for S3:** Always stream file — don't `readFileSync` large backup files into memory.
- **Query execution with string interpolation:** SQL is user-supplied and runs against the target DB, not the app DB. Never template-string the SQL into anything. Pass it directly to `connection.execute(sql)` — the target DB parses it. There is no parameterization needed here since the SQL itself is the user's input.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multipart S3 upload | Custom chunking + CompleteMultipartUpload orchestration | `@aws-sdk/lib-storage` Upload class | Handles retries, part numbering, abort-on-failure, progress events |
| SQL syntax highlighting | Custom CodeMirror or textarea | `@monaco-editor/react` | Decision D-07 locked; Monaco handles tokenization, autocomplete, keyboard shortcuts |
| SQL type detection | Full SQL parser | Simple first-keyword regex | Sufficient for SELECT vs DML/DDL classification; full parser adds 200KB+ bundle |
| "Latest backup per connection" | Custom SQL subquery via `prisma.$queryRaw` | Prisma relation with `take: 1 + orderBy` | Idiomatic Prisma, type-safe, no raw SQL needed |

**Key insight:** The AWS SDK v3 `Upload` class is specifically designed to abstract away S3 multipart complexity. A hand-rolled implementation would need to handle: part size calculation, parallel upload queue, part ETags collection, error recovery, and AbortMultipartUpload on failure. The Upload class does all of this.

---

## Common Pitfalls

### Pitfall 1: Monaco Editor SSR Crash
**What goes wrong:** `import Editor from "@monaco-editor/react"` at the top of a Client Component causes Next.js build failure: "ReferenceError: window is not defined" or "self is not defined".
**Why it happens:** Monaco accesses browser globals during module initialization.
**How to avoid:** Always wrap with `dynamic(() => import("@monaco-editor/react"), { ssr: false })`.
**Warning signs:** Build output mentions "self is not defined" or component fails to load in development.

### Pitfall 2: S3 Virtual-Hosted vs Path-Style URLs
**What goes wrong:** Uploads to non-AWS S3-compatible endpoints (NCP, MinIO) fail with "NoSuchBucket" or DNS resolution errors.
**Why it happens:** AWS SDK v3 defaults to virtual-hosted style (`bucket.endpoint.com`), which requires DNS wildcard support not present on all S3-compatible services.
**How to avoid:** Always set `forcePathStyle: true` in the S3Client constructor.
**Warning signs:** Works against real AWS S3 but fails against NCP/MinIO endpoints.

### Pitfall 3: Prisma "latest per group" Anti-Pattern
**What goes wrong:** Using `groupBy` to find the latest backup per connection — Prisma groupBy returns aggregated scalars only, not full records.
**Why it happens:** Developers familiar with SQL GROUP BY try to replicate it in Prisma.
**How to avoid:** Use `include: { backupHistories: { take: 1, orderBy: { startedAt: "desc" } } }` on the connection query.
**Warning signs:** TypeScript errors on attempting to access non-scalar fields from groupBy result.

### Pitfall 4: S3 Upload Blocking the Scheduler
**What goes wrong:** S3 upload runs synchronously inside `runScheduledBackup` before it resolves, adding minutes of latency to what the scheduler considers the job duration.
**Why it happens:** Naive implementation calls `await uploadToS3(...)` in the main try block.
**How to avoid:** S3 upload should run after `runBackup()` succeeds, wrapped in its own try/catch that (a) does NOT throw to the outer scope and (b) sends notification on failure per D-13.
**Warning signs:** Scheduler job takes unexpectedly long; S3 failure marks backup as failed when local backup actually succeeded.

### Pitfall 5: SavedQuery User Isolation
**What goes wrong:** GET /api/saved-queries returns all users' saved queries.
**Why it happens:** Forgetting to filter by `userId: session.user.id` in the Prisma query.
**How to avoid:** Every SavedQuery query must include `where: { userId: session.user.id }`.
**Warning signs:** User can see another user's saved queries.

### Pitfall 6: backupHistory cloudUploadStatus vs Separate Model
**What goes wrong:** Adding `cloudUploadStatus` to BackupHistory as a Prisma enum creates a migration that requires manual SQL on a running DB.
**Why it happens:** Enum changes in PostgreSQL require `ALTER TYPE` which Prisma migration wraps but some hosting environments restrict.
**How to avoid:** Use a nullable String field (`cloudUploadStatus String?`) instead of a new enum. Values: `null` (not attempted), `"success"`, `"failed"`, `"skipped"`. String is migration-safe.
**Warning signs:** Prisma migration with `CREATE TYPE` on existing PostgreSQL DB with restricted ALTER permissions.

### Pitfall 7: Monaco onMount Keyboard Shortcut Binding
**What goes wrong:** `editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, ...)` references stale closure over `handleExecute`.
**Why it happens:** `onMount` fires once; if `handleExecute` is recreated on re-render, the bound version is stale.
**How to avoid:** Use `useRef` to hold the execute function, update ref on each render, and call `ref.current()` inside the `onMount` closure.
**Warning signs:** Ctrl+Enter submits the query with an old connection ID or stale SQL value.

---

## Code Examples

### Dashboard — "Next Schedule" computation

```typescript
// Compute next fire time from hour/minute — same helper pattern as scheduler.ts
function getNextFireTime(hour: number, minute: number): Date {
  const now = new Date()
  const candidate = new Date(now)
  candidate.setHours(hour, minute, 0, 0)
  if (candidate <= now) candidate.setDate(candidate.getDate() + 1)
  return candidate
}

// Find the schedule with the earliest next fire time
const nextSchedule = enabledSchedules
  .map((s) => ({ ...s, nextFire: getNextFireTime(s.hour, s.minute) }))
  .sort((a, b) => a.nextFire.getTime() - b.nextFire.getTime())[0]
```

### Query API Route — Full Pattern

```typescript
// src/app/api/query/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"
import { executeQuery } from "@/lib/db-drivers"
import { classifySql } from "@/lib/sql-type"

const schema = z.object({
  connectionId: z.string().min(1),
  sql: z.string().min(1).max(50000),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { connectionId, sql } = parsed.data

  // RBAC: viewer can only run SELECT
  const category = classifySql(sql)
  if (session.user.role === "viewer" && category !== "SELECT") {
    return NextResponse.json({ error: "뷰어 권한으로는 SELECT만 실행할 수 있습니다." }, { status: 403 })
  }

  const conn = await prisma.dbConnection.findUnique({ where: { id: connectionId } })
  if (!conn) return NextResponse.json({ error: "연결을 찾을 수 없습니다" }, { status: 404 })

  const config = {
    type: conn.type,
    host: conn.host,
    port: conn.port,
    username: conn.username,
    password: conn.password ? decrypt(conn.password) : null,
    database: conn.database,
    filePath: conn.filePath,
    sid: conn.sid,
    serviceName: conn.serviceName,
  }

  try {
    const result = await executeQuery(config, sql)
    return NextResponse.json({ data: result })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
```

### S3 Upload Integration in scheduler.ts

```typescript
// Inside runScheduledBackup — after runBackup() succeeds:
const schedule = await prisma.schedule.findUnique({ where: { connectionId } })
if (schedule?.cloudUpload) {
  const { uploadBackupToCloud } = await import("@/lib/s3-upload")
  await uploadBackupToCloud(record.id).catch(async (err) => {
    console.error("[Scheduler] S3 upload failed:", err)
    // Update cloudUploadStatus on history record
    await prisma.backupHistory.update({
      where: { id: record.id },
      data: { cloudUploadStatus: "failed" },
    })
    // Notify via existing notifications channel
    const { sendBackupNotification } = await import("@/lib/notifications")
    // Pass a special flag or message about S3 failure
    await sendBackupNotification(connectionId, completed, new Error(`S3 upload failed: ${err.message}`))
      .catch(() => {})
  })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AWS SDK v2 (single package) | AWS SDK v3 (modular) | 2020 | Import only what you need: `@aws-sdk/client-s3` + `@aws-sdk/lib-storage` separately |
| Monaco Editor direct npm | `@monaco-editor/react` wrapper | 2019 | React lifecycle integration, SSR guard, simpler API |
| CodeMirror 5 for SQL editing | Monaco Editor | 2021+ | VS Code quality, built-in SQL language server |

**Deprecated/outdated:**
- `aws-sdk` (v2): Do not use. `@aws-sdk/client-s3` v3 is the current standard.
- `monaco-editor` direct package: Requires manual webpack config. Use `@monaco-editor/react` instead.

---

## Open Questions

1. **Oracle executeQuery implementation**
   - What we know: Oracle driver uses `any` type + eslint-disable (Phase 1 decision). `oracledb` connection pool vs single connection for query execution.
   - What's unclear: Whether `connection.execute()` returns `result.rows` as array of arrays or array of objects depending on `outFormat` setting.
   - Recommendation: Set `outFormat: oracledb.OUT_FORMAT_OBJECT` explicitly to match the `Record<string, unknown>[]` contract. If oracledb is unavailable in test environment, guard with try/catch at the driver level.

2. **BackupHistory.cloudUploadStatus field**
   - What we know: D-13 says "검토" (consider adding). String field is safer than enum for migration.
   - What's unclear: Whether the planner should include this in the Prisma migration or keep it as a future enhancement.
   - Recommendation: Include it. It adds value to the dashboard's failure card (can show "로컬 성공, 클라우드 실패" nuance) and follows D-13 intent. Use nullable String.

3. **Dashboard "next schedule" when multiple schedules exist**
   - What we know: D-02 says "다음 스케줄까지 남은 시간" (singular — one card).
   - What's unclear: Which schedule to show if multiple enabled schedules exist — nearest, or connection-specific?
   - Recommendation: Show the nearest upcoming fire time across all enabled schedules. This is most useful operationally.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v22.19.0 | — |
| npm | Package install | ✓ | 10.9.3 | — |
| @monaco-editor/react | QURY-01~07 (editor) | ✗ | 4.7.0 (registry) | None — must install |
| @aws-sdk/client-s3 | CLOD-01~04 | ✗ | 3.1020.0 (registry) | None — must install |
| @aws-sdk/lib-storage | CLOD-04 (multipart) | ✗ | 3.1020.0 (registry) | Could use raw CreateMultipartUpload API — much more complex |
| PostgreSQL (app DB) | All Prisma queries | Assumed ✓ | 16 (per CLAUDE.md) | — |
| shadcn tooltip | Sidebar collapsed labels | ✗ | latest | title="" attr (partial) |

**Missing dependencies with no fallback:**
- `@monaco-editor/react` — blocks Query Executor implementation. Must be Wave 0 install.
- `@aws-sdk/client-s3` — blocks Cloud Storage implementation. Must be Wave 0 install.

**Missing dependencies with fallback:**
- `@aws-sdk/lib-storage` — can use raw S3 multipart API, but adds ~100 lines of error-prone orchestration code. Install is strongly preferred.
- `shadcn tooltip` — collapsed sidebar works with HTML `title` attribute as degraded fallback, but UI-SPEC specifies tooltip component.

---

## Sources

### Primary (HIGH confidence)
- Codebase inspection — `src/lib/db-drivers/index.ts`, `mysql.ts`, `scheduler.ts`, `notifications/route.ts`, `Sidebar.tsx`, `ScheduleModal.tsx`, `ConnectionCard.tsx`, `schema.prisma` — confirmed existing patterns
- `package.json` — confirmed installed vs missing packages
- npm registry (`npm view`) — confirmed current versions as of 2026-03-31

### Secondary (MEDIUM confidence)
- AWS SDK v3 documentation — `@aws-sdk/lib-storage` Upload class, `forcePathStyle` option, multipart threshold behavior
- `@monaco-editor/react` GitHub README — SSR requirement (`ssr: false`), `onMount` keyboard bindings, `options` API

### Tertiary (LOW confidence)
- Oracle `oracledb` `OUT_FORMAT_OBJECT` behavior — based on oracledb v6 documentation; should be verified against actual Oracle connection in test environment

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via npm registry
- Architecture: HIGH — patterns derived directly from existing codebase code inspection
- Pitfalls: HIGH (items 1-5) / MEDIUM (items 6-7) — based on known Next.js/AWS SDK/Prisma behaviors

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable libraries; AWS SDK v3 and Monaco have stable APIs)
