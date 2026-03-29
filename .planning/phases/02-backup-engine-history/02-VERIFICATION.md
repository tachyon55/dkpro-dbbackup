---
phase: 02-backup-engine-history
verified: 2026-03-30T00:00:00Z
status: human_needed
score: 10/10 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 7/10
  gaps_closed:
    - "백업 히스토리에서 날짜, 상태, 파일명, 크기, 소요시간을 조회할 수 있다 (HIST-01)"
    - "백업 성공/실패 상세 로그를 조회할 수 있다 (HIST-02)"
    - "백업 파일을 웹에서 다운로드할 수 있다 (HIST-03)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "연결 관리 페이지에서 MySQL/PostgreSQL 연결의 백업 실행 버튼을 클릭하여 실시간 진행 상황 확인"
    expected: "모달이 즉시 열리고, 로그 라인이 mysqldump/pg_dump 실행 중 실시간으로 스트리밍되며, 진행 바가 10% → 50% → 100%로 전진하고, 완료 후 파일 크기와 소요시간이 요약에 표시된다"
    why_human: "라이브 데이터베이스 서버 필요 — SSE 이벤트 타이밍과 로그 스트리밍을 정적으로 검증할 수 없음"
  - test: "viewer 역할 계정으로 로그인하여 연결 관리 페이지 방문"
    expected: "연결 카드에 '백업 실행' 버튼이 표시되지 않음"
    why_human: "viewer 자격증명으로 브라우저 세션 필요"
  - test: "한 연결에서 백업이 실행 중일 때 같은 연결의 '백업 실행' 버튼을 다시 클릭"
    expected: "토스트 오류 '이미 백업이 실행 중입니다. 완료 후 다시 시도해주세요.' 표시, 버튼은 Loader2 스피너와 함께 비활성화"
    why_human: "두 사용자 상호작용의 타이밍 조율 필요 — globalThis Set 상태는 런타임에 의존"
  - test: "브라우저 탭을 백업 실행 중에 닫은 후 BackupHistory 테이블 확인"
    expected: "BackupHistory 레코드에 status = success (또는 실제 오류와 함께 failed), 파일이 디스크에 존재"
    why_human: "클라이언트 연결 해제 후 서버 사이드 DB 검사 필요"
  - test: "사이드바의 '백업 히스토리' 링크를 클릭하여 히스토리 페이지 방문, 백업 레코드가 있는 경우"
    expected: "연결명, DB타입 배지, 상태 배지, 파일명, 파일크기(KB/MB), 소요시간(MM:SS), 실행일시 7개 컬럼이 있는 테이블 표시"
    why_human: "테이블 렌더링과 데이터 형식 확인을 위해 실제 BackupHistory 레코드와 브라우저 세션 필요"
  - test: "히스토리 테이블의 행을 클릭하여 상세 패널 확인"
    expected: "오른쪽 Sheet(480px)가 열리고 파일 정보, SHA-256 해시(복사 버튼), 다운로드 버튼, 전체 실행 로그가 표시됨"
    why_human: "Sheet 컴포넌트 동작, 클립보드 복사, 파일 다운로드 스트리밍은 브라우저에서만 검증 가능"
---

# Phase 2: Backup Engine + History Verification Report

**Phase Goal:** 사용자가 수동으로 백업을 실행하고 진행 상황을 실시간으로 확인하며 히스토리를 조회할 수 있다
**Verified:** 2026-03-30
**Status:** human_needed (자동화 검사 전체 통과 — 런타임 동작 검증 항목 대기 중)
**Re-verification:** Yes — Plan 03 gap closure (HIST-01, HIST-02, HIST-03) 이후 재검증

---

## Re-verification Summary

| Gap (Previous) | Was | Now | Closed? |
|---|---|---|---|
| HIST-01: 히스토리 목록 UI + GET /api/backups | MISSING | VERIFIED | Yes |
| HIST-02: 상세 로그 뷰어 + GET /api/backups/[jobId] | MISSING | VERIFIED | Yes |
| HIST-03: 파일 다운로드 + GET /api/backups/[jobId]/download | MISSING | VERIFIED | Yes |

