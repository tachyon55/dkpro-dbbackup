# DataBase Backup Manager — Web Edition

## What This Is

기존 Delphi 데스크톱 프로그램(DataBase Backup Manager)을 Next.js 기반 Web App으로 마이그레이션한 프로젝트. 여러 관리자가 클라우드 환경에서 다수의 데이터베이스(MySQL, MariaDB, PostgreSQL, SQL Server, Oracle, SQLite)에 대한 백업을 관리하고, 스케줄 백업, 쿼리 실행, 백업 히스토리 조회를 웹 브라우저에서 수행할 수 있다.

## Core Value

**다수의 데이터베이스를 하나의 웹 인터페이스에서 안전하게 백업하고 관리할 수 있어야 한다.**

## Requirements

### Validated

- [x] 다중 사용자 인증 및 역할/권한 관리 — Validated in Phase 1: Foundation + Auth + Connections
- [x] 다중 DB 연결 관리 (MySQL, MariaDB, PostgreSQL, SQL Server, Oracle, SQLite) — Validated in Phase 1
- [x] 연결 생성/수정/삭제/테스트 — Validated in Phase 1
- [x] AES-256 암호화로 DB 비밀번호 보안 저장 — Validated in Phase 1
- [x] 즉시 백업 실행 (수동) — Validated in Phase 2: Backup Engine + History
- [x] 실시간 백업 진행 상황 표시 (SSE) — Validated in Phase 2
- [x] 백업 히스토리 및 로그 조회 — Validated in Phase 2
- [x] 백업 파일 서버 로컬 저장 — Validated in Phase 2

### Active

- [ ] 스케줄 기반 자동 백업 (매일 지정 시간)
- [ ] SQL 쿼리 실행기 (SELECT/DML 지원)
- [ ] 저장된 쿼리 관리 (CRUD)
- [ ] 클라우드 스토리지 업로드 옵션
- [ ] 대시보드 (연결 상태, 최근 백업, 스케줄 요약)
- [ ] 알림 기능 (이메일/Slack 등 백업 성공/실패 알림)
- [ ] 백업 보관 일수 기반 자동 정리

### Out of Scope

- Windows 시스템 트레이 기능 — 웹앱이므로 불필요
- Windows 레지스트리 자동시작 — 웹 서버 프로세스 매니저(PM2 등)로 대체
- DPAPI 암호화 — Windows 전용, AES-256으로 대체
- 모바일 네이티브 앱 — 반응형 웹으로 대응

## Context

- 원본 프로젝트: `C:\Claude\projects\mysql-backup` (Delphi/VCL, UniDAC, Windows API)
- 원본은 5개의 실제 DB 연결을 관리 중 (대광통상, 선두콩나물, SupaBase(Lotto), 대광 Sql Server, 우리선두)
- 백업은 각 DB의 네이티브 dump 도구(mysqldump, pg_dump 등)를 서버에서 직접 실행
- 비밀번호는 AES-256으로 암호화, 환경변수로 키 관리
- 기존 프로젝트 디렉토리에 Express+Vanilla JS+SQLite 기반 코드가 일부 존재하나, Next.js로 새로 구축
- 백업 파일은 서버 로컬 디스크에 저장 + 클라우드 스토리지 업로드 옵션 지원
- 한국어 UI 기본

## Constraints

- **Tech Stack**: Next.js (App Router) + Tailwind CSS + shadcn/ui + PostgreSQL + Prisma
- **Auth**: 다중 사용자, 역할 기반 접근 제어 (RBAC)
- **Security**: AES-256 비밀번호 암호화, 환경변수 키 관리
- **Realtime**: WebSocket (Socket.io 또는 Server-Sent Events)으로 백업 진행 상황 실시간 전달
- **DB Types**: 6가지 (MySQL, MariaDB, PostgreSQL, SQL Server, Oracle, SQLite) 모두 지원
- **Backup Execution**: 서버에서 원격 DB에 직접 접속하여 네이티브 dump 도구 실행
- **Storage**: 로컬 저장 기본 + 클라우드 스토리지(S3 등) 업로드 옵션
- **Language**: 한국어 UI

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js App Router | SSR + API Routes 통합, React 생태계 활용 | — Pending |
| PostgreSQL (앱 자체 DB) | 클라우드 배포에 적합, 프로덕션 급 RDBMS | — Pending |
| Prisma ORM | 타입 안전한 DB 접근, 마이그레이션 관리 용이 | — Pending |
| Tailwind + shadcn/ui | 관리자 UI에 적합, 빠른 개발, 일관된 디자인 | — Pending |
| AES-256 (DPAPI 대체) | 플랫폼 독립적, 환경변수로 키 관리 | — Pending |
| WebSocket 실시간 | 백업 진행률/완료를 즉시 전달, 기존 Socket.io 경험 활용 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 — Phase 02 (Backup Engine + History) complete*
