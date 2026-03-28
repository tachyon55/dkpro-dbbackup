<!-- GSD:project-start source:PROJECT.md -->
## Project

**DataBase Backup Manager — Web Edition**

기존 Delphi 데스크톱 프로그램(DataBase Backup Manager)을 Next.js 기반 Web App으로 마이그레이션한 프로젝트. 여러 관리자가 클라우드 환경에서 다수의 데이터베이스(MySQL, MariaDB, PostgreSQL, SQL Server, Oracle, SQLite)에 대한 백업을 관리하고, 스케줄 백업, 쿼리 실행, 백업 히스토리 조회를 웹 브라우저에서 수행할 수 있다.

**Core Value:** **다수의 데이터베이스를 하나의 웹 인터페이스에서 안전하게 백업하고 관리할 수 있어야 한다.**

### Constraints

- **Tech Stack**: Next.js (App Router) + Tailwind CSS + shadcn/ui + PostgreSQL + Prisma
- **Auth**: 다중 사용자, 역할 기반 접근 제어 (RBAC)
- **Security**: AES-256 비밀번호 암호화, 환경변수 키 관리
- **Realtime**: WebSocket (Socket.io 또는 Server-Sent Events)으로 백업 진행 상황 실시간 전달
- **DB Types**: 6가지 (MySQL, MariaDB, PostgreSQL, SQL Server, Oracle, SQLite) 모두 지원
- **Backup Execution**: 서버에서 원격 DB에 직접 접속하여 네이티브 dump 도구 실행
- **Storage**: 로컬 저장 기본 + 클라우드 스토리지(S3 등) 업로드 옵션
- **Language**: 한국어 UI
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

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
## Real-time Communication
| Component | Choice | Version | Rationale | Confidence |
|-----------|--------|---------|-----------|------------|
| WebSocket | Socket.io | 4.x | 양방향 통신, 자동 재연결, room 기반 스코핑 | HIGH |
| Server | Custom HTTP server | - | Next.js + Socket.io 통합 위해 커스텀 서버 필요 | HIGH |
## Job Scheduling & Queue
| Component | Choice | Version | Rationale | Confidence |
|-----------|--------|---------|-----------|------------|
| Scheduler | node-cron | 3.x | 경량, cron 표현식 지원, 단일 서버에 적합 | HIGH |
| Job Queue | BullMQ (선택) | 5.x | Redis 기반, 재시도/동시성 제어 — 스케일 필요시 | MEDIUM |
## Multi-DB Drivers (Target Database Connections)
| DB Type | Driver | Version | Notes | Confidence |
|---------|--------|---------|-------|------------|
| MySQL/MariaDB | mysql2 | 3.x | Promise 지원, 성능 우수 | HIGH |
| PostgreSQL | pg | 8.x | 가장 성숙한 Node.js PG 드라이버 | HIGH |
| SQL Server | mssql | 11.x | tedious 기반, Windows 인증 지원 | HIGH |
| Oracle | oracledb | 6.x | Oracle Instant Client 필요 ⚠️ | MEDIUM |
| SQLite | better-sqlite3 | 11.x | 동기식, 빠름, 파일 기반 | HIGH |
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
