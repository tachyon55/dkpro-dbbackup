# Phase 2: Backup Engine + History - Research

**Researched:** 2026-03-29
**Domain:** Node.js child_process backup execution, SSE streaming, Prisma schema extension, file I/O, SHA-256 integrity
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 백업은 연결 카드에서 직접 트리거 (별도 백업 페이지 없음). 카드에 "백업 실행" 버튼 추가
- **D-02:** 즉시 실행 방식 — 버튼 클릭 → 확인 다이얼로그 → 바로 실행. 저장 경로는 시스템 기본값 사용 (Phase 3에서 스케줄별 경로 설정)
- **D-03:** 동시 백업 차단 시 해당 연결의 백업 버튼을 비활성화하고 "백업 중..." 상태 표시
- **D-04:** SSE (Server-Sent Events) 사용 — 단방향 스트림으로 충분하며 Next.js API Route에서 바로 사용 가능, 별도 WebSocket 서버 불필요
- **D-05:** 로그 스트림 + 프로그레스 바 조합 — dump 도구의 stdout/stderr를 로그로 스트리밍하고, 상단에 프로그레스 바 표시 (시작/진행중/완료 단계)
- **D-06:** 전용 모달/드로어에서 진행 상황 표시 — 백업 실행 버튼 클릭 시 모달이 열리고 로그+프로그레스 표시. 완료 후 닫기 가능
- **D-07:** 백업 완료/실패 후 결과 요약(성공/실패 상태, 파일 크기, 소요시간) + 닫기 버튼 제공
- **D-08:** 사이드바에 "백업 히스토리" 메뉴 추가. 전체 연결의 백업 이력을 하나의 테이블에 표시, 연결별/상태별/날짜 필터 제공
- **D-09:** 테이블 컬럼: 연결명, DB타입, 상태(성공/실패/진행중), 파일명, 파일크기, 소요시간, 실행일시
- **D-10:** 테이블 행 클릭 → 상세 패널(오른쪽 또는 하단) 열림. dump 로그 전문, 에러 메시지, 파일 상세 정보 표시
- **D-11:** 히스토리 상세 패널에서 다운로드 버튼 제공. 파일 정보 확인 후 다운로드
- **D-12:** SHA-256 해시값을 상세 패널에 표시하고 클립보드 복사 버튼 제공. 사용자가 다운로드 후 로컬에서 비교

### Claude's Discretion
- 백업 파일 저장 디렉토리 구조 (DB명/날짜 등 하위 폴더 구성)
- 백업 파일명 포맷 상세 (BKUP-06 요구사항 충족하는 범위에서)
- SSE 이벤트 프로토콜 상세 (이벤트 타입, 데이터 포맷)
- 히스토리 테이블 페이지네이션 방식
- 상세 패널의 정확한 레이아웃과 UX 디테일
- 에러 메시지 문구와 토스트 스타일
- Prisma 모델 설계 (BackupHistory, BackupLog 등)
- AuditEventType에 백업 관련 이벤트 추가 (BACKUP_START, BACKUP_COMPLETE, BACKUP_FAIL 등)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BKUP-01 | 사용자가 수동으로 즉시 백업을 실행할 수 있다 | POST /api/backups → spawn dump tool → SSE stream |
| BKUP-02 | 백업이 네이티브 dump 도구(mysqldump, pg_dump 등)를 사용하여 실행된다 | Per-DB spawn strategy table (§Architecture Patterns) |
| BKUP-03 | 백업 진행 상황이 WebSocket으로 실시간 표시된다 | SSE via Next.js Route Handler ReadableStream (D-04 locked) |
| BKUP-04 | 백업 파일이 서버 로컬 디스크에 저장된다 | fs.createWriteStream + spawn stdout pipe, configurable base dir |
| BKUP-05 | 동일 연결에 대한 동시 백업이 방지된다 (동시성 제어) | globalThis in-progress Set, button disabled state (D-03) |
| BKUP-06 | 백업 파일명에 DB명, 날짜, 시간이 포함된다 | Filename format pattern in §Architecture Patterns |
| HIST-01 | 백업 히스토리를 조회할 수 있다 (날짜, 상태, 파일명, 크기, 소요시간) | BackupHistory Prisma model + GET /api/backup-history |
| HIST-02 | 백업 성공/실패 상세 로그를 조회할 수 있다 | fullLog field on BackupHistory model |
| HIST-03 | 백업 파일을 웹에서 다운로드할 수 있다 | GET /api/backup-history/[id]/download — Readable.toWeb() stream |
| HIST-04 | 백업 파일의 SHA-256 해시로 무결성을 검증할 수 있다 | crypto.createHash('sha256') computed after write, stored in DB |
</phase_requirements>

