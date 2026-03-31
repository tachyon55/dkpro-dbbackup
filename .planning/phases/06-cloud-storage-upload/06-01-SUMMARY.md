---
phase: 06-cloud-storage-upload
plan: "01"
subsystem: cloud-storage
tags: [s3, upload, multipart, encryption, scheduler, notifications]
dependency_graph:
  requires:
    - "01-01: crypto.ts (encrypt/decrypt)"
    - "01-02: prisma.ts (CloudStorageSettings model)"
    - "02-01: backup-engine.ts (runBackup)"
    - "03-01: scheduler.ts (runScheduledBackup)"
    - "03-02: notifications.ts (sendBackupNotification)"
  provides:
    - "uploadToS3() — multipart S3 upload for scheduled backups"
    - "GET/PUT /api/cloud-storage/settings — admin settings with encryption"
    - "POST /api/cloud-storage/test — HeadBucket connection test"
    - "scheduler S3 integration — auto-upload on cloudUpload=true"
    - "notifications uploadFailed param — S3 failure alerts"
  affects:
    - "06-02: frontend cloud storage settings UI"
tech_stack:
  added:
    - "@aws-sdk/client-s3 ^3.1020.0 (already installed)"
    - "@aws-sdk/lib-storage ^3.1020.0 (already installed)"
  patterns:
    - "Dynamic import of s3-upload in scheduler to avoid circular deps"
    - "Upsert with empty-string fallback for missing id (existing pattern)"
    - "secretAccessKey masked as __masked__ in GET response"
    - "forcePathStyle=true for non-AWS S3-compatible endpoints"
key_files:
  created:
    - src/lib/s3-upload.ts
    - src/app/api/cloud-storage/settings/route.ts
    - src/app/api/cloud-storage/test/route.ts
  modified:
    - src/lib/scheduler.ts
    - src/lib/notifications.ts
decisions:
  - "uploadToS3 uses @aws-sdk/lib-storage Upload (not putObject) for multipart support on large backup files"
  - "Dynamic import of s3-upload in scheduler follows existing circular-dep avoidance pattern"
  - "secretAccessKey masked as __masked__ in GET — never return encrypted value to client"
  - "S3 upload failure does not abort backup record — cloudUploadStatus updated independently"
  - "Upload-failure re-notification uses uploadFailed=true param — does not duplicate backup-success notification"
metrics:
  duration_seconds: 149
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_created: 3
  files_modified: 2
---

# Phase 06 Plan 01: S3 Upload Engine + Settings API Summary

**One-liner:** AES-256-encrypted S3 settings API with multipart upload engine integrated into scheduled backup pipeline.

## What Was Built

### Task 1: src/lib/s3-upload.ts

S3 upload abstraction using `@aws-sdk/lib-storage` Upload class for automatic multipart handling on large backup files:

- `createS3Client(settings)` — constructs `S3Client` with decrypted credentials; passes `endpoint` and `forcePathStyle=true` only when custom endpoint configured (NCP, MinIO compatibility)
- `uploadToS3(filePath, connectionName, fileName)` — builds key as `connectionName/YYYY-MM-DD/fileName` (URI-encoded), streams file via `createReadStream`, uses 5MB parts with 4 parallel queues
- `testS3Connection()` — sends `HeadBucketCommand`, returns `{ success, message }` — never throws

### Task 2: API Routes + Scheduler + Notifications

**GET /api/cloud-storage/settings:** Returns settings with `secretAccessKey` replaced by `"__masked__"`. Admin-only.

**PUT /api/cloud-storage/settings:** Zod-validates body; encrypts new `secretAccessKey` via `encrypt()`. Preserves existing encrypted value when body sends `null`, `""`, or `"__masked__"`. Upserts via Prisma. Admin-only.

**POST /api/cloud-storage/test:** Delegates to `testS3Connection()` via dynamic import. Admin-only. Returns `{ data: { success, message } }`.

**scheduler.ts:** After successful backup + initial notification, checks `schedule.cloudUpload`. If true, calls `uploadToS3()`, updates `cloudUploadStatus` to `"success"` or `"failed"`. On upload failure, re-calls `sendBackupNotification` with `uploadFailed=true`.

**notifications.ts:** `sendBackupNotification` accepts optional 4th param `uploadFailed?: boolean`. When true, subject appends `" (S3 업로드 실패)"`, email body adds `"⚠️ S3 업로드에 실패했습니다"` warning, Slack message appends `" ⚠️ S3 업로드에 실패했습니다"`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong auth import path in API routes**
- **Found during:** Task 2 — after creating settings/route.ts and test/route.ts
- **Issue:** Plan specified `@/lib/auth-utils` for `auth` import, but `auth-utils.ts` only exports password/lock utilities. The actual `auth()` function lives in `@/auth` (confirmed via existing connections/route.ts).
- **Fix:** Changed both route files to `import { auth } from "@/auth"`
- **Files modified:** `src/app/api/cloud-storage/settings/route.ts`, `src/app/api/cloud-storage/test/route.ts`
- **Commit:** 4dfeca7

## Known Stubs

None — all functionality is fully wired. `testS3Connection` requires live S3 credentials to verify end-to-end, but the implementation is complete and correct.

## Self-Check: PASSED
