# Phase 3: Automation + Notifications - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 03-automation-notifications
**Areas discussed:** 스케줄 설정 UI, 자동 정리 & 안전 가드, 서버 재시작 복구, 알림 채널 설정

---

## 스케줄 설정 UI

### Q1: 스케줄 설정을 어디에서 하나요?

| Option | Description | Selected |
|--------|-------------|----------|
| 연결 카드 내부 (Recommended) | 기존 연결 카드에 스케줄 섹션 추가 — 카드 클릭시 확장/모달로 스케줄 설정 | ✓ |
| 별도 스케줄 페이지 | 사이드바에 '스케줄 관리' 메뉴 추가. 모든 연결의 스케줄을 한 테이블로 | |
| 둘 다 제공 | 카드에서 간편 설정 + 전체 스케줄 목록 페이지 별도 제공 | |

**User's choice:** 연결 카드 내부 (Recommended)
**Notes:** Phase 2에서 백업 버튼도 카드에 넣은 패턴과 일관

### Q2: 스케줄 시간 설정 방식은?

| Option | Description | Selected |
|--------|-------------|----------|
| 매일 지정 시간 (Recommended) | 시간/분 선택기로 매일 1회 백업. SCHD-01 요구사항에 딱 맞는 범위 | ✓ |
| Cron 표현식 직접 입력 | 고급 사용자용 cron 표현식 입력. 유연하지만 복잡 | |
| 시간 선택기 + cron 고급 모드 | 기본은 시간 선택기, 고급 토글로 cron 표현식 직접 입력 가능 | |

**User's choice:** 매일 지정 시간 (Recommended)
**Notes:** None

### Q3: 스케줄별 백업 저장 경로를 어떻게 지정하나요?

| Option | Description | Selected |
|--------|-------------|----------|
| 시스템 기본값 사용 (Recommended) | Phase 2의 getBackupDir() 로직 재활용 | |
| 연결별 저장 경로 지정 | 스케줄 설정 시 저장 경로를 직접 입력할 수 있음 (SCHD-03) | |
| 기본값 + 선택적 오버라이드 | 기본 경로 자동 적용, 원하면 변경 가능 | ✓ |

**User's choice:** 기본값 + 선택적 오버라이드
**Notes:** SCHD-03을 충족하면서 단순함 유지

### Q4: 스케줄 활성화/비활성화 토글의 위치와 표시 방식은?

| Option | Description | Selected |
|--------|-------------|----------|
| 카드에 토글 + 다음 실행 시간 (Recommended) | 연결 카드에 스케줄 ON/OFF 토글과 다음 예정 백업 시간 표시 | ✓ |
| 스케줄 모달 안에서만 | 카드에는 '스케줄 설정됨' 배지만 표시. ON/OFF는 모달 열어야 가능 | |
| Claude에게 위임 | UX 디테일은 Claude가 최적의 방식으로 결정 | |

**User's choice:** 카드에 토글 + 다음 실행 시간 (Recommended)
**Notes:** 한눈에 상태 파악

---

## 자동 정리 & 안전 가드

### Q1: 보관 일수 기본값은?

| Option | Description | Selected |
|--------|-------------|----------|
| 30일 (Recommended) | 일반적인 백업 보관 기간 | ✓ |
| 7일 | 디스크 용량 절약 우선 | |
| 연결별 설정 필수 | 기본값 없이 사용자가 반드시 지정 | |

**User's choice:** 30일 (Recommended)
**Notes:** None

### Q2: 자동 정리는 언제 실행되나요?

| Option | Description | Selected |
|--------|-------------|----------|
| 백업 완료 직후 (Recommended) | 스케줄 백업 성공 후 해당 연결의 오래된 백업을 정리 | ✓ |
| 별도 일일 정리 작업 | 매일 새벽 등 지정 시간에 전체 연결 정리 일괄 실행 | |
| Claude에게 위임 | 기술적 구현 디테일은 Claude가 결정 | |

**User's choice:** 백업 완료 직후 (Recommended)
**Notes:** 가장 자연스러운 시점