---

## Summary

Phase 2 builds three tightly coupled subsystems: (1) a backup execution engine using `child_process.spawn()` with per-DB-type tool strategies, (2) real-time progress streaming via SSE using Next.js Route Handler + Web ReadableStream, and (3) a history/download layer backed by a new `BackupHistory` Prisma model.

The locked stack choices are well-matched to the requirements. SSE via `ReadableStream` in a Next.js App Router Route Handler is the correct approach — it requires no additional dependencies and works natively with `export const dynamic = 'force-dynamic'`. The critical implementation detail is that background work (spawn, pipe to file) must be started inside the `ReadableStream` constructor's `start()` callback, not awaited before the `Response` is returned; otherwise Next.js buffers the entire stream.

The main engineering risk flagged in STATE.md concerns Oracle `expdp` and SQL Server `sqlcmd/BACKUP DATABASE`: these tools do not stream stdout the way `mysqldump`/`pg_dump` do. The recommended mitigation is a deterministic progress-stage model (STARTED → IN_PROGRESS → COMPLETED/FAILED) sent as SSE events, independent of actual stdout content, with stderr/stdout forwarded as log lines when available.

**Primary recommendation:** Implement the SSE Route Handler + spawn engine as a server-side `lib/backup-engine.ts` module that returns a Web `ReadableStream`. The Route Handler wraps it in a `Response`. Concurrency control uses a `globalThis`-scoped `Set<string>` keyed by `connectionId`.

---

## Standard Stack

### Core (already installed — no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js `child_process` | built-in (Node 22) | Spawn dump tools, capture stdout/stderr | Security: args as array prevents shell injection |
| Node.js `crypto` | built-in | SHA-256 hash computation | No dependency, built into runtime |
| Node.js `fs/promises` + `fs` | built-in | Write backup file, stat for size | Streaming write via `createWriteStream` |
| Node.js `stream` `Readable.toWeb()` | built-in (Node 18+) | Convert Node Readable → Web ReadableStream | Required by Next.js Route Handler Response |
| Prisma 7.x | `^7.6.0` (installed) | BackupHistory model, migrations | Already in project |
| Next.js 15 Route Handler | `15.5.14` (installed) | SSE endpoint + file download endpoint | Native support, no Socket.io needed |
| shadcn/ui Dialog + Progress | installed | Backup progress modal | Matches Phase 1 modal pattern |
| date-fns | `^4.1.0` (installed) | Filename timestamp formatting | Already in project |

### Supporting (no new installs needed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Lucide React | `^1.7.0` (installed) | Icons: Play, Download, CheckCircle, XCircle | Backup button, history status indicators |
| sonner | `^2.0.7` (installed) | Toast notifications for backup start/fail | Matches existing error toast pattern |
| react-hook-form + zod | installed | Backup confirmation dialog validation (if needed) | Only if confirmation has form fields |

### What NOT to Install

| Skip | Reason |
|------|--------|
| socket.io | D-04 locked SSE; socket.io requires custom server.ts — adds complexity |
| node-cron | Phase 3 only (scheduled backup) |
| BullMQ / Redis | Phase 3+ only; overkill for single-server manual backup |
| multer / formidable | No file upload in this phase |

**Installation:** No new packages required. All dependencies already installed.

---

## Architecture Patterns

### Recommended Directory Structure

