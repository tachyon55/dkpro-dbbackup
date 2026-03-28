# Requirements: DataBase Backup Manager Web

**Defined:** 2026-03-28
**Core Value:** 다수의 데이터베이스를 하나의 웹 인터페이스에서 안전하게 백업하고 관리

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication & Authorization

- [x] **AUTH-01**: 사용자가 이메일/비밀번호로 로그인할 수 있다
- [x] **AUTH-02**: 사용자가 로그아웃할 수 있다
- [x] **AUTH-03**: 세션이 브라우저 새로고침 후에도 유지된다
- [x] **AUTH-04**: admin이 사용자를 생성/수정/삭제할 수 있다
- [x] **AUTH-05**: 사용자에게 admin/operator/viewer 역할을 부여할 수 있다
- [x] **AUTH-06**: viewer는 조회만, operator는 백업 실행/쿼리 실행, admin은 모든 권한을 가진다
- [x] **AUTH-07**: 모든 주요 작업(백업, 연결 변경, 사용자 변경)이 감사 로그에 기록된다

### Connection Management

- [x] **CONN-01**: 사용자가 DB 연결을 생성할 수 있다 (이름, 호스트, 포트, 사용자명, 비밀번호, DB명, 타입)
- [x] **CONN-02**: 사용자가 DB 연결을 수정할 수 있다
- [x] **CONN-03**: 사용자가 DB 연결을 삭제할 수 있다
- [x] **CONN-04**: 사용자가 연결 테스트를 실행할 수 있다 (저장 전 검증)
- [x] **CONN-05**: 6가지 DB 타입을 지원한다 (MySQL, MariaDB, PostgreSQL, SQL Server, Oracle, SQLite)
- [x] **CONN-06**: DB 비밀번호가 AES-256-GCM으로 암호화되어 저장된다
- [x] **CONN-07**: 연결 후 사용 가능한 DB 목록을 조회할 수 있다
- [x] **CONN-08**: 연결별 시각적 구분 색상을 지정할 수 있다

### Backup Execution

- [ ] **BKUP-01**: 사용자가 수동으로 즉시 백업을 실행할 수 있다
- [ ] **BKUP-02**: 백업이 네이티브 dump 도구(mysqldump, pg_dump 등)를 사용하여 실행된다
- [ ] **BKUP-03**: 백업 진행 상황이 WebSocket으로 실시간 표시된다
- [ ] **BKUP-04**: 백업 파일이 서버 로컬 디스크에 저장된다
- [ ] **BKUP-05**: 동일 연결에 대한 동시 백업이 방지된다 (동시성 제어)
- [ ] **BKUP-06**: 백업 파일명에 DB명, 날짜, 시간이 포함된다

### Scheduled Backup

- [ ] **SCHD-01**: 연결별 백업 스케줄을 설정할 수 있다 (매일 지정 시간)
- [ ] **SCHD-02**: 스케줄을 활성화/비활성화할 수 있다
- [ ] **SCHD-03**: 스케줄에 백업 저장 경로를 지정할 수 있다
- [ ] **SCHD-04**: 보관 일수를 설정하여 오래된 백업이 자동 삭제된다
- [ ] **SCHD-05**: 보관 정리 시 마지막 성공 백업은 보존된다 (안전 가드)
- [ ] **SCHD-06**: 서버 재시작 후 중단된 스케줄이 정상 복구된다

### Backup History & Logs

- [ ] **HIST-01**: 백업 히스토리를 조회할 수 있다 (날짜, 상태, 파일명, 크기, 소요시간)
- [ ] **HIST-02**: 백업 성공/실패 상세 로그를 조회할 수 있다
- [ ] **HIST-03**: 백업 파일을 웹에서 다운로드할 수 있다
- [ ] **HIST-04**: 백업 파일의 SHA-256 해시로 무결성을 검증할 수 있다

### Dashboard

- [ ] **DASH-01**: 전체 연결 상태를 한눈에 볼 수 있다
- [ ] **DASH-02**: 최근 백업 결과(성공/실패)를 요약하여 보여준다
- [ ] **DASH-03**: 다음 예정된 스케줄 백업을 표시한다
- [ ] **DASH-04**: 백업 실패 또는 오래된 백업에 대한 경고를 표시한다

### SQL Query Executor

- [ ] **QURY-01**: 사용자가 연결을 선택하고 SQL을 실행할 수 있다
- [ ] **QURY-02**: SELECT 결과가 테이블 형태로 표시된다
- [ ] **QURY-03**: DML(INSERT/UPDATE/DELETE) 실행 시 영향받은 행 수가 표시된다
- [ ] **QURY-04**: 역할에 따라 실행 가능한 SQL 타입이 제한된다 (viewer: SELECT만)
- [ ] **QURY-05**: 쿼리 실행 시간이 표시된다
- [ ] **QURY-06**: 자주 사용하는 SQL을 저장하고 불러올 수 있다
- [ ] **QURY-07**: 저장된 쿼리를 수정/삭제할 수 있다

