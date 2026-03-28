# Phase 2: Backup Engine + History - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

사용자가 수동으로 백업을 실행하고 진행 상황을 실시간으로 확인하며 히스토리를 조회/다운로드할 수 있다. 네이티브 dump 도구를 사용한 백업 실행 엔진, SSE 기반 실시간 진행 표시, 백업 히스토리 CRUD 및 파일 다운로드/무결성 검증을 포함한다.

**Requirements:** BKUP-01~06, HIST-01~04

</domain>

<decisions>
## Implementation Decisions

### 백업 실행 흐름
- **D-01:** 백업은 연결 카드에서 직접 트리거 (별도 백업 페이지 없음). 카드에 "백업 실행" 버튼 추가
- **D-02:** 즉시 실행 방식 — 버튼 클릭 → 확인 다이얼로그 → 바로 실행. 저장 경로는 시스템 기본값 사용 (Phase 3에서 스케줄별 경로 설정)
- **D-03:** 동시 백업 차단 시 해당 연결의 백업 버튼을 비활성화하고 "백업 중..." 상태 표시

### 실시간 진행 표시
- **D-04:** SSE (Server-Sent Events) 사용 — 단방향 스트림으로 충분하며 Next.js API Route에서 바로 사용 가능, 별도 WebSocket 서버 불필요
- **D-05:** 로그 스트림 + 프로그레스 바 조합 — dump 도구의 stdout/stderr를 로그로 스트리밍하고, 상단에 프로그레스 바 표시 (시작/진행중/완료 단계)
- **D-06:** 전용 모달/드로어에서 진행 상황 표시 — 백업 실행 버튼 클릭 시 모달이 열리고 로그+프로그레스 표시. 완료 후 닫기 가능
- **D-07:** 백업 완료/실패 후 결과 요약(성공/실패 상태, 파일 크기, 소요시간) + 닫기 버튼 제공

### 히스토리 조회 UI
- **D-08:** 사이드바에 "백업 히스토리" 메뉴 추가. 전체 연결의 백업 이력을 하나의 테이블에 표시, 연결별/상태별/날짜 필터 제공
- **D-09:** 테이블 컬럼: 연결명, DB타입, 상태(성공/실패/진행중), 파일명, 파일크기, 소요시간, 실행일시
- **D-10:** 테이블 행 클릭 → 상세 패널(오른쪽 또는 하단) 열림. dump 로그 전문, 에러 메시지, 파일 상세 정보 표시

### 파일 다운로드 & 무결성 검증
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Artifacts
- `.planning/PROJECT.md` — 프로젝트 비전, 제약사항, 핵심 결정
- `.planning/REQUIREMENTS.md` — BKUP-01~06, HIST-01~04 상세 요구사항
- `.planning/ROADMAP.md` — Phase 2 목표 및 성공 기준
- `.planning/STATE.md` — 현재 진행 상태

### Prior Phase Context
- `.planning/phases/01-foundation-auth-connections/01-CONTEXT.md` — Phase 1 결정사항 (사이드바 네비, 카드 레이아웃, 모달 패턴, JWT 세션 등)

### Technology Decisions
- Stack: Next.js 15 App Router + TypeScript + PostgreSQL + Prisma + NextAuth.js v5
- Real-time: SSE (Server-Sent Events) — Socket.io 대신 선택
- Encryption: AES-256-GCM (기존 `src/lib/crypto.ts`)
- UI: Tailwind CSS + shadcn/ui
- Backup: child_process.spawn() + 네이티브 dump 도구 (mysqldump, pg_dump, sqlcmd, exp/expdp, sqlite3)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/db-drivers/` — 6가지 DB 드라이버 (mysql, postgres, mssql, oracle, sqlite) 연결 테스트용으로 구현됨. 백업 시 연결 정보 복호화에 활용
- `src/lib/crypto.ts` — AES-256-GCM encrypt/decrypt. DB 비밀번호 복호화하여 dump 도구에 전달
- `src/components/connections/` — 연결 카드 컴포넌트. 백업 버튼 추가 필요
- `src/components/layout/` — 사이드바 레이아웃. 백업 히스토리 메뉴 추가
- `src/components/ui/` — shadcn/ui 기본 컴포넌트

### Established Patterns
- API Route: NextResponse + auth() + Zod validation 패턴
- 모달 다이얼로그: 연결 생성/수정에서 사용 중 (shadcn Dialog)
- 감사 로그: AuditLog 모델 + AuditEventType enum — 백업 이벤트 추가 가능

### Integration Points
- Prisma schema에 BackupHistory 모델 추가 (DbConnection과 관계)
- AuditEventType enum에 백업 이벤트 타입 추가
- 사이드바 네비게이션에 "백업 히스토리" 메뉴 추가
- 연결 카드 컴포넌트에 "백업 실행" 버튼 추가
- 연결 삭제 시 관련 히스토리 경고 추가 (Phase 1 D-15에서 미룸)

</code_context>

<specifics>
## Specific Ideas

- 원본 Delphi 프로그램에서 5개 DB 연결을 관리 중 — 각 연결의 백업을 카드에서 바로 실행하는 것이 자연스러움
- dump 도구 출력을 실시간 로그로 스트리밍하여 기존 데스크톱 앱과 유사한 경험 제공
- 백업 파일명에 DB명/날짜/시간 포함 (BKUP-06) — 기존 프로그램의 파일명 규칙과 유사하게

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-backup-engine-history*
*Context gathered: 2026-03-29*