```
src/
├── app/
│   ├── (app)/
│   │   ├── backup-history/
│   │   │   └── page.tsx                  # HIST-01: history list page
│   │   └── connections/
│   │       └── page.tsx                  # existing — add backup button to cards
│   └── api/
│       ├── backups/
│       │   └── route.ts                  # POST: trigger backup, returns jobId
│       ├── backups/[jobId]/stream/
│       │   └── route.ts                  # GET: SSE stream for progress
│       └── backup-history/
│           ├── route.ts                  # GET: list history with filters
│           └── [id]/
│               ├── route.ts              # GET: detail, DELETE: remove record
│               └── download/
│                   └── route.ts          # GET: stream file download
├── lib/
│   ├── backup-engine.ts                  # core: spawn + stream + hash + save
│   ├── backup-tools.ts                   # per-DB spawn args builder
│   └── backup-store.ts                   # globalThis in-progress Set
components/
├── backup/
│   ├── BackupProgressModal.tsx           # D-06: modal with log stream + progress bar
│   └── BackupHistoryTable.tsx            # D-08/09: filterable history table
│   └── BackupDetailPanel.tsx             # D-10/11/12: side panel with log, download, hash
```

### Pattern 1: SSE Route Handler with Spawn

The critical rule: **start background work inside `ReadableStream` `start()`, return the Response immediately.**

```typescript
// src/app/api/backups/[jobId]/stream/route.ts
// Source: Next.js Route Handlers docs + Next.js Discussion #50614

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        const line = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(line))
      }

      // abort detection — client disconnected
      request.signal.addEventListener('abort', () => {
        controller.close()
      })

      try {
        // runBackup streams progress events via send(), writes file, computes hash
        await runBackup(params.jobId, send)
        send('complete', { status: 'success' })
      } catch (err) {
        send('error', { message: (err as Error).message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',   // prevents nginx buffering
    },
  })
}
```

### Pattern 2: Backup Engine — child_process.spawn per DB Type

```typescript
// src/lib/backup-tools.ts
// Source: CLAUDE.md stack decisions + Node.js child_process docs

import { spawn } from 'child_process'
import { createWriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import path from 'path'

// Per-DB spawn strategy — args ALWAYS as array, never string interpolation
function buildSpawnArgs(conn: DecryptedConnection): { cmd: string; args: string[] } {
  switch (conn.type) {
    case 'mysql':
    case 'mariadb':
      return {
        cmd: 'mysqldump',
        args: ['-h', conn.host, '-P', String(conn.port), '-u', conn.username,
               `--password=${conn.password}`, conn.database],
      }
    case 'postgresql':
      return {
        cmd: 'pg_dump',
        args: ['-h', conn.host, '-p', String(conn.port), '-U', conn.username,
               '-F', 'c',   // custom format (compressed)
               conn.database],
      }
    case 'sqlserver':
      // sqlcmd executes T-SQL; BACKUP DATABASE writes to server-side path
      // stdout is status messages only — not the backup file itself
      return {
        cmd: 'sqlcmd',
        args: ['-S', `${conn.host},${conn.port}`, '-U', conn.username,
               '-P', conn.password,
               '-Q', `BACKUP DATABASE [${conn.database}] TO DISK='${outputPath}'`],
      }
    case 'oracle':
      // expdp writes to Oracle DATA_PUMP_DIR on the DB server — not local stdout
      // Must use DIRECTORY parameter pointing to pre-created Oracle directory object
      return {
        cmd: 'expdp',
        args: [`${conn.username}/${conn.password}@${conn.host}:${conn.port}/${conn.sid || conn.serviceName}`,
               `DIRECTORY=DATA_PUMP_DIR`, `DUMPFILE=${dumpFile}`, `LOGFILE=${logFile}`],
      }
    case 'sqlite':
      return {
        cmd: 'sqlite3',
        args: [conn.filePath, '.dump'],  // dumps SQL to stdout
      }
  }
}
```

### Pattern 3: File Write + SHA-256 Computation

