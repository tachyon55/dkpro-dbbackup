# DataBase Backup Manager — Web Edition

## Current State

**Version:** v1.0 MVP — ✅ SHIPPED 2026-04-01
**Codebase:** ~30,400 LOC TypeScript/TSX, 181 files, 6 phases, 18 plans
**Stack:** Next.js 15 App Router + TypeScript + PostgreSQL + Prisma + NextAuth.js v5 + Tailwind + shadcn/ui

## What This Is

기존 Delphi 데스크톱 프로그램(DataBase Backup Manager)을 Next.js 기반 Web App으로 마이그레이션 완료. 여러 관리자가 클라우드 환경에서 다수의 데이터베이스(MySQL, MariaDB, PostgreSQL, SQL Server, Oracle, SQLite)에 대한 백업을 관리하고, 스케줄 백업, 쿼리 실행, 백업 히스토리 조회, 클라우드 스토리지 업로드를 웹 브라우저에서 수행할 수 있다.

## Core Value

**다수의 데이터베이스를 하나의 웹 인터페이스에서 안전하게 백업하고 관리할 수 있어야 한다.**

## Requirements

### Validated — v1.0

- ✓ 다중 사용자 인증 및 역할/권한 관리 (RBAC: admin/operator/viewer) — v1.0 Phase 1
- ✓ 다중 DB 연결 관리 (MySQL, MariaDB, PostgreSQL, SQL Server, Oracle, SQLite) — v1.0 Phase 1
- ✓ 연결 생성/수정/삭제/테스트 — v1.0 Phase 1
- ✓ AES-256-GCM 암호화로 DB 비밀번호 보안 저장 — v1.0 Phase 1
- ✓ 모든 주요 작업 감사 로그 기록 — v1.0 Phase 1
- ✓ 즉시 백업 실행 (수동), 네이티브 dump 도구 사용 — v1.0 Phase 2
- ✓ SSE 실시간 백업 진행 상황 표시 — v1.0 Phase 2
- ✓ 백업 히스토리 및 로그 조회, 파일 다운로드, SHA-256 무결성 검증 — v1.0 Phase 2
- ✓ 백업 파일 서버 로컬 저장 — v1.0 Phase 2
- ✓ 스케줄 기반 자동 백업 (매일 지정 시간), 활성화/비활성화 — v1.0 Phase 3
- ✓ 이메일/Slack 백업 성공·실패 알림 — v1.0 Phase 3
- ✓ 백업 보관 일수 기반 자동 정리 (마지막 성공 백업 보존) — v1.0 Phase 3
- ✓ 대시보드 (연결 상태, 최근 백업, 스케줄 요약, 경고) — v1.0 Phase 4
- ✓ SQL 쿼리 실행기 (SELECT/DML, 역할 제한, 실행 시간 표시) — v1.0 Phase 5
- ✓ 저장된 쿼리 관리 (CRUD) — v1.0 Phase 5
- ✓ S3 호환 클라우드 스토리지 업로드 (멀티파트, 스케줄별 토글) — v1.0 Phase 6

### Active — v2.0

*(비어 있음 — 다음 마일스톤에서 요구사항 정의)*

### Out of Scope

- Windows 시스템 트레이 기능 — 웹앱이므로 불필요
- Windows 레지스트리 자동시작 — 웹 서버 프로세스 매니저(PM2 등)로 대체
- DPAPI 암호화 — Windows 전용, AES-256으로 대체
- 모바일 네이티브 앱 — 반응형 웹으로 대응
- DB 복원(Restore) UI — 매우 위험한 작업, CLI에서 신중하게 수행
- 스키마 마이그레이션 실행 — 백업 도구의 범위 밖
- 실시간 DB 모니터링 — 다른 제품 카테고리
- 멀티테넌시 — 내부 도구에 불필요한 복잡성
- 공개 회원가입 — admin이 사용자 생성하는 구조

## Context

- 원본 프로젝트: `C:\Claude\projects\mysql-backup` (Delphi/VCL, UniDAC, Windows API)
- 원본은 5개의 실제 DB 연결을 관리 중 (대광통상, 선두콩나물, SupaBase(Lotto), 대광 Sql Server, 우리선두)
- v1.0 완성: Next.js 15 App Router + TypeScript, ~30,400 LOC, 181 files
- 실시간은 Socket.io 대신 SSE(Server-Sent Events)로 구현 — App Router에서 더 적합
- Slack 알림은 @slack/web-api SDK 없이 plain fetch POST (Incoming Webhook) 사용
- Oracle 드라이버: TypeScript any 타입 처리 (공식 @types/oracledb 없음)
- 한국어 UI 기본

## Constraints

- **Tech Stack**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + PostgreSQL + Prisma
- **Auth**: NextAuth.js v5 + RBAC (admin/operator/viewer)
- **Security**: AES-256-GCM 비밀번호 암호화, 환경변수 키 관리, 감사 로그
- **Realtime**: SSE(Server-Sent Events)로 백업 진행 상황 실시간 전달
- **DB Types**: 6가지 (MySQL, MariaDB, PostgreSQL, SQL Server, Oracle, SQLite) 모두 지원
- **Backup Execution**: child_process.spawn() + 배열 args로 셸 인젝션 방지
- **Storage**: 로컬 저장 기본 + S3 호환 클라우드 스토리지 업로드 옵션
- **Language**: 한국어 UI

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 15 App Router | SSR + API Routes 통합, React 생태계 활용 | ✓ Good — 서버 컴포넌트로 단일 라운드트립 데이터 로드 실현 |
| PostgreSQL (앱 자체 DB) | 클라우드 배포에 적합, 프로덕션 급 RDBMS | ✓ Good — Prisma와 통합 원활 |
| Prisma ORM | 타입 안전한 DB 접근, 마이그레이션 관리 용이 | ✓ Good — BigInt 직렬화 이슈 외 큰 문제 없음 |
| Tailwind + shadcn/ui | 관리자 UI에 적합, 빠른 개발, 일관된 디자인 | ✓ Good — shadcn CLI npm 충돌로 수동 설치 필요했으나 결과물 양호 |
| AES-256-GCM (DPAPI 대체) | 플랫폼 독립적, 환경변수로 키 관리 | ✓ Good — 인증된 암호화, iv:authTag:ciphertext 포맷으로 무결성 포함 |
| SSE (WebSocket 대신) | App Router에서 Socket.io 커스텀 서버 복잡성 회피 | ✓ Good — 백업 진행률 단방향 스트리밍에 SSE로 충분 |
| child_process.spawn() | exec() 문자열 인터폴레이션 셸 인젝션 방지 | ✓ Good — 배열 args로 인젝션 경로 원천 차단 |
| node-cron v4 (BullMQ 대신) | 단일 서버 배포에 적합, 경량 | ✓ Good — v4 API 변경(TaskOptions.scheduled 제거) 주의 필요 |
| Oracle driver any 타입 | @types/oracledb 의존성 없이 처리 | ✓ Good — eslint-disable로 타입 안전성 경고 억제 |
| S3 @aws-sdk/lib-storage Upload | putObject 대신 멀티파트 자동 처리 | ✓ Good — 대용량 백업 파일도 안정적 업로드 |
| Slack plain fetch POST | @slack/web-api SDK 오버헤드 불필요 | ✓ Good — Incoming Webhook에 충분 |
| secretAccessKey 마스킹 | GET 응답에 __masked__ 반환, 복호화 값 노출 금지 | ✓ Good — 클라이언트에서 boolean(set 여부)만 추적 |

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
*Last updated: 2026-04-01 after v1.0 MVP milestone*
