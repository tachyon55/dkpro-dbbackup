# Phase 1: Foundation + Auth + Connections - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

관리자가 로그인하고 DB 연결을 안전하게 관리할 수 있는 앱 기반을 구축한다. Next.js 프로젝트 초기화, 사용자 인증(RBAC), DB 연결 CRUD + 암호화 저장, 감사 로그 기록 및 조회를 포함한다.

**Requirements:** AUTH-01~07, CONN-01~08

</domain>

<decisions>
## Implementation Decisions

### 초기 사용자 설정
- **D-01:** 첫 admin 계정은 환경변수 시드로 생성 (ADMIN_EMAIL, ADMIN_PASSWORD → 서버 시작 시 자동 upsert)
- **D-02:** admin이 사용자 생성 시 임시 비밀번호를 발급하고, 사용자는 첫 로그인 시 비밀번호 변경 강제
- **D-03:** 사용자 관리 화면에 기본 정보 표시: 이메일, 이름, 역할, 상태(활성/비활성), 마지막 로그인 시간
- **D-04:** 비밀번호 정책: 최소 8자, 영문+숫자 필수
- **D-05:** 계정 비활성화 시 로그인 차단 (기존 세션은 만료 시 종료)
- **D-06:** 마지막 admin 계정은 삭제/비활성화 불가 (admin이 0명이 되는 상황 방지)
- **D-07:** 로그인 5회 연속 실패 시 15분 계정 잠금 (brute force 방지)
- **D-08:** 비밀번호 분실 시 admin이 임시 비밀번호로 재설정 (이메일 복구는 Phase 3 알림 인프라 이후)

### 연결 관리 UI
- **D-09:** DB 연결 목록은 카드형 그리드 레이아웃. 카드에 이름, DB 타입, 호스트, 포트, 상태 표시. 색상 구분(CONN-08)이 시각적으로 잘 드러남
- **D-10:** 연결 생성/수정은 모달 다이얼로그 방식
- **D-11:** DB 타입 선택 시 폼 필드가 동적으로 변경 (SQLite=파일 경로만, Oracle=SID/Service Name 추가 등)
- **D-12:** 연결 테스트 결과는 모달 내 인라인으로 표시 (성공/실패 + 응답시간)
- **D-13:** 연결별 색상은 프리셋 팔레트(8~12개 사전 정의 색상)에서 선택
- **D-14:** CONN-07 DB 목록 조회는 연결 상세 영역(카드 클릭 시)에 탭으로 표시
- **D-15:** 연결 삭제 시 확인 다이얼로그 표시 (관련 스케줄/히스토리 경고는 Phase 2+에서 추가)

### 감사 로그
- **D-16:** Phase 1 감사 로그 대상: 로그인/로그아웃, 사용자 CRUD, 역할 변경, 연결 생성/수정/삭제/테스트 이벤트
- **D-17:** admin 전용 감사 로그 조회 페이지 제공 (사용자, 이벤트 타입, 날짜 범위 필터)
- **D-18:** 감사 로그 90일 보관 후 자동 삭제

### 인증 세션
- **D-19:** NextAuth.js v5 JWT 세션 방식 사용 (Credentials provider와 자연스러운 조합)
- **D-20:** JWT 토큰 만료 24시간, 활동 시 자동 갱신
- **D-21:** 동시 로그인 허용 (동일 계정 여러 브라우저/기기)
- **D-22:** 로그인 후 기본 랜딩 페이지는 연결 목록 (Phase 4에서 대시보드로 변경 가능)

### 앱 레이아웃
- **D-23:** 사이드바 네비게이션 구조 (관리 도구에 적합)
- **D-24:** Phase 1 사이드바 메뉴: 연결 관리, 사용자 관리(admin), 감사 로그(admin). Phase 진행 시 메뉴 추가
- **D-25:** 라이트 모드만 지원 (다크 모드는 나중에 추가 가능)

### Claude's Discretion
- 사용자 관리 화면의 정확한 레이아웃과 UX 디테일
- 비밀번호 변경 강제 플로우의 UX 디테일
- 에러 메시지 문구와 토스트/알림 스타일
- 사이드바 접기/펼치기 동작

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above and the following project artifacts:

### Project Artifacts
- `.planning/PROJECT.md` — 프로젝트 비전, 제약사항, 핵심 결정
- `.planning/REQUIREMENTS.md` — AUTH-01~07, CONN-01~08 상세 요구사항
- `.planning/ROADMAP.md` — Phase 1 목표 및 성공 기준
- `.planning/STATE.md` — 현재 진행 상태 및 기술 결정 사항

### Technology Decisions (from STATE.md)
- Stack: Next.js 15 App Router + TypeScript + PostgreSQL + Prisma + NextAuth.js v5
- Encryption: AES-256-GCM, key in ENCRYPTION_KEY env var
- UI: Tailwind CSS + shadcn/ui
- Validation: Zod

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. No existing code in the repository.

### Established Patterns
- None yet — patterns will be established in this phase (component structure, API route patterns, auth middleware, etc.)

### Integration Points
- Next.js App Router `/app` directory will be the entry point
- `/app/api/` for API routes
- Prisma schema for database models
- NextAuth.js configuration for authentication

</code_context>

<specifics>
## Specific Ideas

- 원본 Delphi 프로그램에서 5개 실제 DB 연결을 관리 중 (대광통상, 선두콩나물, SupaBase(Lotto), 대광 Sql Server, 우리선두) — 카드 UI는 이 규모에 적합
- 카드형 그리드에서 연결 상태(연결됨/끊김)를 색상 아이콘으로 표시
- DB 타입별 아이콘 또는 로고 표시 고려

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-auth-connections*
*Context gathered: 2026-03-28*