```typescript
// src/lib/backup-engine.ts (excerpt)
// Source: Node.js crypto docs + Node.js stream docs

import { createHash } from 'crypto'
import { createWriteStream } from 'fs'
import { stat } from 'fs/promises'
import { Readable } from 'stream'

async function writeAndHash(
  nodeReadable: Readable,
  outputPath: string
): Promise<{ sha256: string; fileSizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const writeStream = createWriteStream(outputPath)

    nodeReadable.on('data', (chunk) => hash.update(chunk))
    nodeReadable.on('error', reject)
    writeStream.on('error', reject)
    writeStream.on('finish', async () => {
      const { size } = await stat(outputPath)
      resolve({ sha256: hash.digest('hex'), fileSizeBytes: size })
    })

    nodeReadable.pipe(writeStream)
  })
}
```

### Pattern 4: File Download — Node Readable → Web ReadableStream

```typescript
// src/app/api/backup-history/[id]/download/route.ts
// Source: Node.js stream.Readable.toWeb() (Node 18+, used on Node 22 here)

import { createReadStream } from 'fs'
import { Readable } from 'stream'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  // ... auth, fetch BackupHistory record, verify file exists ...
  const nodeStream = createReadStream(record.filePath)
  const webStream = Readable.toWeb(nodeStream) as ReadableStream

  return new Response(webStream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${record.fileName}"`,
      'Content-Length': String(record.fileSizeBytes),
    },
  })
}
```

### Pattern 5: Concurrency Lock — globalThis Set

Next.js hot-reload creates new module instances but `globalThis` persists across them in a single Node.js process.

```typescript
// src/lib/backup-store.ts
// Source: Next.js Discussion #55263 (singleton across route handlers)

declare global {
  var _backupInProgress: Set<string> | undefined
}

export const inProgressSet: Set<string> =
  globalThis._backupInProgress ?? (globalThis._backupInProgress = new Set())

export function isBackupRunning(connectionId: string): boolean {
  return inProgressSet.has(connectionId)
}

export function lockBackup(connectionId: string): void {
  inProgressSet.add(connectionId)
}

export function unlockBackup(connectionId: string): void {
  inProgressSet.delete(connectionId)
}
```

### Pattern 6: Backup File Naming (BKUP-06, Claude's Discretion)

Recommended format (sortable, filesystem-safe):
```
backups/
└── {connectionId}/
    └── {dbName}_{YYYYMMDD}_{HHmmss}.{ext}

Examples:
  backups/clj3x1.../mydb_20260329_143022.sql        (MySQL/SQLite)
  backups/clj3x1.../mydb_20260329_143022.dump       (PostgreSQL custom format)
  backups/clj3x1.../mydb_20260329_143022.bak        (SQL Server)
  backups/clj3x1.../mydb_20260329_143022.dmp        (Oracle)
```

Base directory: `process.env.BACKUP_BASE_DIR ?? path.join(process.cwd(), 'backups')`

Add `BACKUP_BASE_DIR` to `.env.example`. The directory is created with `mkdir(dir, { recursive: true })` before spawn.

### Pattern 7: Prisma Schema Extension (Claude's Discretion)

```prisma
enum BackupStatus {
  running
  success
  failed
}