### Notifications

- [ ] **NOTF-01**: 백업 성공/실패 시 이메일 알림을 보낼 수 있다
- [ ] **NOTF-02**: 백업 성공/실패 시 Slack 알림을 보낼 수 있다
- [ ] **NOTF-03**: 알림 채널(이메일/Slack)을 설정할 수 있다
- [ ] **NOTF-04**: 연결별로 알림 활성화/비활성화할 수 있다

### Cloud Storage

- [ ] **CLOD-01**: 백업 파일을 S3 호환 클라우드 스토리지에 업로드할 수 있다
- [ ] **CLOD-02**: 클라우드 스토리지 연결 정보를 설정할 수 있다
- [ ] **CLOD-03**: 스케줄별로 클라우드 업로드 활성화/비활성화할 수 있다
- [ ] **CLOD-04**: 대용량 파일은 멀티파트 업로드로 처리된다

## v2 Requirements

Deferred to future release.

### Advanced Auth
- **AUTH-V2-01**: OAuth 로그인 (Google, GitHub)
- **AUTH-V2-02**: 2FA (이중 인증)

### Advanced Features
- **FEAT-V2-01**: 다중 스케줄 (하루 여러 번)
- **FEAT-V2-02**: 백업 압축 옵션 (gzip)
- **FEAT-V2-03**: 쿼리 노트북 (마크다운 + SQL 셀)
- **FEAT-V2-04**: 백업 크기 추이 차트

## Out of Scope

| Feature | Reason |
|---------|--------|
| DB 복원(Restore) UI | 매우 위험한 작업, CLI에서 신중하게 수행해야 함 |
| 스키마 마이그레이션 실행 | 백업 도구의 범위 밖, 별도 도구 사용 |
| 모바일 네이티브 앱 | 반응형 웹으로 대응 |
| 실시간 DB 모니터링 | 다른 제품 카테고리 |
| 멀티테넌시 | 내부 도구에 불필요한 복잡성 |
| 공개 회원가입 | DB 관리 도구에 부적절, admin이 사용자 생성 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 Plan 01-01 | Done |
| AUTH-02 | Phase 1 Plan 01-01 | Done |
| AUTH-03 | Phase 1 Plan 01-01 | Done |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 Plan 01-01 | Done |
| AUTH-07 | Phase 1 | Complete |
| CONN-01 | Phase 1 | Complete |
| CONN-02 | Phase 1 | Complete |
| CONN-03 | Phase 1 | Complete |
| CONN-04 | Phase 1 | Complete |
| CONN-05 | Phase 1 | Complete |
| CONN-06 | Phase 1 | Complete |
| CONN-07 | Phase 1 | Complete |
| CONN-08 | Phase 1 | Complete |
| BKUP-01 | Phase 2 | Pending |
| BKUP-02 | Phase 2 | Pending |
| BKUP-03 | Phase 2 | Pending |
| BKUP-04 | Phase 2 | Pending |
| BKUP-05 | Phase 2 | Pending |
| BKUP-06 | Phase 2 | Pending |
| HIST-01 | Phase 2 | Pending |
| HIST-02 | Phase 2 | Pending |
| HIST-03 | Phase 2 | Pending |
| HIST-04 | Phase 2 | Pending |
| SCHD-01 | Phase 3 | Pending |
| SCHD-02 | Phase 3 | Pending |
| SCHD-03 | Phase 3 | Pending |
| SCHD-04 | Phase 3 | Pending |
| SCHD-05 | Phase 3 | Pending |
| SCHD-06 | Phase 3 | Pending |
| NOTF-01 | Phase 3 | Pending |
| NOTF-02 | Phase 3 | Pending |
| NOTF-03 | Phase 3 | Pending |
| NOTF-04 | Phase 3 | Pending |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| QURY-01 | Phase 4 | Pending |
| QURY-02 | Phase 4 | Pending |
| QURY-03 | Phase 4 | Pending |
| QURY-04 | Phase 4 | Pending |
| QURY-05 | Phase 4 | Pending |
| QURY-06 | Phase 4 | Pending |
| QURY-07 | Phase 4 | Pending |
| CLOD-01 | Phase 4 | Pending |
| CLOD-02 | Phase 4 | Pending |
| CLOD-03 | Phase 4 | Pending |
| CLOD-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 50 total (AUTH×7, CONN×8, BKUP×6, SCHD×6, HIST×4, DASH×4, QURY×7, NOTF×4, CLOD×4)
- Mapped to phases: 50
- Unmapped: 0 ✓

Note: The file header previously stated 46 requirements; actual count is 50 based on enumerated entries above.

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 — traceability mapped after roadmap creation*
