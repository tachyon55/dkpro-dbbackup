# Architecture Research: Database Backup Manager Web App

**Researched:** 2026-03-28
**Confidence:** HIGH

## Component Boundaries

| Component | Location | Responsibility | Talks To |
|-----------|----------|---------------|----------|
| **UI Layer** | `src/app/` (Next.js pages) | Dashboard, connection forms, backup history, query executor | API Routes, WebSocket |
| **API Routes** | `src/app/api/` | REST endpoints for CRUD, backup triggers, auth | Prisma, Backup Service, Crypto |
| **Auth Middleware** | `src/lib/auth.ts` | Session validation, RBAC enforcement | NextAuth, PostgreSQL |
| **Backup Service** | `src/lib/services/backup.ts` | Orchestrates dump tool execution, file management | child_process, Storage, DB Drivers |
| **Scheduler Service** | `src/lib/services/scheduler.ts` | Cron-based job triggering, due-check logic | Backup Service, Prisma |
| **WebSocket Server** | `server.ts` (custom) | Real-time progress broadcasting, room management | Socket.io, Backup Service |
| **DB Driver Abstraction** | `src/lib/drivers/` | Per-DB connection test, database listing | mysql2, pg, mssql, oracledb, better-sqlite3 |
| **Crypto Service** | `src/lib/services/crypto.ts` | AES-256-GCM encrypt/decrypt credentials | Node.js crypto |
| **Storage Service** | `src/lib/services/storage.ts` | Local file management + S3 upload | fs, @aws-sdk/client-s3 |
| **Notification Service** | `src/lib/services/notification.ts` | Email/Slack alerts on backup events | Nodemailer, @slack/web-api |
| **App Database** | PostgreSQL | Users, connections, schedules, backup history, audit log | Prisma |

## Data Flow Diagrams

### Manual Backup Flow

```
User clicks "지금 백업"
  → POST /api/backups (connectionId)
  → Auth middleware (session + RBAC check)
  → Backup Service
      → Decrypt credentials (Crypto Service)
      → Resolve dump command (DB Driver Abstraction)
      → child_process.spawn(mysqldump/pg_dump/...)
      → Stream stdout → backup file (Storage Service)
      → WebSocket: emit progress to user's room
      → On complete: save BackupHistory to DB (Prisma)
      → Notification Service (if configured)
  → Response: { backupId, status: "started" }
```

### Scheduled Backup Flow

```
node-cron fires every minute
  → Scheduler Service: query due schedules (Prisma)
  → For each due schedule:
      → Check: not already running (concurrency guard)
      → Backup Service.execute(connection, schedule)
      → Same flow as Manual Backup
      → Update schedule.lastBackupTime (Prisma)
```

### Connection Test Flow

```
User clicks "연결 테스트"
  → POST /api/connections/test (host, port, user, password, dbType)
  → DB Driver Abstraction: create temp connection
  → Execute lightweight query (SELECT 1)
  → Return success/failure + latency
```

### Query Execution Flow

```
User submits SQL in Query Executor
  → POST /api/queries/execute (connectionId, sql)
  → Auth middleware (RBAC: operator+ only)
  → Decrypt credentials (Crypto Service)
  → DB Driver Abstraction: create connection
  → Execute query (SELECT → rows, DML → affected count)
  → Return results (with execution time)
```

### Real-time Progress Flow

```
Backup Service (during spawn)
  → child_process stdout/stderr events
  → Calculate progress (bytes written / estimated size)
  → WebSocket: io.to(`backup:${connectionId}`).emit('progress', { percent, bytesWritten })
  → On complete: emit('complete', { backupId, success, fileSize, duration })
  → On error: emit('error', { backupId, errorMessage })

Client (React component)
  → socket.join(`backup:${connectionId}`)
  → Listen: 'progress', 'complete', 'error'
  → Update UI state in real-time
```

## Patterns to Follow

### 1. Job Queue Separation
백업 실행은 API 요청-응답 사이클과 분리. API는 "시작됨"을 즉시 반환하고, 실제 실행은 별도 프로세스/워커에서 처리. WebSocket으로 진행 상황 전달.