**Regressions:** None detected. Plan 01/02 artifacts all pass regression checks.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | 연결을 선택하고 즉시 백업을 실행하면 진행 상황이 실시간 표시된다 | ✓ VERIFIED | ConnectionCard → BackupConfirmDialog → POST /api/backups → SSE stream → BackupProgressModal — end-to-end wired |
| 2 | 백업 파일이 서버 로컬 디스크에 저장되고 DB명/날짜/시간이 파일명에 포함된다 | ✓ VERIFIED | `generateBackupFileName()`: `{sanitizedDbName}_{yyyyMMdd_HHmmss}.{ext}`; stdout piped to `createWriteStream(outputPath)` |
| 3 | 동일 연결에 대한 동시 백업 실행이 차단된다 | ✓ VERIFIED | `isBackupRunning()` / `lockBackup()` via globalThis Set; POST returns 409; client shows toast |
| 4 | 백업 히스토리에서 날짜, 상태, 파일명, 크기, 소요시간을 조회할 수 있다 | ✓ VERIFIED | GET /api/backups (paginated, filtered) → HistoryPageClient table with 7 columns; formatFileSize + formatDuration helpers |
| 5 | 백업 파일을 웹에서 다운로드하고 SHA-256 해시로 무결성을 검증할 수 있다 | ✓ VERIFIED | GET /api/backups/[jobId]/download streams file with Content-Disposition; sha256 stored + displayed in BackupDetailPanel with clipboard copy |

**Score:** 10/10 truths verified (up from 7/10)

---

## Required Artifacts

### Plan 01: Backup Engine Foundation (regression check)

| Artifact | Status | Evidence |
|---|---|---|
| `prisma/schema.prisma` | ✓ VERIFIED | BackupHistory model, BackupStatus enum, AuditEventType BACKUP_START/COMPLETE/FAIL — unchanged |
| `src/lib/backup-store.ts` | ✓ VERIFIED | isBackupRunning, lockBackup, unlockBackup, recoverOrphanedBackups — unchanged |
| `src/lib/backup-tools.ts` | ✓ VERIFIED | buildSpawnArgs, generateBackupFileName, PGPASSWORD env — unchanged |
| `src/lib/backup-engine.ts` | ✓ VERIFIED | runBackup(), spawn(), createHash("sha256"), no exec() — unchanged |

### Plan 02: Backup Trigger API + UI (regression check)

| Artifact | Status | Evidence |
|---|---|---|
| `src/app/api/backups/route.ts` | ✓ VERIFIED | POST handler preserved; GET handler added alongside |
| `src/app/api/backups/[jobId]/stream/route.ts` | ✓ VERIFIED | force-dynamic, SSE headers, runBackup call — unchanged |
| `src/components/backup/BackupConfirmDialog.tsx` | ✓ VERIFIED | AlertDialog, "백업을 실행하시겠습니까?" — unchanged |
| `src/components/backup/BackupProgressModal.tsx` | ✓ VERIFIED | new EventSource, bg-neutral-950, max-h-64 — unchanged |
| `src/components/connections/ConnectionCard.tsx` | ✓ VERIFIED | 백업 실행 JSX text, Loader2, onBackup prop — unchanged |
| `src/app/(app)/connections/page.tsx` | ✓ VERIFIED | BackupConfirmDialog, BackupProgressModal, /api/backups — unchanged |

