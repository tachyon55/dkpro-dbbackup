# Phase 6: Cloud Storage Upload - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

S3 호환 스토리지 업로드 엔진 구현, 글로벌 S3 설정 UI (탭 추가), 스케줄별 업로드 ON/OFF 제어.

스케줄 백업 완료 후 자동 업로드가 핵심. 수동 백업은 이 phase 범위 밖.

</domain>

<decisions>
## Implementation Decisions

### Upload Trigger Scope
- **D-01:** 스케줄 전용 — cloudUpload 토글은 `Schedule` 모델에만. 수동 백업은 항상 로컬 저장만. CLOD-03 요구사항 범위 그대로.
- **D-02:** 업로드 실행 위치는 `runScheduledBackup()` 내부 inline — 백업 완료 직후 `uploadToS3()` 호출. 별도 큐 없음. 백업 자체는 업로드 실패와 무관하게 성공으로 기록.

### Upload Status Visibility
- **D-03:** 히스토리 테이블에 컴팩트 아이콘으로 표시 — 기존 Status 컬럼 옆에 클라우드 아이콘 하나 추가 (☁✔ / ☁✘ / 아이콘 없음). 별도 컬럼 추가 없이 공간 최소화.
- **D-04:** 실시간 피드백은 베이직 수준 — SSE 스트림에 "S3 업로드 중..." 로그 텍스트 한 줄 추가. 완료/실패 후 `BackupRecord.cloudUploadStatus` DB 업데이트. 별도 진행률 UI 불필요.

### Upload Failure Behavior
- **D-05:** 재시도 없음 — 업로드 실패 시 `cloudUploadStatus='failed'` 기록 후 종료. 다음 스케줄 실행 시 재시도 없음. 히스토리에서 확인 가능.
- **D-06:** 독립 알림 없음 — 업로드 실패를 별도 알림 채널로 발송하지 않음. 기존 백업 결과 알림 메시지에 '(S3 업로드 실패)' 텍스트를 포함하는 정도로 충분.

### S3 Settings UX
- **D-07:** Test Connection 버튼 필요 — 설정 저장 전 `HeadBucket` 또는 `ListObjects` 호출로 S3 인증 검증. `src/app/api/connections/[id]/test/route.ts` 패턴 참고.
- **D-08:** secretAccessKey 마스킹 + 수정 가능 — 저장된 키는 '***...' 마스킹 표시. 수정 클릭 시 새 값 입력 필드 노출. `src/lib/crypto.ts` AES-256-GCM으로 암호화 저장. DB 비밀번호와 동일 패턴.
- **D-09 (from Phase 4 D-11):** 설정 UI는 `/settings` 페이지에 'Cloud Storage' 탭 추가. Phase 3 알림 설정 탭과 동일 패턴. admin 전용. 현재 설정 페이지는 `NotificationSettingsForm` 단독 — 탭 구조로 리팩터링 필요.
- **D-10 (from Phase 4 D-12):** 스케줄별 cloudUpload 토글은 `ScheduleModal`에 추가. 글로벌 S3 설정이 없으면 토글 비활성화 + 안내 문구.

### Claude's Discretion
- S3 업로드 함수 내부 구현 (AWS SDK v3 `@aws-sdk/client-s3` + `Upload` from `@aws-sdk/lib-storage` for multipart)
- 멀티파트 파트 크기 (5MB 기본값 권장)
- S3 객체 키 네이밍 (연결명/날짜/파일명 패턴)
- Test Connection API 엔드포인트 경로

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — CLOD-01 ~ CLOD-04 요구사항 정의
- `.planning/ROADMAP.md` §Phase 6 — Success Criteria 4개

### Schema (already exists — no migration needed for most fields)
- `prisma/schema.prisma` — `CloudStorageSettings` 모델, `Schedule.cloudUpload: Boolean`, `BackupRecord.cloudUploadStatus: String?`

### Integration Points
- `src/lib/scheduler.ts` — `runScheduledBackup()` (업로드 코드 삽입 지점, line ~66)
- `src/lib/crypto.ts` — AES-256-GCM encrypt/decrypt (secretAccessKey 암호화)
- `src/app/(app)/settings/page.tsx` — 설정 페이지 (Cloud Storage 탭 추가 위치)
- `src/app/api/connections/[id]/test/route.ts` — DB 연결 테스트 패턴 (S3 테스트 구현 참고)
- `src/components/settings/NotificationSettingsForm.tsx` — 알림 설정 폼 패턴 (Cloud Storage 폼 구현 참고)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/crypto.ts` — AES-256-GCM encrypt/decrypt. secretAccessKey 암호화에 그대로 재사용
- `src/app/api/connections/[id]/test/route.ts` — testConnection() 패턴. S3 test 엔드포인트에 동일 구조 적용
- `NotificationSettingsForm` — 설정 폼 패턴 (admin guard, save/load, toast feedback)

### Established Patterns
- 인증정보 암호화: `encrypt()` / `decrypt()` from `src/lib/crypto.ts`
- DB 연결 테스트: POST `/api/connections/[id]/test` → `testConnection()` → `{ success, message }`
- SSE 백업 로그: `runScheduledBackup()` 내에서 로그 콜백 패턴 확인 후 "S3 업로드 중..." 텍스트 추가
- 설정 UI: admin 전용 페이지, 저장 버튼, toast 피드백

### Integration Points
- `runScheduledBackup()` 완료 블록에 `if (schedule.cloudUpload) { await uploadToS3(...) }` 추가
- 설정 페이지를 탭 구조로 리팩터링: Notifications | Cloud Storage (Shadcn Tabs 컴포넌트)
- `ScheduleModal`에 cloudUpload 토글 필드 추가 (Phase 3에서 만든 모달)
- 히스토리 테이블 행에 cloudUploadStatus 아이콘 컬럼 추가

</code_context>

<specifics>
## Specific Ideas

- S3 설정에 엔드포인트 필드 존재 → NCP Object Storage, MinIO 등 S3 호환 서비스도 지원 (endpoint 커스텀 가능)
- Test Connection: `HeadBucket` 호출로 버킷 접근 권한 확인이 가장 단순

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-cloud-storage-upload*
*Context gathered: 2026-04-01*
