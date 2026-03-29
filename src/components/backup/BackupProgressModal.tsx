"use client"

import { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import type { Connection } from "@/components/connections/ConnectionCard"

// ── Types ─────────────────────────────────────────────────────────────────────

type BackupStatus = "idle" | "started" | "running" | "complete" | "failed"

type LogLine = {
  line: string
  source: "stdout" | "stderr"
}

type BackupResult = {
  fileSizeBytes?: number | null
  durationMs?: number
  sha256?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null) return "알 수 없음"
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function formatDuration(ms: number | undefined): string {
  if (ms == null) return "알 수 없음"
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

// ── DB type display labels ─────────────────────────────────────────────────────

const DB_TYPE_LABELS: Record<Connection["type"], string> = {
  mysql: "MySQL",
  mariadb: "MariaDB",
  postgresql: "PostgreSQL",
  sqlserver: "SQL Server",
  oracle: "Oracle",
  sqlite: "SQLite",
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection: Connection | null
  jobId: string | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BackupProgressModal({ open, onOpenChange, connection, jobId }: Props) {
  const [status, setStatus] = useState<BackupStatus>("idle")
  const [logLines, setLogLines] = useState<LogLine[]>([])
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<BackupResult | null>(null)
  const [stage, setStage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const logEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll log to bottom on new lines
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logLines])

  // Reset state when a new job starts
  useEffect(() => {
    if (!open || !jobId) return

    setStatus("idle")
    setLogLines([])
    setProgress(0)
    setResult(null)
    setStage("연결 중...")
    setErrorMessage("")

    const es = new EventSource(`/api/backups/${jobId}/stream`)

    es.addEventListener("started", () => {
      setStatus("started")
      setProgress(10)
      setStage("연결 중...")
    })

    es.addEventListener("log", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data) as LogLine
        setLogLines((prev) => [...prev, d])
      } catch {
        // Ignore malformed log events
      }
    })

    es.addEventListener("progress", () => {
      setStatus("running")
      setProgress(50)
      setStage("덤프 실행 중...")
    })

    es.addEventListener("complete", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data) as BackupResult
        setStatus("complete")
        setProgress(100)
        setResult(d)
        setStage("백업 완료")
      } catch {
        setStatus("complete")
        setProgress(100)
        setStage("백업 완료")
      }
      es.close()
    })

    es.addEventListener("error", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data) as { message?: string }
        setErrorMessage(d.message ?? "백업 중 오류가 발생했습니다")
      } catch {
        setErrorMessage("백업 중 오류가 발생했습니다")
      }
      setStatus("failed")
      setProgress(100)
      setStage("오류 발생")
      es.close()
    })

    es.onerror = () => {
      // SSE connection lost before a proper error event
      if (status !== "complete" && status !== "failed") {
        setStatus("failed")
        setStage("실시간 연결이 끊어졌습니다. 히스토리에서 결과를 확인해주세요.")
      }
      es.close()
    }

    return () => {
      es.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, open])

  // Prevent close while backup is running
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && (status === "started" || status === "running")) return
    onOpenChange(nextOpen)
  }

  // Derive title from status
  const title = connection
    ? status === "complete"
      ? "백업 완료"
      : status === "failed"
        ? "백업 실패"
        : `${connection.name} 백업 진행 중`
    : "백업 진행 중"

  // Progress bar color
  const progressClassName =
    status === "complete"
      ? "[&>div]:bg-green-500"
      : status === "failed"
        ? "[&>div]:bg-red-500"
        : "[&>div]:bg-indigo-600"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {connection && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium">
                {DB_TYPE_LABELS[connection.type]}
              </span>
              {connection.database && (
                <span className="text-xs text-neutral-500">{connection.database}</span>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <Progress value={progress} className={progressClassName} />
          <p className="text-xs text-neutral-500">{stage}</p>
        </div>

        {/* Log area */}
        <div className="font-mono text-xs leading-relaxed max-h-64 overflow-y-auto bg-neutral-950 text-neutral-200 rounded p-3">
          {logLines.length === 0 ? (
            <span className="text-neutral-500">로그 대기 중...</span>
          ) : (
            logLines.map((entry, i) => (
              <div
                key={i}
                className={
                  entry.source === "stderr" ? "text-amber-400" : "text-neutral-200"
                }
              >
                {entry.line}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>

        {/* Result summary — shown on success */}
        {status === "complete" && result && (
          <div className="flex items-center gap-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm">
            <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              성공
            </span>
            <span className="text-neutral-700">
              크기: <span className="font-medium">{formatFileSize(result.fileSizeBytes)}</span>
            </span>
            <span className="text-neutral-700">
              소요: <span className="font-medium">{formatDuration(result.durationMs)}</span>
            </span>
          </div>
        )}

        {/* Error summary — shown on failure */}
        {status === "failed" && errorMessage && (
          <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              disabled={status === "started" || status === "running"}
            >
              닫기
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