### 2. spawn() not exec()
Shell injection 방지를 위해 반드시 `child_process.spawn()` 사용. 인자를 배열로 전달하여 셸 해석 차단.

```typescript
// GOOD
spawn('mysqldump', ['-h', host, '-P', String(port), '-u', user, `--password=${password}`, dbName])

// BAD - shell injection possible
exec(`mysqldump -h ${host} -u ${user} -p${password} ${dbName}`)
```

### 3. AES-256 Envelope Encryption
비밀번호 암호화 시 IV + AuthTag + Ciphertext를 함께 저장. 키는 환경변수에서만 로드.

### 4. Per-DB Driver Abstraction
공통 인터페이스로 DB 타입별 로직 격리:

```typescript
interface DatabaseDriver {
  testConnection(config: ConnectionConfig): Promise<boolean>
  listDatabases(config: ConnectionConfig): Promise<string[]>
  executeQuery(config: ConnectionConfig, sql: string): Promise<QueryResult>
  getDumpCommand(config: ConnectionConfig): { command: string; args: string[] }
}
```

### 5. WebSocket Room Scoping
백업 진행률을 해당 연결의 room에만 브로드캐스트. 다른 사용자의 민감한 정보 노출 방지.

### 6. Append-Only Backup History
백업 히스토리는 수정/삭제 없이 append-only. 감사(audit) 목적.

## Anti-Patterns to Avoid

| Anti-Pattern | Why | Instead |
|-------------|-----|---------|
| Backup 실행을 API handler 안에서 await | 타임아웃, 메모리 문제 | 비동기 시작 후 WebSocket으로 결과 전달 |
| 모든 DB 타입을 하나의 함수에서 처리 | 유지보수 불가 | Driver 인터페이스로 분리 |
| 백업 파일을 메모리에 로드 | OOM 크래시 (GB 단위 가능) | Stream으로 직접 파일에 기록 |
| exec()로 dump 명령 실행 | Shell injection 취약점 | spawn() + 인자 배열 |
| WebSocket 인증 없이 사용 | 무인가 접근 | Socket.io middleware에서 JWT/session 검증 |
| 환경변수 없이 암호화 키 하드코딩 | 키 유출 | ENCRYPTION_KEY 환경변수 |

## Suggested Build Order

| Tier | Components | Phase Implication |
|------|-----------|-------------------|
| 1. Foundation | Next.js 프로젝트 설정, PostgreSQL + Prisma 스키마, Auth (NextAuth + RBAC) | Phase 1 |
| 2. Core Data | Connection CRUD, Crypto Service, DB Driver Abstraction, Connection Test | Phase 1-2 |
| 3. Backup Engine | Backup Service, Storage Service, WebSocket 진행률, Backup History | Phase 2 |
| 4. Automation | Scheduler Service, Retention Cleanup, Notifications | Phase 3 |
| 5. Tools & Polish | Query Executor, Saved Queries, Dashboard, Cloud Storage Upload | Phase 3-4 |

## Scalability Notes

- **단일 서버 배포 (초기):** node-cron + in-process backup workers로 충분
- **멀티 인스턴스 (향후):** BullMQ + Redis로 job queue 분리, 스케줄러는 리더 선출 필요
- **대용량 백업:** spawn stdout을 직접 파일로 pipe, 메모리 사용 최소화
- **Docker 배포:** mysqldump, pg_dump 등 네이티브 도구를 Dockerfile에 포함 필수

## Next.js + WebSocket 제약

Next.js App Router는 네이티브 WebSocket을 지원하지 않음. 커스텀 HTTP 서버(`server.ts`)가 필요:

```typescript
// server.ts
import { createServer } from 'http'
import next from 'next'
import { Server } from 'socket.io'

const app = next({ dev })
const server = createServer(app.getRequestHandler())
const io = new Server(server)
```

이 패턴은 `next start` 대신 `node server.ts`로 실행해야 함.
