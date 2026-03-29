---
status: partial
phase: 02-backup-engine-history
source: [02-VERIFICATION.md]
started: 2026-03-30T00:00:00Z
updated: 2026-03-30T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. SSE 실시간 백업 진행 스트리밍
expected: 모달이 즉시 열리고, 로그 라인이 mysqldump/pg_dump 실행 중 실시간으로 스트리밍되며, 진행 바가 10% → 50% → 100%로 전진하고, 완료 후 파일 크기와 소요시간이 요약에 표시된다
result: [pending]

### 2. Viewer 역할 백업 버튼 숨김
expected: 연결 카드에 '백업 실행' 버튼이 표시되지 않음
result: [pending]

### 3. 동시 백업 차단
expected: 토스트 오류 '이미 백업이 실행 중입니다. 완료 후 다시 시도해주세요.' 표시, 버튼은 Loader2 스피너와 함께 비활성화
result: [pending]

### 4. 클라이언트 연결 해제 후 서버 백업 완료
expected: BackupHistory 레코드에 status = success (또는 실제 오류와 함께 failed), 파일이 디스크에 존재
result: [pending]

### 5. 히스토리 테이블 렌더링
expected: 연결명, DB타입 배지, 상태 배지, 파일명, 파일크기(KB/MB), 소요시간(MM:SS), 실행일시 7개 컬럼이 있는 테이블 표시
result: [pending]

### 6. 상세 패널 + 다운로드 + 클립보드
expected: 오른쪽 Sheet(480px)가 열리고 파일 정보, SHA-256 해시(복사 버튼), 다운로드 버튼, 전체 실행 로그가 표시됨
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
