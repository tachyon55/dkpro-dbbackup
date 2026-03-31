# Roadmap: DataBase Backup Manager Web

## Overview

4단계로 데스크톱 백업 도구를 웹 앱으로 마이그레이션한다. 보안 아키텍처와 인증이 먼저 자리잡아야 자격증명을 안전하게 저장할 수 있고, 핵심 백업 엔진이 검증되어야 자동화가 그 위에 올라갈 수 있으며, 대시보드와 쿼리 실행기는 모든 데이터가 쌓인 뒤에야 의미가 있다.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation + Auth + Connections** - 보안 아키텍처, 사용자 인증(RBAC), DB 연결 관리 및 암호화 저장 (completed 2026-03-28)
- [x] **Phase 2: Backup Engine + History** - 수동 백업 실행, WebSocket 실시간 진행, 백업 히스토리 및 파일 다운로드 (completed 2026-03-29)
- [x] **Phase 3: Automation + Notifications** - 스케줄 백업, 보관 자동 정리, 이메일/Slack 알림 (completed 2026-03-30)
- [x] **Phase 4: Dashboard + Foundation** - 대시보드, Prisma 스키마 확장(SavedQuery/CloudStorage), 사이드바 업데이트 (completed 2026-03-31)
- [ ] **Phase 5: SQL Query Executor** - SQL 쿼리 실행기, 결과 테이블 표시, 역할 기반 제한, 저장된 쿼리 관리
- [ ] **Phase 6: Cloud Storage Upload** - S3 업로드 엔진, 클라우드 설정 UI, 스케줄별 업로드 toggle, 멀티파트 업로드

## Phase Details

### Phase 1: Foundation + Auth + Connections
**Goal**: 관리자가 로그인하고 DB 연결을 안전하게 관리할 수 있는 앱 기반을 구축한다
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, CONN-01, CONN-02, CONN-03, CONN-04, CONN-05, CONN-06, CONN-07, CONN-08
**Success Criteria** (what must be TRUE):
  1. 사용자가 이메일/비밀번호로 로그인하고, 새로고침 후에도 세션이 유지되며, 로그아웃할 수 있다
  2. admin이 사용자를 생성/수정/삭제하고 admin/operator/viewer 역할을 부여할 수 있다
  3. viewer는 조회 전용, operator는 백업·쿼리 실행, admin은 모든 기능에 접근된다
  4. DB 연결을 생성/수정/삭제하고 저장 전 연결 테스트를 실행할 수 있다 (6가지 DB 타입 지원)
  5. 저장된 DB 비밀번호가 AES-256-GCM으로 암호화되어 있으며 평문이 DB에 저장되지 않는다
**Plans**: 5 plans
Plans:
- [x] 01-01-PLAN.md — Project init, auth, RBAC, layout
- [x] 01-02-PLAN.md — User management CRUD + UI
- [x] 01-03-PLAN.md — Connection API, encryption, DB drivers
- [x] 01-04-PLAN.md — Connections UI (cards, modal, detail)
- [x] 01-05-PLAN.md — Audit logging writes + listing UI (gap closure, AUTH-07)
**UI hint**: yes

### Phase 2: Backup Engine + History
**Goal**: 사용자가 수동으로 백업을 실행하고 진행 상황을 실시간으로 확인하며 히스토리를 조회할 수 있다
**Depends on**: Phase 1
**Requirements**: BKUP-01, BKUP-02, BKUP-03, BKUP-04, BKUP-05, BKUP-06, HIST-01, HIST-02, HIST-03, HIST-04
**Success Criteria** (what must be TRUE):
  1. 연결을 선택하고 즉시 백업을 실행하면 진행 상황이 WebSocket으로 실시간 표시된다
  2. 백업 파일이 서버 로컬 디스크에 저장되고 DB명/날짜/시간이 파일명에 포함된다
  3. 동일 연결에 대한 동시 백업 실행이 차단된다
  4. 백업 히스토리에서 날짜, 상태, 파일명, 크기, 소요시간을 조회할 수 있다
  5. 백업 파일을 웹에서 다운로드하고 SHA-256 해시로 무결성을 검증할 수 있다
**Plans**: 3 plans
Plans:
- [x] 02-01-PLAN.md — Backup engine foundation (Prisma model, spawn tools, engine)
- [x] 02-02-PLAN.md — Backup trigger API + SSE stream + UI flow
- [x] 02-03-PLAN.md — Backup history API + UI (gap closure: HIST-01, HIST-02, HIST-03)
**UI hint**: yes

