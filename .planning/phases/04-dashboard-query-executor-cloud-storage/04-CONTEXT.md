# Phase 4: Dashboard + Query Executor + Cloud Storage - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

3개의 독립적 기능 영역을 구현한다:
1. **Dashboard** — 전체 운영 현황 한눈에 파악 (DASH-01~04)
2. **SQL Query Executor** — 연결별 SQL 직접 실행 + 저장 (QURY-01~07)
3. **Cloud Storage** — S3 호환 스토리지 업로드 설정 및 실행 (CLOD-01~04)

Phase 1~3에서 구현한 연결 관리, 백업 엔진, 스케줄러 위에 올라가는 관리 레이어다.

</domain>

<decisions>
## Implementation Decisions

### Dashboard 레이아웃 (DASH-01~04)

- **D-01:** 로그인 후 기본 랜딩 페이지를 `/dashboard`로 변경 — Phase 1 D-22에서 미뤄진 결정. `src/auth.ts` 또는 루트 redirect 수정
- **D-02:** 상단 4개 메트릭 카드 한 줄 — 총 연결 수 / 오늘 백업 성공 건수 / 실패 건수(경고 배지) / 다음 스케줄까지 남은 시간
- **D-03:** 하단 2개 패널 — 좌: 연결별 최근 백업 1건 상태 그리드(연결명, DB타입, 상태, 시간), 우: 전체 최근 히스토리 10건 리스트
- **D-04:** 경고 표시(DASH-04) — 실패 건수 카드가 빨간색 + 연결 상태 그리드에서 실패 행 강조. 별도 경고 섹션 없음
- **D-05:** 사이드바에 '대시보드' 메뉴를 최상단에 추가 (`Sidebar.tsx` navItems 배열 맨 앞에 삽입)

### SQL Query Executor UI (QURY-01~07)

- **D-06:** 진입 방식 — 연결 카드의 'SQL 실행' 버튼 클릭 → `/query/[connectionId]` 전체 페이지로 이동. 백 버튼으로 `/connections` 복귀. 사이드바 메뉴에도 'SQL 쿼리' 항목 추가
- **D-07:** 에디터 컴포넌트 — Monaco Editor (`@monaco-editor/react`) — SQL 구문 하이라이트, 자동완성. 현재 미설치 → 패키지 추가 필요
- **D-08:** 페이지 레이아웃 — 상단: 연결 선택 드롭다운 + 실행 버튼 / 중단: Monaco 에디터 / 하단: 결과 패널(SELECT → 테이블, DML → 영향 행 수 + 실행 시간)
- **D-09:** 저장된 쿼리 범위 — 개인 저장 (user별). 다른 사용자의 쿼리는 보이지 않음. `SavedQuery` Prisma 모델 추가 필요 (id, userId, connectionId nullable, name, sql, createdAt)
- **D-10:** RBAC — viewer: SELECT만 실행 가능, operator: DML 가능, admin: 모든 SQL. 서버 측 SQL 타입 파싱으로 강제 (QURY-04)

### Cloud Storage 설정 (CLOD-01~04)

- **D-11:** S3 연결 정보(endpoint, region, bucket, accessKeyId, secretAccessKey) — `/settings` 페이지에 'Cloud Storage' 탭 추가. Phase 3의 알림 설정 탭과 동일 패턴. admin 전용
- **D-12:** 스케줄별 업로드 ON/OFF(CLOD-03) — `ScheduleModal`에 '클라우드 업로드' 토글 추가. 글로벌 S3 설정이 없으면 토글 비활성화 + 안내 문구
- **D-13:** 업로드 실패 시 — 로컬 백업은 성공으로 유지, S3 업로드 실패는 알림(이메일/Slack)으로 별도 통보. `BackupHistory`에 `cloudUploadStatus` 필드 추가 검토
- **D-14:** 대용량 파일 — AWS SDK v3 multipart upload 사용 (CLOD-04). `@aws-sdk/client-s3` 이미 의존성 목록에 있음(CLAUDE.md), 설치 여부 확인 필요

### Claude's Discretion

- 대시보드 데이터 fetch 방식 (서버 컴포넌트 직접 쿼리 vs 전용 API route)
- SQL 쿼리 결과 테이블의 페이지네이션 방식 (결과 행이 많을 때)
- `executeQuery` 함수를 `db-drivers/index.ts`에 추가하는 구체적 구현 (드라이버별 분기)
- `CloudStorageSettings` Prisma 모델 설계 (암호화 저장 방식은 AES-256-GCM으로 기존 패턴 따름)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above and the following project artifacts:

### Project Artifacts
- `.planning/PROJECT.md` — 프로젝트 비전, 제약사항, 핵심 결정
- `.planning/REQUIREMENTS.md` — DASH-01~04, QURY-01~07, CLOD-01~04 상세 요구사항
- `.planning/ROADMAP.md` — Phase 4 목표 및 성공 기준
- `.planning/STATE.md` — 현재 진행 상태 및 기술 결정 사항

### Prior Phase Decisions (relevant to Phase 4)
- `.planning/phases/01-foundation-auth-connections/01-CONTEXT.md` — D-09(카드 레이아웃), D-14(탭 패턴), D-22(랜딩 페이지 → 대시보드), D-19(NextAuth JWT)
- `.planning/phases/02-backup-engine-history/02-CONTEXT.md` — D-08(히스토리 테이블 패턴), D-09(상세 패널 패턴)
- `.planning/phases/03-automation-notifications/03-CONTEXT.md` — D-01(카드 내 버튼 패턴), D-10(설정 페이지 전역 구성), D-11(설정 탭 패턴)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/card.tsx` — 대시보드 메트릭 카드, 연결 상태 그리드에 활용
- `src/components/ui/table.tsx` — SQL 쿼리 결과 테이블, 히스토리 리스트에 활용
- `src/components/ui/tabs.tsx` — /settings 페이지 탭 확장(Cloud Storage 탭), SQL 결과/저장 쿼리 탭 전환
- `src/components/ui/badge.tsx` — 대시보드 상태 배지, 실패 경고 강조
- `src/components/ui/sheet.tsx` — (미사용 예정) SQL 에디터는 전체 페이지로 결정
- `src/components/ui/progress.tsx` — 멀티파트 업로드 진행률 표시 가능
- `src/components/schedule/ScheduleModal.tsx` — 클라우드 업로드 토글 추가 대상
- `src/components/settings/NotificationSettingsForm.tsx` — Cloud Storage 설정 폼 패턴 참고
- `src/lib/crypto.ts` — AES-256-GCM 암호화 — S3 secretAccessKey 저장에 동일 패턴 적용
- `src/lib/db-drivers/index.ts` — 현재 `testConnection` + `listDatabases`만 존재. `executeQuery(config, sql) → rows[]` 함수 추가 필요
- `src/lib/notifications.ts` — S3 업로드 실패 알림 트리거 시 참고

### Established Patterns
- 설정 전역값: Prisma 단일 레코드 upsert 패턴 (`NotificationSettings` 참고) → `CloudStorageSettings` 동일 구조
- 민감 정보 암호화: `encrypt()` / `decrypt()` from `src/lib/crypto.ts` — S3 secretAccessKey에 적용
- API Route 패턴: `src/app/api/settings/notifications/route.ts` — GET/PUT 단일 레코드, 암호화 저장
- 페이지 구조: Server Component → Client Component 위임 패턴 (`ConnectionsPageClient`, `HistoryPageClient`)
- RBAC: `session.user.role` 검사 → 미들웨어 또는 API route에서 enforce

### Integration Points
- `src/components/layout/Sidebar.tsx` — navItems 배열에 '대시보드'(/dashboard) 최상단 추가, 'SQL 쿼리'(/query) 추가
- `src/components/connections/ConnectionCard.tsx` — 'SQL 실행' 버튼 추가 → `/query/[connectionId]` 링크
- `src/components/schedule/ScheduleModal.tsx` — 클라우드 업로드 토글 + 설정 미완료 시 안내 추가
- `src/app/(app)/settings/page.tsx` — Cloud Storage 탭 추가
- `prisma/schema.prisma` — `SavedQuery`, `CloudStorageSettings` 모델 추가, `Schedule`에 `cloudUpload Boolean` 필드 추가
- `src/lib/scheduler.ts` — 스케줄 백업 완료 후 `cloudUpload: true`이면 S3 업로드 호출

### New Dependencies
- `@monaco-editor/react` — SQL 에디터 (미설치)
- `@aws-sdk/client-s3` — S3 업로드 (CLAUDE.md에 명시됨, 설치 여부 확인 필요)

</code_context>

<specifics>
## Specific Ideas

- 대시보드 레이아웃 mockup (사용자 선택):
  ```
  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
  │연결 수   │ │오늘 성공 │ │실패 건수 │ │다음 스케줄│
  │  12     │ │   8     │ │   1 ⚠   │ │  2h 30m │
  └─────────┘ └─────────┘ └─────────┘ └─────────┘
  ┌─────────────────────┐  ┌──────────────────┐
  │ 연결별 최근 백업 상태 │  │ 최근 백업 히스토리│
  │ ● A DB  ✓ 2h ago   │  │ 리스트 10건      │
  │ ● B DB  ✗ failed   │  │                  │
  └─────────────────────┘  └──────────────────┘
  ```

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-dashboard-query-executor-cloud-storage*
*Context gathered: 2026-03-31*
