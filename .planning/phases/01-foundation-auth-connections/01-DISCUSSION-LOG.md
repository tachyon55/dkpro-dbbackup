# Phase 1: Foundation + Auth + Connections - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 01-foundation-auth-connections
**Areas discussed:** 초기 사용자 설정, 연결 관리 UI, 감사 로그 범위, 인증 세션 전략

---

## 초기 사용자 설정

| Option | Description | Selected |
|--------|-------------|----------|
| 환경변수 시드 | ADMIN_EMAIL, ADMIN_PASSWORD 환경변수로 서버 시작 시 자동 생성 | ✓ |
| 초기 설정 위저드 | 첫 접속 시 설정 화면에서 admin 정보 입력 | |
| CLI 시드 스크립트 | npx prisma db seed 또는 별도 스크립트로 생성 | |

**User's choice:** 환경변수 시드
**Notes:** 배포 시 가장 간단하고 안전

| Option | Description | Selected |
|--------|-------------|----------|
| 임시 비밀번호 발급 | admin이 임시 비밀번호 지정, 사용자 첫 로그인 시 변경 강제 | ✓ |
| admin이 직접 설정 | admin이 비밀번호 직접 입력, 변경 강제 없음 | |
| 이메일 초대 링크 | 이메일로 비밀번호 설정 링크 발송 | |

**User's choice:** 임시 비밀번호 발급

| Option | Description | Selected |
|--------|-------------|----------|
| 기본 정보 | 이메일, 이름, 역할, 상태, 마지막 로그인 시간 | ✓ |
| 상세 정보 | 기본 + 생성일, 생성자, 비밀번호 변경일, 로그인 횟수 | |
| Claude에게 맡김 | 적절한 수준으로 구성 | |

**User's choice:** 기본 정보

| Option | Description | Selected |
|--------|-------------|----------|
| 최소 8자 | 최소 8자, 영문+숫자 필수 | ✓ |
| 강력한 정책 | 최소 12자, 대소문자+숫자+특수문자 | |
| Claude에게 맡김 | 보안과 편의성 균형 | |

**User's choice:** 최소 8자

| Option | Description | Selected |
|--------|-------------|----------|
| 로그인 차단 | 비활성화된 계정은 로그인 불가, 기존 세션은 만료 시 종료 | ✓ |
| 즉시 로그아웃 | 비활성화 즉시 모든 세션 강제 종료 | |
| Claude에게 맡김 | 적절한 방식으로 구현 | |

**User's choice:** 로그인 차단

| Option | Description | Selected |
|--------|-------------|----------|
| 차단 | 마지막 admin은 삭제/비활성화 불가 | ✓ |
| 허용 | 제한 없이 삭제 가능 | |
| Claude에게 맡김 | 적절한 안전장치 적용 | |

**User's choice:** 차단

| Option | Description | Selected |
|--------|-------------|----------|
| 5회 실패 시 잠금 | 5회 연속 실패 시 15분 잠금 | ✓ |
| 없음 | 별도 제한 없이 간단하게 | |
| Claude에게 맡김 | 보안 수준에 맞게 판단 | |

**User's choice:** 5회 실패 시 잠금

| Option | Description | Selected |
|--------|-------------|----------|
| admin이 재설정 | admin이 임시 비밀번호로 재설정 | ✓ |
| 이메일 링크 | 비밀번호 재설정 링크를 이메일로 발송 | |
| Claude에게 맡김 | 현재 Phase에 맞는 방식 | |

**User's choice:** admin이 재설정

---

## 연결 관리 UI

| Option | Description | Selected |
|--------|-------------|----------|
| 카드형 그리드 | DB별 카드에 이름, 타입, 호스트, 상태 표시 | ✓ |
| 테이블 목록 | 한 줄에 하나씩, 칼럼으로 정보 표시 | |
| 사이드바 + 디테일 | 왼쪽 사이드바에 목록, 오른쪽에 상세 | |

**User's choice:** 카드형 그리드

| Option | Description | Selected |
|--------|-------------|----------|
| 모달 다이얼로그 | 화면 위에 모달로 폼 표시 | ✓ |
| 새 페이지 | 별도 페이지로 이동하여 폼 작성 | |
| 사이드 패널 | 오른쪽 슬라이드 인 패널 | |

**User's choice:** 모달 다이얼로그

| Option | Description | Selected |
|--------|-------------|----------|
| 모달 내 인라인 | 연결 폼 모달 안에서 성공/실패 + 응답시간 표시 | ✓ |
| 토스트 알림 | 화면 상단에 토스트로 결과 표시 | |
| Claude에게 맡김 | UX에 맞게 판단 | |

**User's choice:** 모달 내 인라인

| Option | Description | Selected |
|--------|-------------|----------|
| 프리셋 색상 팔레트 | 8~12개 사전 정의 색상에서 선택 | ✓ |
| 커스텀 컬러 피커 | 자유롭게 색상 선택 가능 | |
| DB 타입별 자동 색상 | 타입으로 자동 배정 | |