### Phase 3: Automation + Notifications
**Goal**: 스케줄에 따라 백업이 자동으로 실행되고 결과가 이메일/Slack으로 알림된다
**Depends on**: Phase 2
**Requirements**: SCHD-01, SCHD-02, SCHD-03, SCHD-04, SCHD-05, SCHD-06, NOTF-01, NOTF-02, NOTF-03, NOTF-04
**Success Criteria** (what must be TRUE):
  1. 연결별로 매일 지정 시간에 자동 백업이 실행되고 활성화/비활성화할 수 있다
  2. 보관 일수가 지난 백업 파일이 자동 삭제되고, 마지막 성공 백업은 삭제되지 않는다
  3. 서버 재시작 후 중단된 스케줄이 정상 복구된다
  4. 백업 성공/실패 시 이메일 또는 Slack으로 알림이 전송된다
  5. 알림 채널을 설정하고 연결별로 알림을 활성화/비활성화할 수 있다
**Plans**: TBD

### Phase 4: Dashboard + Foundation
**Goal**: 전체 현황을 한눈에 파악하는 대시보드를 구축하고 쿼리/클라우드 기능의 스키마 기반을 마련한다
**Depends on**: Phase 3
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, QURY-06 (schema), CLOD-02 (schema), CLOD-03 (schema)
**Success Criteria** (what must be TRUE):
  1. 대시보드에서 모든 연결 상태, 최근 백업 결과, 다음 스케줄, 경고를 한눈에 볼 수 있다
  2. SavedQuery, CloudStorageSettings Prisma 모델이 마이그레이션과 함께 생성되어 있다
  3. 로그인 후 기본 리다이렉트가 /dashboard로 설정된다
**Plans**: 2 plans
Plans:
- [x] 04-01-PLAN.md — Schema migration + npm packages + sidebar nav
- [x] 04-02-PLAN.md — Dashboard page with metric cards + connection grid
**Completed**: 2026-03-31

### Phase 5: SQL Query Executor
**Goal**: 사용자가 연결을 선택하고 SQL을 실행하며 저장된 쿼리를 관리할 수 있다
**Depends on**: Phase 4
**Requirements**: QURY-01, QURY-02, QURY-03, QURY-04, QURY-05, QURY-06, QURY-07
**Gap Closure**: Closes gaps from v1.0 milestone audit
**Success Criteria** (what must be TRUE):
  1. 연결을 선택하고 SQL을 입력하여 실행하면 SELECT 결과가 테이블로, DML은 영향 행 수와 실행시간으로 표시된다
  2. viewer는 SELECT만, operator/admin은 DML을 실행할 수 있다
  3. 자주 사용하는 쿼리를 저장하고 목록에서 불러와 재실행할 수 있다
  4. 저장된 쿼리를 수정하거나 삭제할 수 있다
**Plans**: TBD
**UI hint**: yes

### Phase 6: Cloud Storage Upload
**Goal**: 백업 파일을 S3 호환 스토리지에 업로드하고 스케줄별로 업로드를 제어할 수 있다
**Depends on**: Phase 4
**Requirements**: CLOD-01, CLOD-02, CLOD-03, CLOD-04
**Gap Closure**: Closes gaps from v1.0 milestone audit
**Success Criteria** (what must be TRUE):
  1. 클라우드 스토리지 연결 정보(엔드포인트, 리전, 버킷, 키)를 설정하고 저장할 수 있다
  2. 스케줄별로 클라우드 업로드를 켜고 끌 수 있다
  3. 스케줄 백업 완료 후 cloudUpload=true인 경우 S3 호환 스토리지에 자동 업로드된다
  4. 대용량 파일은 멀티파트 업로드로 처리된다
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Auth + Connections | 5/5 | Complete | 2026-03-28 |
| 2. Backup Engine + History | 3/3 | Complete | 2026-03-29 |
| 3. Automation + Notifications | 4/4 | Complete | 2026-03-30 |
| 4. Dashboard + Foundation | 2/2 | Complete | 2026-03-31 |
| 5. SQL Query Executor | 0/TBD | Not started | — |
| 6. Cloud Storage Upload | 0/TBD | Not started | — |
