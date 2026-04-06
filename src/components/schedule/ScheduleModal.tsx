"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ScheduleData = {
  id: string
  connectionId: string
  isEnabled: boolean
  hour: number
  minute: number
  backupPath: string | null
  retentionDays: number
  notificationsEnabled: boolean
  catchUpOnRestart: boolean
  cloudUpload: boolean
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectionId: string
  connectionName: string
  schedule: ScheduleData | null // null = creating new
  onSaved: () => void // callback to refresh parent
  backupStorageType?: string
  backupLocalPath?: string | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ScheduleModal({
  open,
  onOpenChange,
  connectionId,
  connectionName,
  schedule,
  onSaved,
  backupStorageType,
  backupLocalPath,
}: Props) {
  const [hour, setHour] = useState(2)
  const [minute, setMinute] = useState(0)
  const [retentionDays, setRetentionDays] = useState(30)
  const [catchUpOnRestart, setCatchUpOnRestart] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [cloudUpload, setCloudUpload] = useState(false)
  const [cloudStorageConfigured, setCloudStorageConfigured] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Pre-populate from schedule prop if editing
  useEffect(() => {
    if (open) {
      if (schedule) {
        setHour(schedule.hour)
        setMinute(schedule.minute)
        setRetentionDays(schedule.retentionDays)
        setCatchUpOnRestart(schedule.catchUpOnRestart)
        setNotificationsEnabled(schedule.notificationsEnabled)
        setCloudUpload(schedule.cloudUpload ?? false)
      } else {
        setHour(2)
        setMinute(0)
        setRetentionDays(30)
        setCatchUpOnRestart(false)
        setNotificationsEnabled(false)
        setCloudUpload(false)
      }

      // Check if cloud storage is configured to control toggle availability
      fetch("/api/cloud-storage/settings")
        .then((res) => res.json())
        .then(({ data }) => {
          setCloudStorageConfigured(!!(data?.bucket && data?.accessKeyId && data?.secretAccessKey))
        })
        .catch(() => {})
    }
  }, [open, schedule])

  // ── Save handler ──────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        connectionId,
        hour,
        minute,
        retentionDays,
        notificationsEnabled,
        catchUpOnRestart,
        isEnabled: schedule ? schedule.isEnabled : true,
        cloudUpload,
      }

      let res: Response
      if (!schedule) {
        // Creating
        res = await fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        // Editing
        res = await fetch(`/api/schedules/${schedule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "스케줄 저장에 실패했습니다. 다시 시도해주세요.")
        return
      }

      toast.success("스케줄이 저장되었습니다")
      onSaved()
      onOpenChange(false)
    } catch {
      toast.error("스케줄 저장에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setSaving(false)
    }
  }

  // ── Delete handler ────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!schedule) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/schedules/${schedule.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "스케줄 삭제에 실패했습니다.")
        return
      }
      toast.success("스케줄이 삭제되었습니다")
      onSaved()
      setDeleteDialogOpen(false)
      onOpenChange(false)
    } catch {
      toast.error("스케줄 삭제에 실패했습니다.")
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>스케줄 설정 — {connectionName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Section 1: 실행 시간 */}
            <div className="space-y-2">
              <Label>실행 시간</Label>
              <div className="flex gap-2">
                <Select
                  value={String(hour)}
                  onValueChange={(v) => setHour(Number(v))}
                >
                  <SelectTrigger aria-label="시 선택" className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {String(i).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(minute)}
                  onValueChange={(v) => setMinute(Number(v))}
                >
                  <SelectTrigger aria-label="분 선택" className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 15, 30, 45].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {String(m).padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-neutral-400">
                매일 지정 시간에 자동 백업을 실행합니다 (Asia/Seoul)
              </p>
            </div>

            {/* Section 2: 백업 저장 설정 (읽기 전용 — 연결 설정에서 관리) */}
            <div className="space-y-2">
              <Label>백업 저장 설정</Label>
              <div className="px-3 py-2 bg-neutral-50 rounded-md border text-sm text-neutral-700">
                {backupStorageType === "cloud"
                  ? "클라우드 저장"
                  : backupLocalPath
                    ? backupLocalPath
                    : "기본 경로"}
              </div>
              <p className="text-xs text-neutral-400">
                백업 저장 경로는 연결 설정에서 변경할 수 있습니다
              </p>
            </div>

            {/* Section 3: 보관 일수 */}
            <div className="space-y-2">
              <Label htmlFor="retentionDays">보관 일수</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="retentionDays"
                  type="number"
                  min={1}
                  max={3650}
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-neutral-600">일</span>
              </div>
              <p className="text-xs text-neutral-400">
                지정 일수가 지난 백업을 자동 삭제합니다. 마지막 성공 백업은 항상 보존됩니다.
              </p>
            </div>

            {/* Section 4: 재시작 복구 */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Switch
                  checked={catchUpOnRestart}
                  onCheckedChange={setCatchUpOnRestart}
                  aria-label="서버 재시작 시 놓친 백업 자동 실행"
                />
                <Label>서버 재시작 시 놓친 백업 자동 실행</Label>
              </div>
              <p className="text-xs text-neutral-400">
                서버 다운 중 누락된 백업을 재시작 직후 실행합니다
              </p>
            </div>

            {/* Section 5: 알림 */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                  aria-label="이 연결 알림 활성화"
                />
                <Label>이 연결의 백업 결과 알림 받기</Label>
              </div>
              <p className="text-xs text-neutral-400">
                알림 채널은{" "}
                <a href="/settings" className="text-indigo-600 underline">
                  설정 &gt; 알림
                </a>
                에서 구성합니다
              </p>
            </div>

            {/* Section 6: 클라우드 업로드 */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Switch
                  checked={cloudUpload}
                  onCheckedChange={setCloudUpload}
                  disabled={!cloudStorageConfigured}
                  aria-label="백업 파일 클라우드 업로드"
                />
                <Label className={!cloudStorageConfigured ? "text-neutral-400" : ""}>
                  백업 완료 후 클라우드 업로드
                </Label>
              </div>
              {!cloudStorageConfigured && (
                <p className="text-xs text-neutral-400">
                  클라우드 스토리지 설정이 필요합니다.{" "}
                  <a href="/settings?tab=cloud-storage" className="text-indigo-600 underline">
                    설정에서 구성하세요
                  </a>
                </p>
              )}
              {cloudStorageConfigured && (
                <p className="text-xs text-neutral-400">
                  백업 성공 시 S3 호환 스토리지에 자동 업로드됩니다
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {schedule && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={saving || deleting}
                >
                  스케줄 삭제
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "스케줄 저장"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>스케줄 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              스케줄을 삭제하면 자동 백업이 중단됩니다. 계속하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? "삭제 중..." : "스케줄 삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
