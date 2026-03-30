# Phase 4: Dashboard + Query Executor + Cloud Storage - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 04-dashboard-query-executor-cloud-storage
**Areas discussed:** 대시보드 레이아웃, SQL 쿼리 에디터 UI, 클라우드 스토리지 설정 위치

---

## 대시보드 레이아웃

| Option | Description | Selected |
|--------|-------------|----------|
| 대시보드로 변경 | 로그인 → /dashboard. 사이드바 상단에 메뉴 추가 | ✓ |
| 연결 목록 유지 | 현행 유지 — 대시보드는 사이드바 메뉴로만 접근 | |

**User's choice:** 대시보드로 변경 (Phase 1 D-22 결정)

---

| Option | Description | Selected |
|--------|-------------|----------|
| 4개 메트릭 카드 | 총 연결 수 / 오늘 성공 / 실패 건수 / 다음 스케줄 — 한 줄 | ✓ |
| 상태 그리드 우선 | 연결별 상태 카드 그리드가 메인 | |

**User's choice:** 4개 메트릭 카드 + 하단 연결 상태 패널 + 히스토리 패널

---

| Option | Description | Selected |
|--------|-------------|----------|
| 연결별 최근 1건 + 히스토리 10건 | 가볍고 빠름 | ✓ |
| 연결별 최근 3건 + 히스토리 20건 | 더 많은 컨텍스트 | |

**User's choice:** 연결별 최근 1건 + 히스토리 10건

---

| Option | Description | Selected |
|--------|-------------|----------|
| 메트릭 카드 내 배지 + 연결 목록 강조 | 실패 카드 빨간색, 해당 연결 행 강조 | ✓ |
| 별도 경고 섹션 | 하단에 '주의가 필요한 연결' 섹션 추가 | |

**User's choice:** 메트릭 카드 배지 + 연결 목록 강조

---

## SQL 쿼리 에디터 UI

| Option | Description | Selected |
|--------|-------------|----------|
| 사이드바 메뉴 진입 | /query 라우트, 연결 선택 드롭다운 | |
| 연결 카드에서 진입 | 카드의 'SQL 실행' 버튼 → /query/[connectionId] | ✓ |

**User's choice:** 연결 카드에서 진입

---

| Option | Description | Selected |
|--------|-------------|----------|
| Monaco Editor | VS Code 에디터 코어 — SQL 구문 하이라이트, 자동완성 | ✓ |
| CodeMirror 6 | 경량 대안 | |
| plain textarea | 구현 최단, 하이라이트 없음 | |

**User's choice:** Monaco Editor (@monaco-editor/react)

---

| Option | Description | Selected |
|--------|-------------|----------|
| 전체 페이지 | /query/[connectionId] 라우트, 백 버튼으로 복귀 | ✓ |
| 대형 모달/Sheet | 연결 목록 유지 + Sheet 슬라이드 | |

**User's choice:** 전체 페이지

---

| Option | Description | Selected |
|--------|-------------|----------|
| 개인 저장 | user별 — 본인 쿼리만 보임 | ✓ |
| 공유 (팀 전체) | admin/operator 저장 쿼리를 모두 공유 | |
| 연결별 공유 | 연결 기준으로 쿼리 공유 | |

**User's choice:** 개인 저장 (user별)

---

## 클라우드 스토리지 설정 위치

| Option | Description | Selected |
|--------|-------------|----------|
| 설정 페이지에 탭 추가 | /settings에 Cloud Storage 탭 — 알림 설정과 동일 패턴 | ✓ |
| 새 /settings/cloud 페이지 | 독립 전용 페이지 | |

**User's choice:** 설정 페이지에 탭 추가

---

| Option | Description | Selected |
|--------|-------------|----------|
| ScheduleModal 내 토글 추가 | 스케줄 설정 모달에서 클라우드 업로드 토글 | ✓ |
| 연결 카드에 토글 | 스케줄 없어도 동작하는지 애매 | |

**User's choice:** ScheduleModal 내 토글 추가

---

| Option | Description | Selected |
|--------|-------------|----------|
| 백업 성공 유지, 실패 알림 | 로컬 백업은 정상 저장, S3 실패는 알림 | ✓ |
| 업로드 실패도 전체 백업 실패로 | S3 업로드가 필수인 경우 | |

**User's choice:** 백업 성공 유지, S3 업로드 실패는 별도 알림

---

## Claude's Discretion

- 대시보드 데이터 fetch 방식 (서버 컴포넌트 직접 쿼리 vs API route)
- SQL 쿼리 결과 테이블 페이지네이션 (대량 결과 시)
- `executeQuery` 함수 드라이버별 구현 세부사항
- `CloudStorageSettings` Prisma 모델 설계
- `BackupHistory`에 `cloudUploadStatus` 필드 추가 여부

## Deferred Ideas

없음 — 논의가 페이즈 범위 내에서 유지됨
