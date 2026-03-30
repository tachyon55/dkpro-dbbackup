---
id: "03-04"
phase: 03-automation-notifications
plan: "04"
status: complete
completed: 2026-03-31
gap_closure: true
requirements:
  - SCHD-03
self_check: PASSED
---

# Summary: Plan 03-04 — Wire Custom Backup Path from Scheduler to Backup Engine

**Gap closed:** SCHD-03 — `schedule.backupPath` is now applied at backup execution time.

## What Was Built

Two targeted edits across two files wire the already-computed `backupDir` value from the scheduler through to the backup engine's output path logic.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/backup-engine.ts` | Added optional `backupDir?: string` third parameter; renamed local resolution to `resolvedBackupDir` |
| `src/lib/scheduler.ts` | Removed `void backupDir` dead code; passed `backupDir` as third arg to `runBackup` |

## Exact Changes

### `src/lib/backup-engine.ts`

**Signature (line 31):**
```diff
- export async function runBackup(historyId: string, send: SendFn): Promise<void> {
+ export async function runBackup(historyId: string, send: SendFn, backupDir?: string): Promise<void> {
```

**Output path resolution (lines 94-97):**
```diff
- // 4. Build output path
- const backupDir = await getBackupDir(connectionId)
+ // 4. Build output path — use caller-provided dir if given, else derive default
+ const resolvedBackupDir = backupDir ?? await getBackupDir(connectionId)
  const fileName = generateBackupFileName(conn.database ?? conn.name, conn.type)
- const outputPath = path.join(backupDir, fileName)
+ const outputPath = path.join(resolvedBackupDir, fileName)
```

### `src/lib/scheduler.ts`

**Dead code removal (line 85 deleted):**
```diff
  const backupDir = schedule.backupPath ? schedule.backupPath : await getBackupDir(connectionId)
- void backupDir // stored for future per-connection path overrides; runBackup uses getBackupDir internally
```

**runBackup call (line 108):**
```diff
- await runBackup(record.id, noop)
+ await runBackup(record.id, noop, backupDir)
```

## Verification Commands & Output

```
grep -n "backupDir?: string" src/lib/backup-engine.ts
→ 31: export async function runBackup(historyId: string, send: SendFn, backupDir?: string): Promise<void> {

grep -n "resolvedBackupDir" src/lib/backup-engine.ts
→ 95: const resolvedBackupDir = backupDir ?? await getBackupDir(connectionId)
→ 97: const outputPath = path.join(resolvedBackupDir, fileName)

grep -n "void backupDir" src/lib/scheduler.ts
→ (no output — dead code removed)

grep -n "runBackup(record.id, noop, backupDir)" src/lib/scheduler.ts
→ 108: await runBackup(record.id, noop, backupDir)

grep -n "getBackupDir" src/lib/scheduler.ts
→ 70: const { getBackupDir } = await import("@/lib/backup-tools")
→ 84: const backupDir = schedule.backupPath ? schedule.backupPath : await getBackupDir(connectionId)

npx tsc --noEmit
→ exit 0 (no output)
```

## SCHD-03 Gap Closure Confirmed

- A schedule with a custom `backupPath` now stores backup files in that path
- A schedule without a custom `backupPath` continues to use the default `getBackupDir()` directory
- `getBackupDir` import in `scheduler.ts` retained — still used as fallback
- No TypeScript errors introduced