model BackupHistory {
  id              String        @id @default(cuid())
  connectionId    String
  connectionName  String        // denormalized — preserve name if connection deleted
  dbType          DbType
  status          BackupStatus
  fileName        String?       // null while running
  filePath        String?       // absolute server path
  fileSizeBytes   BigInt?       // null while running
  sha256          String?       // null while running or on failure
  durationMs      Int?          // null while running
  fullLog         String?       // accumulated stdout+stderr
  errorMessage    String?       // set on failure
  startedAt       DateTime      @default(now())
  completedAt     DateTime?

  connection      DbConnection  @relation(fields: [connectionId], references: [id], onDelete: SetNull)

  @@index([connectionId])
  @@index([status])
  @@index([startedAt])
}
```

Add `backupHistory BackupHistory[]` relation to `DbConnection`.

Add to `AuditEventType` enum:
```prisma
BACKUP_START
BACKUP_COMPLETE
BACKUP_FAIL
```

### Pattern 8: SSE Event Protocol (Claude's Discretion)

| Event Type | Payload | When |
|-----------|---------|------|
| `started` | `{ historyId, connectionName, dbType }` | Immediately on spawn |
| `log` | `{ line: string, source: 'stdout'\|'stderr' }` | Each stdout/stderr chunk |
| `progress` | `{ stage: 'started'\|'running'\|'finalizing' }` | Stage transitions |
| `complete` | `{ historyId, fileSizeBytes, durationMs, sha256 }` | On success |
| `error` | `{ message: string }` | On failure |

### Anti-Patterns to Avoid

- **Await before returning Response in SSE handler:** Next.js will buffer the entire stream. Start work in `ReadableStream.start()`, return Response immediately.
- **Shell string interpolation in spawn:** Use `spawn(cmd, [arg1, arg2])` array form exclusively — never `exec('mysqldump ' + host)`. This is a locked CLAUDE.md constraint.
- **Storing encryption key in DB:** Key stays in `ENCRYPTION_KEY` env var only (existing pattern).
- **Synchronous hash computation on large files:** Always use streaming `createHash` with `.update()` per chunk — never `readFileSync` + `createHash`.
- **pg_dump password via args:** PostgreSQL rejects password as CLI arg. Use `PGPASSWORD` env var injected into spawn `env` option.
- **Blocking the event loop on spawn:** `spawn()` is non-blocking; the child process runs in OS process, not Node.js event loop.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DB password in pg_dump | Passing `-W` flag with password | `PGPASSWORD` env var in spawn options | pg_dump ignores password CLI arg on non-interactive |
| SHA-256 of large files | Read whole file into Buffer | `createHash` + stream `.update()` | Memory safety for GB-sized dumps |
| Node stream → Web stream | Manual chunk forwarding | `Readable.toWeb(nodeStream)` | Built into Node 18+, no dep needed |
| SSE keep-alive | setInterval ping | HTTP keep-alive header + `X-Accel-Buffering: no` | Header approach cleaner, no timer management |
| Concurrency mutex library | async-mutex npm | `globalThis Set` keyed by connectionId | Zero dependency, sufficient for single-server |

**Key insight:** This phase has zero new npm dependencies required — every building block (spawn, crypto, fs, stream, Readable.toWeb) is built into Node.js 22.

---

## Oracle and SQL Server — Special Handling

This is the blocker flagged in STATE.md. Research findings:

### Oracle `expdp`
- `expdp` writes to an Oracle **server-side directory** (`DATA_PUMP_DIR`), NOT to stdout
- The backup file is on the **Oracle server**, not the Next.js server
- stdout from `expdp` is progress messages (%) — this can be captured for log lines
- **Phase 2 approach:** Capture stdout as log lines, treat completion (exit code 0) as success; the "file" stored in BackupHistory is the Oracle server path, not a local file
- Download (HIST-03) is **not applicable** for Oracle expdp in this phase — display a note in the UI
- `filePath` and `sha256` will be null for Oracle backups; `fileName` records the Oracle dump file name

### SQL Server `sqlcmd` + `BACKUP DATABASE`
- `BACKUP DATABASE ... TO DISK` writes to a **server-side path** on the SQL Server machine
- For local SQL Server instances (same machine), the path IS accessible
- stdout from `sqlcmd` contains "N percent processed" messages — useful for progress
- **Phase 2 approach:** Same as Oracle — log stdout, treat exit 0 as success, note that download applies only when SQL Server is on the same machine as the app

### Practical per-DB streaming capability

| DB Type | stdout streams backup data | Progress from stdout | Download viable |
|---------|---------------------------|---------------------|-----------------|
| MySQL / MariaDB | Yes (mysqldump) | Partial (row-count lines) | Yes |
| PostgreSQL | Yes (pg_dump) | Minimal (progress to stderr with `-v`) | Yes |
| SQLite | Yes (sqlite3 .dump) | No (instant dump) | Yes |
| SQL Server | No (writes to disk) | Yes ("N percent processed") | Only if local |
| Oracle | No (writes to DATA_PUMP_DIR) | Yes (% complete lines) | No (Oracle server path) |

---

## Common Pitfalls

### Pitfall 1: Next.js SSE Buffering
**What goes wrong:** The entire SSE stream is sent at once after the route handler returns, not incrementally.
**Why it happens:** Next.js awaits the handler's returned Promise before sending the Response. If you do `await runBackup()` then `return new Response(stream)`, Next.js has already resolved the stream before the Response is sent.
**How to avoid:** Put all async work inside `new ReadableStream({ async start(controller) { ... } })`. The `start()` callback runs after the Response is returned to the HTTP layer.
**Warning signs:** Client receives all SSE events simultaneously at the end of backup.

### Pitfall 2: PostgreSQL PGPASSWORD Not Set
**What goes wrong:** `pg_dump` hangs waiting for interactive password prompt, or fails with authentication error.
**Why it happens:** Unlike mysqldump's `--password=X`, pg_dump requires `PGPASSWORD` env var for non-interactive use.
**How to avoid:** Pass `{ env: { ...process.env, PGPASSWORD: decryptedPassword } }` as third arg to `spawn()`.
**Warning signs:** Spawn hangs indefinitely (no stdout/stderr output, no exit).

### Pitfall 3: `Readable.toWeb()` Not Closed on Error
**What goes wrong:** File download stream hangs browser if the file is missing or read errors mid-stream.
**Why it happens:** Error events on the Node Readable don't automatically propagate to the Web ReadableStream error state.
**How to avoid:** Listen for `'error'` on the Node Readable before calling `toWeb()`, or wrap in try/catch and cancel the stream.
**Warning signs:** Browser download progress stalls indefinitely.

### Pitfall 4: globalThis Set Leak on Crash
**What goes wrong:** If the server process crashes mid-backup, the `connectionId` remains in `inProgressSet`, permanently blocking future backups for that connection until server restart.
**Why it happens:** The `finally { unlockBackup() }` block never runs on hard crash.
**How to avoid:** On server startup, query `BackupHistory` for any `status: 'running'` records and mark them as `failed` (orphaned backup recovery). Also clear the in-progress Set on startup.
**Warning signs:** Backup button permanently stuck in "백업 중..." state after server restart.

### Pitfall 5: `BigInt` Serialization in JSON
**What goes wrong:** `JSON.stringify({ fileSizeBytes: 123n })` throws `TypeError: Do not know how to serialize a BigInt`.
**Why it happens:** Prisma uses `BigInt` for the `fileSizeBytes` field; JSON.stringify doesn't handle BigInt natively.
**How to avoid:** Convert to `Number` or `String` before sending to client: `Number(record.fileSizeBytes)` (safe for files up to 2^53 bytes = 8 PB).
**Warning signs:** API route crashes with TypeError on history list endpoint.

### Pitfall 6: Prisma `onDelete` Cascade Behavior
**What goes wrong:** Deleting a connection cascades and removes all its BackupHistory records (and physical files stay orphaned on disk).
**Why it happens:** Default Prisma relation behavior.
**How to avoid:** Use `onDelete: SetNull` on the `BackupHistory.connectionId` relation. The `connectionName` field (denormalized) preserves the name. Physical files are NOT deleted on connection deletion — document this.
**Warning signs:** History records disappear after connection is deleted.

### Pitfall 7: `X-Accel-Buffering: no` Missing
**What goes wrong:** SSE events are buffered by nginx/reverse proxy and delivered in batches.
**Why it happens:** nginx buffers upstream responses by default.
**How to avoid:** Add `'X-Accel-Buffering': 'no'` response header. For development (direct Next.js), not strictly required but harmless.
**Warning signs:** SSE works in dev but not in production behind nginx.

---

## Code Examples

### SSE Client-Side Connection Pattern

```typescript
// src/components/backup/BackupProgressModal.tsx (client component)
function startSSE(jobId: string, onEvent: (type: string, data: unknown) => void) {
  const es = new EventSource(`/api/backups/${jobId}/stream`)

  es.addEventListener('log', (e) => onEvent('log', JSON.parse(e.data)))
  es.addEventListener('progress', (e) => onEvent('progress', JSON.parse(e.data)))
  es.addEventListener('complete', (e) => { onEvent('complete', JSON.parse(e.data)); es.close() })
  es.addEventListener('error', (e) => { onEvent('error', JSON.parse((e as MessageEvent).data ?? '{}')); es.close() })

  // Fallback: close if connection drops
  es.onerror = () => es.close()

  return () => es.close()  // cleanup function
}
```

### Backup Trigger API — POST /api/backups

```typescript
// POST creates a BackupHistory record (status: 'running'), locks connectionId,
// returns { jobId } immediately — SSE stream is separate request
export async function POST(request: Request) {
  const session = await auth()
  // ... auth check: operator or admin only ...

  const { connectionId } = await request.json()

  if (isBackupRunning(connectionId)) {
    return NextResponse.json({ error: '이미 백업이 실행 중입니다' }, { status: 409 })
  }

  const record = await prisma.backupHistory.create({
    data: { connectionId, connectionName: conn.name, dbType: conn.type, status: 'running', startedAt: new Date() }
  })

  lockBackup(connectionId)

  // Fire-and-forget: actual backup runs when client opens SSE stream
  // The jobId IS the historyId
  return NextResponse.json({ data: { jobId: record.id } })
}
```

### Startup Orphan Recovery

```typescript
// src/lib/backup-store.ts — call once from server startup or first API request
export async function recoverOrphanedBackups() {
  const orphans = await prisma.backupHistory.findMany({
    where: { status: 'running' }
  })
  for (const orphan of orphans) {
    await prisma.backupHistory.update({
      where: { id: orphan.id },
      data: { status: 'failed', errorMessage: '서버 재시작으로 인해 중단됨', completedAt: new Date() }
    })
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| WebSocket for server→client streaming | SSE (EventSource) for unidirectional streams | No custom server needed; works in Next.js Route Handler |
| `exec()` with string interpolation | `spawn()` with args array | Shell injection prevention |
| `fs.readFileSync` + hash | Streaming `createHash` with `.update()` | Memory-safe for large files |
| Node Readable piped to res directly | `Readable.toWeb()` → Web ReadableStream | Required by Next.js App Router Response API |
| Global variable for singleton | `globalThis._var ?? (globalThis._var = ...)` | Survives Next.js hot-reload module re-evaluation |

**Deprecated/outdated:**
- `res.writeHead()` + `res.write()` + `req.pipe()`: Pages Router pattern — does NOT work in App Router Route Handlers
- `exec()` for subprocess: Unsafe for any user-influenced data; replaced by `spawn()` array args

---

## Open Questions

1. **Oracle backup file location**
   - What we know: `expdp` writes to Oracle `DATA_PUMP_DIR` on the Oracle server, not stdout
   - What's unclear: Whether the Oracle server is co-located with the Next.js server in this deployment
   - Recommendation: Store Oracle dump path in `filePath` field as Oracle server path; skip download feature for Oracle in Phase 2; show a note in UI: "Oracle 백업 파일은 DB 서버에 저장됩니다"

2. **SQL Server local vs. remote backup path**
   - What we know: `BACKUP DATABASE TO DISK` writes to the SQL Server machine's filesystem
   - What's unclear: Whether SQL Server runs on the same host as the Next.js app in this project
   - Recommendation: Same treatment as Oracle — log progress, skip download; note in UI

3. **Backup base directory ownership/permissions**
   - What we know: `process.cwd()` in production Next.js may be read-only in some deployment environments
   - Recommendation: Require `BACKUP_BASE_DIR` to be explicitly set in production `.env`; add to `.env.example`

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 22 | `Readable.toWeb()`, `crypto`, `child_process` | Yes | v22.19.0 | — |
| mysqldump | BKUP-02 MySQL/MariaDB | Not detected | — | Skip MySQL backup, show "도구 미설치" error |
| pg_dump | BKUP-02 PostgreSQL | Not detected | — | Skip PostgreSQL backup |
| sqlite3 CLI | BKUP-02 SQLite | Not detected | — | Skip SQLite backup |
| sqlcmd | BKUP-02 SQL Server | Yes | found at /c/Program Files/Microsoft SQL Server/100/Tools/Binn/ | — |
| expdp / Oracle | BKUP-02 Oracle | Not detected | — | Skip Oracle backup |
| PostgreSQL server | App database | Not probed | — | Required (Phase 1 prereq) |

**Missing dependencies with no fallback:**
- None that block the phase — missing dump tools are a runtime/deployment concern, not a dev concern. The backup engine should check tool availability at backup execution time and return a clear error if the tool is missing.

**Missing dependencies with fallback:**
- mysqldump, pg_dump, sqlite3, expdp: Not installed on dev machine. Test with available tools (sqlcmd confirmed). Implement graceful error handling: check `command -v <tool>` equivalent via `which`/`where` before spawning.

**Note:** dump tool availability is a deployment-time concern. The code should detect missing tools gracefully and surface a clear Korean error message: `"백업 도구를 찾을 수 없습니다: mysqldump"`.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 2 |
|-----------|-------------------|
| `child_process.spawn()` with args array — never `exec()` with string interpolation | All dump tool invocations use `spawn(cmd, [arg1, arg2, ...])` |
| AES-256-GCM encryption — key in env var only | `decrypt()` from `src/lib/crypto.ts` used to get plaintext password before spawn |
| Next.js App Router + TypeScript | Route Handlers at `src/app/api/...`, no Pages Router patterns |
| Tailwind CSS + shadcn/ui | Progress modal uses shadcn `Dialog`, `Progress`, no custom CSS |
| Korean UI messages | All error/status text in Korean |
| 2-space indentation, server-side semicolons | Follow existing code style in all new files |
| `auth()` + role check in every API route | Backup trigger: `operator` or `admin` only; history GET: all roles; download: all roles |
| Audit failures silently caught | `createAuditLog` wrapped in try/catch, never propagates |
| Prisma `Prisma.JsonNull` for nullable Json fields | Use `Prisma.JsonNull` sentinel if any Json fields added to BackupHistory |

---

## Sources

### Primary (HIGH confidence)
- Node.js v22 docs — `child_process.spawn()`, `crypto.createHash()`, `stream.Readable.toWeb()`, `fs.createWriteStream()`
- Next.js 15 Route Handler docs — `export const dynamic = 'force-dynamic'`, Response with ReadableStream
- Prisma 7.x docs — schema relations, `onDelete: SetNull`, BigInt type
- Existing codebase — `src/lib/crypto.ts`, `src/lib/audit.ts`, `src/app/api/connections/route.ts` (confirmed patterns)

### Secondary (MEDIUM confidence)
- [Next.js Discussion #50614](https://github.com/vercel/next.js/discussions/50614) — ReadableStream in API route, confirmed pattern
- [Next.js Discussion #55263](https://github.com/vercel/next.js/discussions/55263) — singleton via globalThis, confirmed approach
- [Real-Time Notifications with SSE in Next.js](https://www.pedroalonso.net/blog/sse-nextjs-real-time-notifications/) — SSE headers and event format
- [Streaming in Next.js 15: WebSockets vs SSE](https://www.rickyspears.com/technology/streaming-in-next-js-15-websockets-vs-server-sent-events-a-comprehensive-guide/) — comparative analysis
- [Upstash Blog — SSE Streaming LLM Responses](https://upstash.com/blog/sse-streaming-llm-responses) — force-dynamic + ReadableStream start() pattern

### Tertiary (LOW confidence — needs validation)
- Oracle `expdp` server-side file path behavior: confirmed from oracle-base.com docs pattern; actual deployment path depends on Oracle DBA configuration
- SQL Server `BACKUP DATABASE TO DISK` local-vs-remote: confirmed from sqlcmd documentation; download viability depends on deployment topology

---

## Metadata

**Confidence breakdown:**
- SSE in Next.js App Router: HIGH — confirmed pattern in multiple sources + official docs
- child_process.spawn backup: HIGH — locked in CLAUDE.md, standard Node.js
- Prisma schema extension: HIGH — existing schema well-understood, standard relations
- Oracle/SQL Server streaming: MEDIUM — behavior confirmed, deployment topology unknown
- globalThis singleton: HIGH — confirmed Next.js pattern

**Research date:** 2026-03-29
**Valid until:** 2026-04-29 (30 days — stable stack)
