# Phase 6: Cloud Storage Upload - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 06-cloud-storage-upload
**Areas discussed:** Upload trigger scope, Upload status visibility, Upload failure behavior, S3 settings UX

---

## Upload trigger scope

| Option | Description | Selected |
|--------|-------------|----------|
| 스케줄 전용 | cloudUpload 토글은 Schedule에만. 수동 백업은 항상 로컬만 | ✓ |
| 수동 + 스케줄 모두 | 수동 백업 실행 시에도 업로드 옵션 제공 | |

**User's choice:** 스케줄 전용
**Notes:** CLOD-03 요구사항 범위 그대로. 수동 백업에는 cloudUpload 개념 없음.

| Option | Description | Selected |
|--------|-------------|----------|
| 스케줄러 내부 inline | runScheduledBackup() 완료 후 바로 uploadToS3() | ✓ |
| 별도 후처리 큐 | 백업 완료 이벤트 → 업로드 큐 등록 → 순차 처리 | |

**User's choice:** 스케줄러 내부 inline
**Notes:** 단순성 우선. 재시도 불필요로 결정되어 큐 오버헤드 없음.

---

## Upload status visibility

| Option | Description | Selected |
|--------|-------------|----------|
| 컴팩트 아이콘 | Status 컬럼 옆 클라우드 아이콘 (☁✔/☁✘) | ✓ |
| 별도 Badge 컬럼 | 'S3 업로드: 성공/실패' Badge 별도 컬럼 | |
| 툴팁 전용 | 아이콘 hover 시 업로드 상태 상세 툴팁 | |

**User's choice:** 컴팩트 아이콘
**Notes:** 기존 테이블 레이아웃 차지 최소화.

| Option | Description | Selected |
|--------|-------------|----------|
| 베이직 — DB만 | SSE에 로그 텍스트 추가, 완료 후 DB 업데이트 | ✓ |
| 업로드 실시간 진행률 | S3 multipart 진도를 SSE로 전송 | |

**User's choice:** 베이직 — DB만
**Notes:** 별도 실시간 UI 불필요. SSE 스트림에 "S3 업로드 중..." 텍스트 한 줄로 충분.

---

## Upload failure behavior

| Option | Description | Selected |
|--------|-------------|----------|
| 재시도 없음 | 실패 시 failed 기록 후 종료 | ✓ |
| 1회 자동 재시도 | 30초 후 1회 재시도 후 failed | |

**User's choice:** 재시도 없음
**Notes:** 다음 스케줄 실행 시 재시도 없음. 히스토리에서 failed 상태 확인.

| Option | Description | Selected |
|--------|-------------|----------|
| 독립 알림 없음 | 기존 백업 알림 메시지에 '업로드 실패' 텍스트 포함 | ✓ |
| 별도 알림 | 업로드 실패 시 별도 이메일/Slack 발송 | |

**User's choice:** 독립 알림 없음
**Notes:** 알림 구조 확장 없이 기존 메시지에 텍스트 추가로 충분.

---

## S3 settings UX

| Option | Description | Selected |
|--------|-------------|----------|
| Test Connection 필요 | HeadBucket으로 인증 검증 버튼 | ✓ |
| 불필요 | 저장만 지원, 첫 백업에서 실패로 확인 | |

**User's choice:** 필요
**Notes:** DB 연결 테스트와 동일한 UX 패턴 유지.

| Option | Description | Selected |
|--------|-------------|----------|
| 마스킹 + 수정 가능 | '***...' 마스킹, 수정 클릭 시 새 값 입력 필드 노출 | ✓ |
| 항상 빈 입력칸 | 항상 빈 상태 유지, 저장 시만 갱신 | |

**User's choice:** 마스킹 + 수정 가능
**Notes:** DB 비밀번호와 동일 패턴. src/lib/crypto.ts AES-256-GCM 재사용.

---

## Claude's Discretion

- AWS SDK v3 multipart 구현 세부사항
- S3 객체 키 네이밍 패턴
- Test Connection API 엔드포인트 경로
