# Stack Research: Database Backup Manager Web App

**Researched:** 2026-03-28
**Confidence:** HIGH (established technologies, well-documented)

## Core Framework

| Component | Choice | Version | Rationale | Confidence |
|-----------|--------|---------|-----------|------------|
| Framework | Next.js (App Router) | 15.x | SSR + API Routes 통합, React 생태계 | HIGH |
| Language | TypeScript | 5.x | 타입 안전성, Prisma 통합 | HIGH |
| UI | React | 19.x | Next.js 내장 | HIGH |
| Styling | Tailwind CSS | 4.x | 유틸리티 퍼스트, 빠른 개발 | HIGH |
| Components | shadcn/ui | latest | 복사-붙여넣기 방식, 완전 커스터마이징 가능 | HIGH |

## App Database

| Component | Choice | Version | Rationale | Confidence |
|-----------|--------|---------|-----------|------------|
| Database | PostgreSQL | 16 | 클라우드 배포 최적, 프로덕션급, JSON 지원 | HIGH |
| ORM | Prisma | 5.x | 타입 안전한 쿼리, 마이그레이션 관리, 스키마 퍼스트 | HIGH |

## Authentication & Authorization

| Component | Choice | Version | Rationale | Confidence |
|-----------|--------|---------|-----------|------------|
| Auth | NextAuth.js (Auth.js) | v5 | Next.js 네이티브 통합, Credentials + OAuth | HIGH |
| Password Hash | bcryptjs | 2.x | 순수 JS, 네이티브 의존성 없음 | HIGH |
| RBAC | Custom middleware | - | NextAuth session에 role 포함, middleware에서 검증 | MEDIUM |

**RBAC 패턴:** `admin` (모든 권한), `operator` (백업 실행/조회), `viewer` (읽기 전용)

## Real-time Communication

| Component | Choice | Version | Rationale | Confidence |
|-----------|--------|---------|-----------|------------|
| WebSocket | Socket.io | 4.x | 양방향 통신, 자동 재연결, room 기반 스코핑 | HIGH |
| Server | Custom HTTP server | - | Next.js + Socket.io 통합 위해 커스텀 서버 필요 | HIGH |

**왜 SSE가 아닌가:** 백업 진행률은 서버→클라이언트 단방향이라 SSE로 충분해 보이지만, 백업 취소 요청(클라이언트→서버), 다중 사용자 room 관리 등 양방향이 필요. Socket.io의 자동 재연결과 room 기능이 결정적.

## Job Scheduling & Queue

| Component | Choice | Version | Rationale | Confidence |
|-----------|--------|---------|-----------|------------|
| Scheduler | node-cron | 3.x | 경량, cron 표현식 지원, 단일 서버에 적합 | HIGH |
| Job Queue | BullMQ (선택) | 5.x | Redis 기반, 재시도/동시성 제어 — 스케일 필요시 | MEDIUM |

**결정 기준:** 단일 서버 배포면 node-cron으로 충분. 멀티 인스턴스 배포 시 BullMQ로 전환.

## Multi-DB Drivers (Target Database Connections)

| DB Type | Driver | Version | Notes | Confidence |
|---------|--------|---------|-------|------------|
| MySQL/MariaDB | mysql2 | 3.x | Promise 지원, 성능 우수 | HIGH |
| PostgreSQL | pg | 8.x | 가장 성숙한 Node.js PG 드라이버 | HIGH |
| SQL Server | mssql | 11.x | tedious 기반, Windows 인증 지원 | HIGH |
| Oracle | oracledb | 6.x | Oracle Instant Client 필요 ⚠️ | MEDIUM |
| SQLite | better-sqlite3 | 11.x | 동기식, 빠름, 파일 기반 | HIGH |

**⚠️ Oracle 주의:** `oracledb`는 Oracle Instant Client 바이너리 필요. Docker 배포 시 별도 설치 레이어 필수.

## Backup Execution

| Component | Choice | Rationale | Confidence |
|-----------|--------|-----------|------------|
| Process spawn | `child_process.spawn()` | `exec()`가 아닌 `spawn()` — 셸 인젝션 방지, 스트리밍 출력 | HIGH |
| Dump tools | mysqldump, pg_dump, sqlcmd, exp/expdp, sqlite3 | 각 DB 네이티브 도구, 서버에 사전 설치 필요 | HIGH |

## Credential Encryption

| Component | Choice | Rationale | Confidence |
|-----------|--------|-----------|------------|
| Algorithm | AES-256-GCM | Node.js crypto 내장, 인증된 암호화 (무결성 검증 포함) | HIGH |
| Key management | 환경변수 (`ENCRYPTION_KEY`) | 코드/DB에서 분리, 32바이트 hex | HIGH |
| Storage format | `iv:authTag:ciphertext` (Base64) | IV와 인증 태그를 함께 저장 | HIGH |

## Cloud Storage

| Component | Choice | Version | Rationale | Confidence |
|-----------|--------|---------|-----------|------------|
| S3 Client | @aws-sdk/client-s3 | v3 | AWS S3 + S3 호환 서비스(NCP, MinIO 등) | HIGH |
| Upload | Multipart upload | - | 대용량 백업 파일 지원 | HIGH |

## Notifications

| Component | Choice | Version | Rationale | Confidence |
|-----------|--------|---------|-----------|------------|
| Email | Nodemailer | 6.x | SMTP 지원, 가장 성숙한 Node.js 메일 라이브러리 | HIGH |
| Slack | @slack/web-api | 7.x | 공식 SDK, Incoming Webhook보다 유연 | HIGH |

## Dev Tooling

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Validation | Zod | 런타임 + 타입 검증 통합, Prisma/React Hook Form 호환 |
| Forms | React Hook Form | 성능 우수, Zod resolver 지원 |
| Linting | ESLint + Prettier | Next.js 기본 포함 |
| Date | date-fns | 트리셰이킹 가능, 경량 |

## What NOT to Use

| Technology | Why NOT |
|-----------|---------|
| Express.js | Next.js API Routes로 충분, 별도 Express 불필요 (WebSocket 커스텀 서버는 예외) |
| Sequelize | Prisma가 타입 안전성, DX 모두 우수 |
| Mongoose/MongoDB | 관계형 데이터(connections, schedules, users)에 부적합 |
| Redis (초기) | 단일 서버 배포에서는 불필요, BullMQ 도입 시에만 |
| Electron | 웹앱으로 마이그레이션이 목적 |
| tRPC | API Routes + Zod로 충분, 추가 복잡성 불필요 |