**User's choice:** 프리셋 색상 팔레트

| Option | Description | Selected |
|--------|-------------|----------|
| 연결 상세에 표시 | 카드 클릭 시 상세 영역에서 DB 목록 탭 표시 | ✓ |
| 모달 팝업 | 별도 모달로 DB 목록 조회 | |
| Claude에게 맡김 | 적절한 방식으로 | |

**User's choice:** 연결 상세에 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 확인 다이얼로그 | 연결명 표시하고 삭제 확인 | ✓ |
| 연결명 입력 확인 | 연결명을 직접 타이핑해야 삭제 | |
| Claude에게 맡김 | 적절한 수준으로 | |

**User's choice:** 확인 다이얼로그

| Option | Description | Selected |
|--------|-------------|----------|
| 동적 폼 전환 | DB 타입 선택 시 폼 필드가 변경 | ✓ |
| 모든 필드 표시 | 모든 필드 표시, 해당없는 필드 비활성화 | |
| Claude에게 맡김 | 각 DB 타입에 맞게 처리 | |

**User's choice:** 동적 폼 전환

---

## 감사 로그 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 인증+연결 이벤트 | 로그인/로그아웃, 사용자 CRUD, 역할 변경, 연결 CRUD+테스트 | ✓ |
| 모든 API 호출 | 모든 API 요청을 기록 | |
| 변경 작업만 | CUD 작업만 기록 | |

**User's choice:** 인증+연결 이벤트

| Option | Description | Selected |
|--------|-------------|----------|
| admin 전용 페이지 | admin만 접근 가능한 감사 로그 조회 페이지 | ✓ |
| DB만 저장, UI 없음 | 로그만 저장하고 조회 UI는 나중에 | |
| Claude에게 맡김 | 적절한 수준으로 판단 | |

**User's choice:** admin 전용 페이지

| Option | Description | Selected |
|--------|-------------|----------|
| 90일 보관 | 90일 이전 로그 자동 삭제 | ✓ |
| 무제한 보관 | 영구 보관 | |
| Claude에게 맡김 | 적절한 기간 설정 | |

**User's choice:** 90일 보관

---

## 인증 세션 전략

| Option | Description | Selected |
|--------|-------------|----------|
| JWT 세션 | JWT 토큰에 세션 저장, DB 조회 없이 빠름 | ✓ |
| Database 세션 | DB에 세션 저장, 서버에서 세션 무효화 가능 | |
| Claude에게 맡김 | 기술적으로 최적의 선택 | |

**User's choice:** JWT 세션

| Option | Description | Selected |
|--------|-------------|----------|
| 24시간 | 24시간 후 만료, 활동 시 자동 갱신 | ✓ |
| 7일 | 7일 후 만료 | |
| 8시간 | 8시간(업무 시간) 후 만료 | |

**User's choice:** 24시간

| Option | Description | Selected |
|--------|-------------|----------|
| 허용 | 제한 없이 여러 기기에서 로그인 가능 | ✓ |
| 단일 세션만 | 새 로그인 시 기존 세션 무효화 | |
| Claude에게 맡김 | 기술적 타당성에 맞게 | |

**User's choice:** 허용

| Option | Description | Selected |
|--------|-------------|----------|
| 연결 목록 | Phase 1 핵심 기능인 DB 연결 목록으로 이동 | ✓ |
| 대시보드 (빈 상태) | 대시보드 레이아웃을 먼저 만들고 Phase 4에서 데이터 채움 | |
| Claude에게 맡김 | Phase별 진행에 맞게 판단 | |

**User's choice:** 연결 목록

| Option | Description | Selected |
|--------|-------------|----------|
| 사이드바 네비게이션 | 왼쪽 사이드바에 메뉴 | ✓ |
| 상단 탭바 | 상단 탭바로 메뉴 전환 | |
| Claude에게 맡김 | 관리 도구 UX에 맞게 판단 | |

**User's choice:** 사이드바 네비게이션

| Option | Description | Selected |
|--------|-------------|----------|
| 현재 기능만 | 연결 관리, 사용자 관리(admin), 감사 로그(admin) | ✓ |
| 전체 메뉴 (disabled) | 모든 메뉴 보여주되 미구현 메뉴는 비활성화 | |
| Claude에게 맡김 | 적절한 구성으로 | |

**User's choice:** 현재 기능만

| Option | Description | Selected |
|--------|-------------|----------|
| 라이트 모드만 | 라이트 모드로 시작, 나중에 다크 모드 추가 가능 | ✓ |
| 다크/라이트 모두 | 초기부터 양쪽 모드 지원 | |
| Claude에게 맡김 | 기술 스택에 맞게 판단 | |

**User's choice:** 라이트 모드만

---

## Claude's Discretion

- 사용자 관리 화면의 정확한 레이아웃과 UX 디테일
- 비밀번호 변경 강제 플로우의 UX 디테일
- 에러 메시지 문구와 토스트/알림 스타일
- 사이드바 접기/펼치기 동작

## Deferred Ideas

None — discussion stayed within phase scope
