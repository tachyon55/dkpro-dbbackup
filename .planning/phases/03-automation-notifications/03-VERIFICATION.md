---
phase: 03-automation-notifications
verified: 2026-03-31T00:00:00Z
status: passed
score: 5/5 truths verified
re_verification: true
re_verification_meta:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "SCHD-03: schedule.backupPath now reaches backup engine — runBackup accepts optional backupDir parameter, scheduler passes it, void dead code removed"
  gaps_remaining: []
  regressions: []
---

# Phase 3: Automation + Notifications Verification Report

**Phase Goal:** 스케줄에 따라 백업이 자동으로 실행되고 결과가 이메일/Slack으로 알림된다
**Verified:** 2026-03-31T00:00:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 03-04)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 연결별로 매일 지정 시간에 자동 백업이 실행되고 활성화/비활성화할 수 있다 | ✓ VERIFIED | `startSchedule()` in scheduler.ts registers Asia/Seoul cron tasks; PATCH toggle endpoint in schedules/[id]/route.ts; Switch on ConnectionCard with optimistic update |
| 2 | 보관 일수가 지난 백업 파일이 자동 삭제되고, 마지막 성공 백업은 삭제되지 않는다 | ✓ VERIFIED | cleanup.ts `runRetentionCleanup` queries last success with `findFirst({where:{status:"success"}})` and excludes it; runs in scheduler `finally` block (line 139) |
| 3 | 서버 재시작 후 중단된 스케줄이 정상 복구된다 | ✓ VERIFIED | instrumentation.ts `register()` calls `recoverOrphanedBackups()` then `loadAllSchedules()` guarded by `NEXT_RUNTIME === "nodejs"`; catch-up detection in loadAllSchedules via `getMostRecentFireTime` |
| 4 | 백업 성공/실패 시 이메일 또는 Slack으로 알림이 전송된다 | ✓ VERIFIED | scheduler.ts calls `sendBackupNotification` in both success (line 117) and error (line 134) paths with `.catch()` guard; notifications.ts checks `schedule.notificationsEnabled` then fetches global settings |
| 5 | 스케줄에 지정된 백업 저장 경로가 실제 백업 파일에 적용된다 (SCHD-03) | ✓ VERIFIED | Plan 03-04 closed the gap: `runBackup(historyId, send, backupDir?)` signature at backup-engine.ts line 31; `resolvedBackupDir = backupDir ?? await getBackupDir(connectionId)` at line 95; `path.join(resolvedBackupDir, fileName)` at line 97; scheduler.ts line 108 passes `runBackup(record.id, noop, backupDir)`; `void backupDir` dead code removed |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/scheduler.ts` | Cron registry, startSchedule, stopSchedule, loadAllSchedules, runScheduledBackup | ✓ VERIFIED | All exports present; globalThis singleton; Asia/Seoul timezone; catch-up detection; sendBackupNotification wired; backupDir passed to runBackup |
| `src/lib/backup-engine.ts` | runBackup with optional backupDir override | ✓ VERIFIED | Signature `runBackup(historyId, send, backupDir?: string)` at line 31; resolvedBackupDir at line 95; path.join uses resolvedBackupDir at line 97 |
| `src/lib/cleanup.ts` | Retention cleanup with safety guard | ✓ VERIFIED | runRetentionCleanup exported; lastSuccess exclusion confirmed |
| `src/instrumentation.ts` | Server bootstrap hook | ✓ VERIFIED | register() exports; NEXT_RUNTIME guard; recoverOrphanedBackups + loadAllSchedules called |
| `prisma/schema.prisma` | Schedule and NotificationSettings models | ✓ VERIFIED | model Schedule and model NotificationSettings present; SCHEDULE_CREATE enum value confirmed |
| `src/app/api/schedules/route.ts` | GET list, POST create | ✓ VERIFIED | Both exports present; startSchedule called on create when isEnabled; Zod minute refine; viewer 403; audit log SCHEDULE_CREATE |
| `src/app/api/schedules/[id]/route.ts` | GET, PUT, DELETE, PATCH | ✓ VERIFIED | All four exports; startSchedule/stopSchedule synced on PUT and PATCH; stopSchedule before delete |
| `src/app/api/connections/[id]/route.ts` | stopSchedule on connection delete | ✓ VERIFIED | Line 149: `stopSchedule(id)` before prisma.dbConnection.delete |
| `src/lib/notifications.ts` | sendBackupNotification, buildEmailBody, buildSlackMessage, sendTestEmail, sendTestSlack | ✓ VERIFIED | All exports present; decrypt used for smtpPassword and slackWebhookUrl; notificationsEnabled guard; findFirst for global settings |
| `src/app/api/settings/notifications/route.ts` | GET (safe fields), PUT (encrypt + preserve) | ✓ VERIFIED | GET omits smtpPassword/slackWebhookUrl, returns boolean indicators; PUT calls encrypt() for new values, preserves existing when input is empty |
| `src/app/api/settings/notifications/test/route.ts` | POST test email/slack | ✓ VERIFIED | z.enum(["email","slack"]); admin guard; decrypt before sendTestEmail/sendTestSlack |
| `src/app/(app)/settings/page.tsx` | Admin-only settings page | ✓ VERIFIED | role !== "admin" redirect to /connections; renders NotificationSettingsForm |
| `src/components/settings/NotificationSettingsForm.tsx` | Tabbed SMTP + Slack form | ✓ VERIFIED | Tabs with "이메일 (SMTP)" and "Slack"; smtpPasswordSet/slackWebhookUrlSet placeholder pattern; test buttons present |
| `src/components/schedule/ScheduleModal.tsx` | Schedule CRUD dialog | ✓ VERIFIED | DialogTitle "스케줄 설정 —"; AlertDialog with deletion warning; fetch POST/PUT/DELETE |
| `src/components/connections/ConnectionCard.tsx` | Schedule row with toggle | ✓ VERIFIED | onScheduleToggle/onScheduleClick props; getNextRunDisplay; "스케줄 미설정"; aria-label "스케줄 활성화/비활성화" |
| `src/components/layout/Sidebar.tsx` | Settings nav item (admin-only) | ✓ VERIFIED | `{href: "/settings", label: "설정", icon: Settings, adminOnly: true}` at line 21 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/instrumentation.ts` | `src/lib/scheduler.ts` | `loadAllSchedules()` import | ✓ WIRED | Line 4: `const { loadAllSchedules } = await import("@/lib/scheduler")` |
| `src/lib/scheduler.ts` | `src/lib/backup-engine.ts` | `runBackup(record.id, noop, backupDir)` | ✓ WIRED | Line 108: third argument backupDir now passed (gap closed by plan 03-04) |
| `src/lib/scheduler.ts` | `src/lib/cleanup.ts` | `runRetentionCleanup()` after backup | ✓ WIRED | Line 139: `await runRetentionCleanup(connectionId)` in finally block |
| `src/instrumentation.ts` | `src/lib/backup-store.ts` | `recoverOrphanedBackups()` on startup | ✓ WIRED | Line 3: import and call at line 6 |
| `src/app/api/schedules/route.ts` | `src/lib/scheduler.ts` | `startSchedule` on create | ✓ WIRED | Line 5 import; line 105 call |
| `src/app/api/schedules/[id]/route.ts` | `src/lib/scheduler.ts` | `stopSchedule` on toggle/delete | ✓ WIRED | Line 5 import; stopSchedule at lines 109, 147, 205 |
| `src/components/schedule/ScheduleModal.tsx` | `/api/schedules` | fetch POST/PUT/DELETE | ✓ WIRED | Lines 118, 125, 154: fetch calls to /api/schedules |
| `src/app/api/connections/[id]/route.ts` | `src/lib/scheduler.ts` | `stopSchedule` on connection delete | ✓ WIRED | Lines 7 + 149 |
| `src/lib/scheduler.ts` | `src/lib/notifications.ts` | `sendBackupNotification` after backup | ✓ WIRED | Lines 114–117 (success) and 132–134 (error): dynamic import and call, each wrapped in `.catch()` |
| `src/lib/notifications.ts` | Prisma NotificationSettings | `prisma.notificationSettings.findFirst()` | ✓ WIRED | Line 165 |
| `src/lib/notifications.ts` | `src/lib/crypto.ts` | `decrypt()` for SMTP and Slack | ✓ WIRED | Lines 89, 108 |
| `src/components/layout/Sidebar.tsx` | `/settings` | navItems entry adminOnly | ✓ WIRED | Line 21 confirmed |
| `src/lib/backup-engine.ts` | `src/lib/backup-tools.ts` | `getBackupDir()` as fallback | ✓ WIRED | Line 70 dynamic import; line 95 `backupDir ?? await getBackupDir(connectionId)` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ConnectionCard.tsx` | `connection.schedule` | `schedules[conn.id]` map in ConnectionsPageClient | `fetchSchedules()` fetches `/api/schedules` → prisma.schedule.findMany | ✓ FLOWING |
| `NotificationSettingsForm.tsx` | smtpEnabled, smtpPasswordSet, etc. | `GET /api/settings/notifications` | prisma.notificationSettings.findFirst() — returns null if not yet configured (expected) | ✓ FLOWING |
| `ScheduleModal.tsx` | form state (hour, minute, backupPath, etc.) | props from parent (scheduleTarget schedule data) | Populated from fetched schedules map | ✓ FLOWING |
| `runBackup()` in backup-engine.ts | `resolvedBackupDir` | `backupDir` arg from scheduler, or `getBackupDir()` DB lookup | Custom path flows from Schedule.backupPath → scheduler → runBackup → path.join | ✓ FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable server entry points (Next.js server requires full database; cannot start server in isolation during verification).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SCHD-01 | 03-01, 03-02 | 연결별 백업 스케줄 설정 (매일 지정 시간) | ✓ SATISFIED | Schedule model 1:1 with DbConnection; startSchedule with hour/minute; ScheduleModal create flow |
| SCHD-02 | 03-01, 03-02 | 스케줄 활성화/비활성화 | ✓ SATISFIED | PATCH toggle endpoint; ConnectionCard Switch with optimistic update; isEnabled field |
| SCHD-03 | 03-01, 03-02, 03-04 | 스케줄에 백업 저장 경로 지정 | ✓ SATISFIED | Gap closed by plan 03-04: `runBackup` now accepts `backupDir?` param; scheduler passes `backupDir` computed from `schedule.backupPath`; `resolvedBackupDir` used in `path.join`; dead code removed |
| SCHD-04 | 03-01 | 보관 일수 설정 및 자동 삭제 | ✓ SATISFIED | retentionDays in Schedule; cleanup.ts computes cutoff and deletes candidates |
| SCHD-05 | 03-01 | 마지막 성공 백업 보존 | ✓ SATISFIED | cleanup.ts: findFirst status="success", excludes with `id:{not:lastSuccess.id}` |
| SCHD-06 | 03-01 | 서버 재시작 후 스케줄 복구 | ✓ SATISFIED | instrumentation.ts register() runs loadAllSchedules(); catch-up detection with catchUpOnRestart flag |
| NOTF-01 | 03-03 | 백업 성공/실패 시 이메일 알림 | ✓ SATISFIED | scheduler wires sendBackupNotification; notifications.ts sendEmail via Nodemailer SMTP |
| NOTF-02 | 03-03 | 백업 성공/실패 시 Slack 알림 | ✓ SATISFIED | notifications.ts sendSlack via Incoming Webhook fetch POST; slackEnabled guard |
| NOTF-03 | 03-03 | 알림 채널(이메일/Slack) 설정 | ✓ SATISFIED | Settings page /settings; NotificationSettingsForm tabbed SMTP + Slack; GET/PUT API with encrypted storage |
| NOTF-04 | 03-03 | 연결별 알림 활성화/비활성화 | ✓ SATISFIED | Schedule.notificationsEnabled field; sendBackupNotification checks it before sending |

### Anti-Patterns Found

None. The `void backupDir` dead code that was the sole anti-pattern from the initial verification has been removed (plan 03-04, scheduler.ts line 85 deleted).

### Human Verification Required

#### 1. Schedule Cron Fires at Correct Time

**Test:** With a running server and PostgreSQL, create a schedule for 1 minute from now, wait for it to fire, verify a BackupHistory record appears with status "running" then "completed"
**Expected:** BackupHistory created within 60 seconds; file appears in backup directory
**Why human:** Requires running server + real DB; cron timing cannot be verified statically

#### 2. Custom Backup Path Applied to Output File

**Test:** Create a schedule with a custom backupPath set to a directory different from the default, trigger or wait for a scheduled backup to run, verify the backup file is written to the custom path not the default
**Expected:** Backup file appears in the custom directory; default directory has no new file
**Why human:** Requires running server + filesystem; end-to-end path application cannot be verified statically

#### 3. Retention Cleanup Actually Deletes Files

**Test:** Create backup history records with startedAt older than retentionDays, run a scheduled backup, verify old records and files are deleted but the most recent success is preserved
**Expected:** Old files deleted; last success file remains on disk; DB records cleaned up
**Why human:** Requires real filesystem and DB state

#### 4. Email and Slack Notifications Deliver

**Test:** Configure SMTP and Slack webhook in Settings, enable notifications on a connection schedule, trigger a scheduled backup, verify email arrives in inbox and Slack message appears in channel
**Expected:** Formatted email with connection name/status/file size; Slack message with summary
**Why human:** Requires real SMTP credentials and Slack workspace

#### 5. Catch-Up Backup on Restart

**Test:** With catchUpOnRestart enabled on a schedule, stop the server, wait past the scheduled time, restart — verify a catch-up backup runs immediately
**Expected:** Backup fires within seconds of server start; BackupHistory record created
**Why human:** Requires timing across server restart cycle

---

## Gaps Summary

No gaps remain. SCHD-03 was the sole gap from initial verification — plan 03-04 closed it with two targeted changes:

1. `src/lib/backup-engine.ts`: `runBackup` now accepts an optional third parameter `backupDir?: string`. When provided (truthy), `resolvedBackupDir` takes that value; when absent, it falls back to `await getBackupDir(connectionId)`. The `path.join` call uses `resolvedBackupDir`.

2. `src/lib/scheduler.ts`: The `void backupDir` dead code line was removed. `runBackup(record.id, noop, backupDir)` now passes the custom path (or default-derived path) as the third argument.

The `getBackupDir` import in `scheduler.ts` is retained because it remains the fallback for schedules with no custom `backupPath`.

All 10 requirements (SCHD-01 through SCHD-06, NOTF-01 through NOTF-04) are satisfied. Phase 3 goal achieved.

---

_Verified: 2026-03-31T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
