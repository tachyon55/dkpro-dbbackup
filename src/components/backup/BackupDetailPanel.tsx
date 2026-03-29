"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Download, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

// ── Types ─────────────────────────────────────────────────────────────────────

interface BackupDetail {
  id: string
  connectionName: string
  dbType: string
  status: "running" | "success" | "failed"
  fileName: string | null
  filePath: string | null
  fileSizeBytes: string | null
  sha256: string | null
  durationMs: number | null
  fullLog: string | null
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
  fileExists: boolean
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFileSize(bytes: string | null): string {
  if (!bytes) return "-"
  const n = Number(bytes)
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "-"
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-600">
        성공
      </span>
    )
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600">
        실패
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-600">
      진행중
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BackupDetailPanel({ open, onOpenChange, jobId }: Props) {
  const [detail, setDetail] = useState<BackupDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!jobId) {
      setDetail(null)
      return
    }

    let cancelled = false
    setLoading(true)

    async function fetchDetail() {
      try {
        const res = await fetch(`/api/backups/${jobId}`)
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) setDetail(json.data)
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDetail()
    return () => {
      cancelled = true
    }
  }, [jobId])

  function handleCopySha256() {
    if (!detail?.sha256) return
    navigator.clipboard.writeText(detail.sha256).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{detail?.connectionName ?? "상세 정보"}</SheetTitle>
          <p className="text-xs text-neutral-500">
            {detail ? format(new Date(detail.startedAt), "yyyy-MM-dd HH:mm:ss") : ""}
          </p>
          {detail && <StatusBadge status={detail.status} />}
        </SheetHeader>

        {loading ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : detail ? (
          <div className="mt-6 space-y-6">
            {/* Section 1: 파일 정보 */}
            <div>
              <h3 className="text-xs font-semibold text-neutral-700 mb-2">파일 정보</h3>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">파일명</dt>
                  <dd className="font-mono text-xs text-neutral-800">{detail.fileName ?? "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">크기</dt>
                  <dd className="text-neutral-800">{formatFileSize(detail.fileSizeBytes)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">소요시간</dt>
                  <dd className="text-neutral-800">{formatDuration(detail.durationMs)}</dd>
                </div>
              </dl>
            </div>

            {/* Section 2: SHA-256 (success only) */}
            {detail.status === "success" && detail.sha256 && (
              <div>
                <h3 className="text-xs font-semibold text-neutral-700 mb-2">SHA-256 무결성</h3>
                <p className="font-mono text-xs break-all text-neutral-600 mb-2">
                  {detail.sha256}
                </p>
                <Button variant="ghost" size="sm" onClick={handleCopySha256}>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  {copied ? "복사됨" : "복사"}
                </Button>
              </div>
            )}

            {/* Section 3: Download (success only) */}
            {detail.status === "success" && (
              <div>
                {detail.fileExists ? (
                  <Button
                    className="w-full"
                    onClick={() => window.open(`/api/backups/${jobId}/download`)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    파일 다운로드
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    파일을 찾을 수 없음
                  </Button>
                )}
              </div>
            )}

            {/* Section 4: Error message (failed only) */}
            {detail.status === "failed" && detail.errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                {detail.errorMessage}
              </div>
            )}

            {/* Section 5: 실행 로그 */}
            <div>
              <h3 className="text-xs font-semibold text-neutral-700 mb-2">실행 로그</h3>
              <pre className="font-mono text-xs leading-relaxed max-h-[320px] overflow-y-auto bg-neutral-950 text-neutral-200 rounded p-3 whitespace-pre-wrap">
                {detail.fullLog ?? "로그가 없습니다"}
              </pre>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
