# Phase 3: Automation + Notifications - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

스케줄에 따라 백업이 자동으로 실행되고 결과가 이메일/Slack으로 알림된다. node-cron 기반 스케줄링, 보관 일수 기반 자동 정리, 서버 재시작 복구, 이메일/Slack 알림 채널 설정을 포함한다.

**Requirements:** SCHD-01~06, NOTF-01~04

</domain>

<decisions>
## Implementation Decisions

### 스케줄 설정 UI
- **D-01:** 스케줄 설정은 연결 카드 내부에서 수행 — 카드 클릭 시 확장/모달로 스케줄 설정. Phase 2의 백업 버튼도 카드에 넣은 패턴과 일관
- **D-02:** 시간 설정은 매일 지정 시간(시/분 선택기) — SCHD-01 요구사항 범위에 맞춤. cron 표현식 불필요
- **D-03:** 백업 저장 경로는 기본값(getBackupDir()) 자동 적용 + 선택적 오버라이드 가능 (SCHD-03 충족)
- **D-04:** 카드에 스케줄 ON/OFF 토글 + 다음 예정 실행 시간 표시 — 한눈에 상태 파악

### 자동 정리 & 안전 가드
- **D-05:** 보관 일수 기본값 30일. 연결별 스케줄 설정 시 변경 가능
- **D-06:** 자동 정리는 스케줄 백업 완료 직후 해당 연결의 오래된 백업을 정리
- **D-07:** 마지막 성공 백업은 항상 최소 1개 보존 — 보관 일수와 무관하게 절대 삭제하지 않음 (SCHD-05)

### 서버 재시작 복구
- **D-08:** 서버 재시작 시 놓친 백업은 연결별 '놓친 백업 자동 실행' 옵션으로 제어 — 사용자가 연결별로 선택 가능
- **D-09:** 서버 시작 시 running 상태로 남은 BackupHistory 레코드는 자동으로 failed 처리 + 로그 기록

### 알림 채널 설정
- **D-10:** 글로벌 채널 설정 + 연결별 ON/OFF 구조 — SMTP/Slack Webhook은 전역 설정 페이지에서 1번 설정, 각 연결에서 알림 받을지만 토글
- **D-11:** 알림 설정 UI는 사이드바 '설정' 메뉴 추가 (admin 전용)
- **D-12:** 알림 메시지에 연결명, 성공/실패 상태, 파일크기, 소요시간, 실패 시 에러 메시지 포함

### Claude's Discretion
- 스케줄 설정 모달의 정확한 레이아웃과 UX 디테일
- node-cron 등록/해제 로직 구현 상세
- 정리 로직의 쿼리 및 파일 삭제 순서
- 놓친 백업 감지 로직 (마지막 실행 시간 vs 스케줄 시간 비교)
- 이메일/Slack 메시지 템플릿 상세 포맷
- Prisma 모델 설계 (Schedule, NotificationSettings 등)
- 설정 페이지의 정확한 폼 레이아웃

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Artifacts
- `.planning/PROJECT.md` — 프로젝트 비전, 제약사항, 핵심 결정
- `.planning/REQUIREMENTS.md` — SCHD-01~06, NOTF-01~04 상세 요구사항
- `.planning/ROADMAP.md` — Phase 3 목표 및 성공 기준
- `.planning/STATE.md` — 현재 진행 상태 및 기술 결정 사항

### Prior Phase Context
- `.planning/phases/01-foundation-auth-connections/01-CONTEXT.md` — Phase 1 결정사항 (사이드바 네비, 카드 레이아웃, 모달 패턴, JWT 세션)
- `.planning/phases/02-backup-engine-history/02-CONTEXT.md` — Phase 2 결정사항 (SSE, 백업 엔진, 히스토리 UI)

### Technology Decisions
- Stack: Next.js 15 App Router + TypeScript + PostgreSQL + Prisma + NextAuth.js v5
- Scheduling: node-cron (STATE.md에서 확정)
- Email: Nodemailer (PROJECT.md Tech Stack)
- Slack: @slack/web-api (PROJECT.md Tech Stack)
- Backup engine: `src/lib/backup-engine.ts` — runBackup() 함수 재활용

### STATE.md Flags
- "Stale job recovery on server restart is non-obvious — needs explicit implementation plan" → D-08, D-09에서 결정됨

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/backup-engine.ts` — `runBackup(historyId, send)` 스케줄 백업에서 호출
- `src/lib/backup-store.ts` — `lockBackup()`/`unlockBackup()` 동시성 제어
- `src/lib/backup-tools.ts` — `buildSpawnArgs()`, `generateBackupFileName()`, `getBackupDir()`
- `src/lib/crypto.ts` — AES-256-GCM encrypt/decrypt (SMTP 비밀번호 등 암호화에 활용 가능)
- `src/lib/audit.ts` — `createAuditLog()` 스케줄/알림 이벤트 감사 기록
- `src/components/layout/Sidebar.tsx` — 설정 메뉴 추가 지점
- `src/components/connections/` — 연결 카드에 스케줄 토글/정보 추가 지점

### Established Patterns
- API Route: NextResponse + auth() + Zod validation
- 모달 다이얼로그: shadcn Dialog (연결 생성/수정에서 사용 중)
- 감사 로그: AuditLog 모델 + AuditEventType enum
- Prisma schema: `prisma/schema.prisma` — DbConnection, BackupHistory 모델 존재

### Integration Points
- Prisma schema에 Schedule 모델 추가 (DbConnection과 1:1 또는 1:N 관계)
- Prisma schema에 NotificationSettings 모델 추가 (글로벌 설정)
- DbConnection 모델에 알림 ON/OFF 필드 추가
- AuditEventType enum에 스케줄/알림 이벤트 추가
- 사이드바에 '설정' 메뉴 추가
- 연결 카드에 스케줄 토글 + 다음 실행 시간 표시 추가
- 서버 시작 시 (server.ts 또는 instrumentation.ts) 스케줄 복구 로직 실행

</code_context>

<specifics>
## Specific Ideas

- 원본 Delphi 프로그램도 매일 지정 시간 백업 + 보관 일수 자동 정리 패턴 사용 — 동일한 기본 흐름 유지
- 연결 카드에서 스케줄 상태가 한눈에 보여야 함 (토글 + 다음 실행 시간)
- 서버 재시작 복구는 연결별로 옵션 제공하여 유연하게 대응

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-automation-notifications*
*Context gathered: 2026-03-30*