### Q3: SCHD-05 안전 가드: 마지막 성공 백업 보존 정책은?

| Option | Description | Selected |
|--------|-------------|----------|
| 항상 최소 1개 보존 (Recommended) | 보관 일수와 무관하게 마지막 성공 백업은 절대 삭제하지 않음 | ✓ |
| 최소 N개 보존 (설정 가능) | 사용자가 최소 보존 개수를 지정 (1~5) | |

**User's choice:** 항상 최소 1개 보존 (Recommended)
**Notes:** None

---

## 서버 재시작 복구

### Q1: 서버 재시작 시 놓친 스케줄 백업을 어떻게 처리하나요?

| Option | Description | Selected |
|--------|-------------|----------|
| 즉시 실행 (Recommended) | 서버 시작 시 놓친 백업을 발견하면 즉시 실행 | |
| 무시하고 다음 스케줄 대기 | 놓친 백업은 건너뛰고 다음 예정 시간에 실행 | |
| 사용자 선택 옵션 | 연결별로 '놓친 백업 자동 실행' 설정 가능 | ✓ |

**User's choice:** 사용자 선택 옵션
**Notes:** 연결별로 유연하게 대응

### Q2: 서버 재시작 시 'running' 상태로 남은 백업 레코드는?

| Option | Description | Selected |
|--------|-------------|----------|
| 자동 실패 처리 (Recommended) | 서버 시작 시 running 상태 레코드를 자동으로 failed로 변경하고 로그 기록 | ✓ |
| 그대로 두고 관리자 판단 | running 상태 유지. 히스토리 UI에서 관리자가 확인/처리 | |

**User's choice:** 자동 실패 처리 (Recommended)
**Notes:** None

---

## 알림 채널 설정

### Q1: 알림 설정 구조는?

| Option | Description | Selected |
|--------|-------------|----------|
| 글로벌 채널 + 연결별 ON/OFF (Recommended) | SMTP/Slack 설정은 전역 설정 페이지에서 1번 설정. 각 연결에서 알림 받을지만 토글 | ✓ |
| 연결별 개별 설정 | 각 연결마다 SMTP/Slack 설정을 따로 입력 | |
| 글로벌 설정 + 연결별 채널 선택 | 글로벌로 여러 채널 설정 후, 연결별로 어떤 채널로 받을지 선택 | |

**User's choice:** 글로벌 채널 + 연결별 ON/OFF (Recommended)
**Notes:** None

### Q2: 알림 설정 UI는 어디에?

| Option | Description | Selected |
|--------|-------------|----------|
| 사이드바 '설정' 메뉴 (Recommended) | 새 '설정' 페이지에 SMTP, Slack Webhook 등 글로벌 설정 모음. admin 전용 | ✓ |
| 연결 카드 모달 내 | 스케줄 설정 모달에 알림 탭 추가 | |
| Claude에게 위임 | 사용성 디테일은 Claude가 결정 | |

**User's choice:** 사이드바 '설정' 메뉴 (Recommended)
**Notes:** None

### Q3: 알림 메시지에 포함할 정보는?

| Option | Description | Selected |
|--------|-------------|----------|
| 연결명 + 상태 + 파일정보 (Recommended) | 연결명, 성공/실패, 파일크기, 소요시간, 실패시 에러 메시지 포함 | ✓ |
| 간략 요약만 | 연결명 + 성공/실패만 | |
| Claude에게 위임 | 메시지 포맷 디테일은 Claude가 결정 | |

**User's choice:** 연결명 + 상태 + 파일정보 (Recommended)
**Notes:** None

---

## Claude's Discretion

- 스케줄 설정 모달의 정확한 레이아웃과 UX 디테일
- node-cron 등록/해제 로직 구현 상세
- 정리 로직의 쿼리 및 파일 삭제 순서
- 놓친 백업 감지 로직
- 이메일/Slack 메시지 템플릿 상세 포맷
- Prisma 모델 설계
- 설정 페이지의 정확한 폼 레이아웃

## Deferred Ideas

None — discussion stayed within phase scope