### Plan 03: Backup History Read-Path (gap closure)

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/app/api/backups/route.ts` (GET) | Paginated history list with filters | ✓ VERIFIED | GET handler: connectionId/status/startDate/endDate filters, cursor pagination, BigInt toString(), total count |
| `src/app/api/backups/[jobId]/route.ts` | Single record + fullLog + fileExists | ✓ VERIFIED | findUnique (no select restriction — all fields returned), fileExists via existsSync, fileSizeBytes.toString() |
| `src/app/api/backups/[jobId]/download/route.ts` | File download stream | ✓ VERIFIED | createReadStream, Readable.toWeb(), Content-Disposition attachment, application/octet-stream, status=success guard |
| `src/app/(app)/history/page.tsx` | History server component | ✓ VERIFIED | auth() → redirect if unauthed, renders HistoryPageClient |
| `src/app/(app)/history/HistoryPageClient.tsx` | Table, filters, pagination, detail panel | ✓ VERIFIED | "use client", fetch /api/backups, formatFileSize, formatDuration, BackupDetailPanel, "이전"/"다음", "전체 N건", "백업 히스토리가 없습니다" |
| `src/components/backup/BackupDetailPanel.tsx` | Right Sheet with log, SHA-256, download | ✓ VERIFIED | Sheet w-[480px], SHA-256 section, "복사됨" feedback, /api/backups/{jobId}/download link, bg-neutral-950, max-h-[320px] |
| `src/components/layout/Sidebar.tsx` | "백업 히스토리" nav item | ✓ VERIFIED | `{ href: "/history", label: "백업 히스토리", icon: History }` — no adminOnly flag |

---

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `HistoryPageClient.tsx` | `GET /api/backups` | fetch with query params | ✓ WIRED | Line 115: `fetch(\`/api/backups?${params.toString()}\`)` |
| `BackupDetailPanel.tsx` | `GET /api/backups/[jobId]` | fetch on jobId change | ✓ WIRED | Line 101: `fetch(\`/api/backups/${jobId}\`)` |
| `BackupDetailPanel.tsx` | `GET /api/backups/[jobId]/download` | window.open | ✓ WIRED | Line 186: `window.open(\`/api/backups/${jobId}/download\`)` |
| `Sidebar.tsx` | `/history` route | NavItem href | ✓ WIRED | `href: "/history"` in navItems array |
| `history/page.tsx` | `HistoryPageClient` | import + render | ✓ WIRED | `import { HistoryPageClient } from "./HistoryPageClient"` |
| `GET /api/backups/route.ts` | `prisma.backupHistory` | findMany + count | ✓ WIRED | Lines 44, 67: real DB queries with where clause |
| `GET /api/backups/[jobId]/route.ts` | `prisma.backupHistory` | findUnique | ✓ WIRED | Line 20: `prisma.backupHistory.findUnique({ where: { id: jobId } })` |
| `GET /api/backups/[jobId]/download/route.ts` | file system | createReadStream(filePath) | ✓ WIRED | Uses `record.filePath` from DB record to stream real file |
| (previously verified) `ConnectionCard.tsx` → `BackupConfirmDialog.tsx` | — | onBackup prop | ✓ WIRED | Unchanged |
| (previously verified) `stream/route.ts` → `backup-engine.ts` | — | import runBackup | ✓ WIRED | Unchanged |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `HistoryPageClient.tsx` | `items[]` | GET /api/backups → `prisma.backupHistory.findMany()` | Yes — real DB query with filters | ✓ FLOWING |
| `BackupDetailPanel.tsx` | `detail` | GET /api/backups/{jobId} → `prisma.backupHistory.findUnique()` | Yes — all fields including fullLog | ✓ FLOWING |
| `download/route.ts` | file stream | `record.filePath` from DB → `createReadStream(filePath)` | Yes — real file from disk | ✓ FLOWING |
| `BackupProgressModal.tsx` | `logLines`, `status`, `progress` | EventSource → SSE events from runBackup() → child process stdout/stderr | Yes — real process output | ✓ FLOWING |
| `ConnectionsPageClient.tsx` | `connections[]` | GET /api/connections → prisma.dbConnection.findMany() | Yes — real DB query | ✓ FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|---|---|---|---|
| GET /api/backups handler exists | Pattern match in route.ts | `export async function GET(` found | ✓ PASS |
| GET handler queries real DB | prisma.backupHistory.findMany in route.ts | Lines 44, 67 confirmed | ✓ PASS |
| GET /api/backups/[jobId] returns fullLog | No select restriction in findUnique | No `select:` clause — all fields returned | ✓ PASS |
| Download endpoint sets Content-Disposition | Pattern match | `attachment; filename=` confirmed | ✓ PASS |
| History page exists at /history | File existence check | `src/app/(app)/history/page.tsx` exists | ✓ PASS |
| Sidebar history nav item added | Pattern match | `href: "/history"` in navItems | ✓ PASS |
| BackupDetailPanel SHA-256 copy | Pattern match | `navigator.clipboard.writeText(detail.sha256)`, "복사됨" confirmed | ✓ PASS |
| TypeScript compile error count | `npx tsc --noEmit` | 1 pre-existing error (tabs.tsx: @radix-ui/react-tabs) — 0 new errors | ✓ PASS |
| No exec() in backup-engine.ts | grep exec( | 0 matches | ✓ PASS |
| Anti-patterns in Plan 03 files | grep TODO/FIXME/placeholder/return null | No code stubs found (SelectValue placeholder is UI attribute) | ✓ PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| BKUP-01 | 02-02 | 사용자가 수동으로 즉시 백업을 실행할 수 있다 | ✓ SATISFIED | ConnectionCard backup button → confirm dialog → POST /api/backups → SSE stream |
| BKUP-02 | 02-01 | 백업이 네이티브 dump 도구(mysqldump, pg_dump 등)를 사용 | ✓ SATISFIED | buildSpawnArgs() returns correct cmd/args per DB type; spawn() used |
| BKUP-03 | 02-02 | 백업 진행 상황이 WebSocket(SSE)으로 실시간 표시된다 | ✓ SATISFIED | SSE stream route; BackupProgressModal with EventSource; started/log/progress/complete/error events |
| BKUP-04 | 02-01 | 백업 파일이 서버 로컬 디스크에 저장된다 | ✓ SATISFIED | createWriteStream(outputPath); getBackupDir() creates `{BACKUP_BASE_DIR}/{connectionId}/`; filePath written to BackupHistory |
| BKUP-05 | 02-01, 02-02 | 동일 연결에 대한 동시 백업이 방지된다 | ✓ SATISFIED | globalThis._backupInProgress Set; isBackupRunning() check in POST returns 409; unlockBackup() in finally |
| BKUP-06 | 02-01 | 백업 파일명에 DB명, 날짜, 시간이 포함된다 | ✓ SATISFIED | generateBackupFileName(): `{sanitizedDbName}_{yyyyMMdd_HHmmss}.{ext}` |
| HIST-01 | 02-03 | 백업 히스토리를 조회할 수 있다 (날짜, 상태, 파일명, 크기, 소요시간) | ✓ SATISFIED | GET /api/backups + HistoryPageClient table with 7 columns, filters, pagination |
| HIST-02 | 02-03 | 백업 성공/실패 상세 로그를 조회할 수 있다 | ✓ SATISFIED | GET /api/backups/[jobId] returns fullLog; BackupDetailPanel renders `<pre>` log area |
| HIST-03 | 02-03 | 백업 파일을 웹에서 다운로드할 수 있다 | ✓ SATISFIED | GET /api/backups/[jobId]/download streams file; BackupDetailPanel has download button; fileExists guard for missing files |
| HIST-04 | 02-01 | 백업 파일의 SHA-256 해시로 무결성을 검증할 수 있다 | ✓ SATISFIED | createHash("sha256") streaming in backup-engine.ts; sha256 stored in BackupHistory; BackupDetailPanel displays hash with clipboard copy |

**All 10 requirements: SATISFIED.**

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| None | — | — | — | All Phase 2 files are substantively implemented. No placeholder code, empty returns, or TODO stubs detected. |

---

## Human Verification Required

### 1. Real-time SSE Backup Flow

**Test:** Connect a real MySQL or PostgreSQL instance, click "백업 실행" on its connection card, confirm the dialog, and observe the progress modal.
**Expected:** Modal opens immediately, log lines stream in real time as mysqldump/pg_dump produces output, progress bar advances from 10% to 50% to 100%, result summary shows file size and duration.
**Why human:** Requires a live database server; cannot verify SSE event timing or log streaming statically.

### 2. Viewer Role UI Hiding

**Test:** Log in with a viewer-role account and navigate to the connections page.
**Expected:** Connection cards are visible but no "백업 실행" button appears on any card.
**Why human:** Requires browser session with viewer credentials.

### 3. Concurrent Backup Block

**Test:** Start a backup on a connection, then (before it finishes) click "백업 실행" on the same connection again.
**Expected:** Toast error "이미 백업이 실행 중입니다. 완료 후 다시 시도해주세요." The backup button shows the Loader2 spinner and is disabled.
**Why human:** Requires orchestrating two interactions with timing; globalThis Set state depends on runtime.

### 4. Client Disconnect — Backup Continues Server-Side

**Test:** Start a backup, then close the browser tab mid-backup. After the backup would have completed, check the BackupHistory table.
**Expected:** BackupHistory record shows `status = success` (or `failed` with actual error), not `running`. The file should exist on disk.
**Why human:** Requires server-side DB inspection after client disconnect.

### 5. History Table Display

**Test:** Navigate to /history via the sidebar after running at least one backup.
**Expected:** Table shows all 7 columns (연결명, DB타입, 상태, 파일명, 파일크기 in KB/MB, 소요시간 in MM:SS, 실행일시). Filters (연결별/상태별/날짜별) narrow results correctly. Pagination "이전"/"다음" and "전체 N건" work.
**Why human:** Requires real BackupHistory records in DB; table rendering and filter interaction needs browser.

### 6. Detail Panel + Download + SHA-256 Copy

**Test:** Click a successful backup row in the history table to open the detail panel.
**Expected:** Right Sheet opens at 480px width showing file info, SHA-256 hash with working "복사" → "복사됨" → "복사" clipboard feedback, "파일 다운로드" button triggers file download. Failed backup rows show error message box and hide download/SHA-256 sections.
**Why human:** Sheet component interaction, clipboard API, and file download streaming require browser session.

---

## Gaps Summary

No gaps remain. All automated checks pass and all 10 requirements are satisfied.

The three previously-failing gaps (HIST-01, HIST-02, HIST-03) were closed by Plan 03, which added:
- Paginated history list API with filters (GET /api/backups)
- Full detail API with fullLog and fileExists (GET /api/backups/[jobId])
- File download API (GET /api/backups/[jobId]/download)
- History page with table, filters, pagination, and detail Sheet (HistoryPageClient + BackupDetailPanel)
- Sidebar navigation entry for /history

The only pre-existing TypeScript error (`tabs.tsx: @radix-ui/react-tabs`) is unrelated to Phase 2 and was present before Phase 2 began.

Six items are deferred to human verification, all requiring a running server with real database connections or browser-level interaction (SSE streaming, clipboard API, file download, role-based UI, concurrent state).

---

_Verified: 2026-03-30_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — after Plan 03 gap closure_
