"use client"

import { useEffect, useState, useCallback } from "react"
import { format } from "date-fns"
import { History, Cloud, CloudOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { BackupDetailPanel } from "@/components/backup/BackupDetailPanel"

// ── Helper functions ──────────────────────────────────────────────────────────

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

// ── Types ─────────────────────────────────────────────────────────────────────

interface HistoryItem {
  id: string
  connectionId: string | null
  connectionName: string
  dbType: string
  status: "running" | "success" | "failed"
  fileName: string | null
  fileSizeBytes: string | null
  durationMs: number | null
  startedAt: string
  completedAt: string | null
  cloudUploadStatus: string | null
}

interface ConnectionOption {
  id: string
  name: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function HistoryPageClient() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [prevCursors, setPrevCursors] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Filters
  const [filterConnectionId, setFilterConnectionId] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")

  // Connection options for dropdown
  const [connections, setConnections] = useState<ConnectionOption[]>([])

  // ── Fetch connections for filter dropdown ────────────────────────────────

  useEffect(() => {
    async function fetchConnections() {
      try {
        const res = await fetch("/api/connections")
        if (!res.ok) return
        const json = await res.json()
        const list = (json.data ?? []) as Array<{ id: string; name: string }>
        setConnections(list.map((c) => ({ id: c.id, name: c.name })))
      } catch {
        // ignore
      }
    }
    fetchConnections()
  }, [])

  // ── Fetch history ────────────────────────────────────────────────────────

  const fetchHistory = useCallback(
    async (cursor?: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: "20" })
        if (filterConnectionId) params.set("connectionId", filterConnectionId)
        if (filterStatus) params.set("status", filterStatus)
        if (filterStartDate) params.set("startDate", filterStartDate)
        if (filterEndDate) params.set("endDate", filterEndDate)
        if (cursor) params.set("cursor", cursor)

        const res = await fetch(`/api/backups?${params.toString()}`)
        if (!res.ok) return
        const json = await res.json()
        setItems(json.data ?? [])
        setTotal(json.pagination?.total ?? 0)
        setHasMore(json.pagination?.hasMore ?? false)
        setNextCursor(json.pagination?.nextCursor ?? null)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    },
    [filterConnectionId, filterStatus, filterStartDate, filterEndDate]
  )

  // Fetch on mount and whenever filters change; reset cursor stack
  useEffect(() => {
    setPrevCursors([])
    setNextCursor(null)
    fetchHistory()
  }, [fetchHistory])

  // ── Pagination handlers ───────────────────────────────────────────────────

  function handleNext() {
    if (!nextCursor) return
    setPrevCursors((prev) => [...prev, nextCursor])
    fetchHistory(nextCursor)
  }

  function handlePrev() {
    const stack = [...prevCursors]
    const popped = stack.pop()
    setPrevCursors(stack)
    fetchHistory(popped)
  }

  // ── Filter reset ──────────────────────────────────────────────────────────

  function resetFilters() {
    setFilterConnectionId("")
    setFilterStatus("")
    setFilterStartDate("")
    setFilterEndDate("")
  }

  // ── Cloud upload icon ─────────────────────────────────────────────────────

  function CloudUploadIcon({ status }: { status: string | null }) {
    if (!status || status === "skipped") return null
    if (status === "success") {
      return (
        <span title="S3 업로드 성공" className="inline-flex items-center ml-1.5 text-blue-500">
          <Cloud className="h-3.5 w-3.5" />
        </span>
      )
    }
    return (
      <span title="S3 업로드 실패" className="inline-flex items-center ml-1.5 text-red-400">
        <CloudOff className="h-3.5 w-3.5" />
      </span>
    )
  }

  // ── Status badge ──────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <h1 className="text-lg font-semibold text-neutral-900 mb-6">백업 히스토리</h1>

      {/* Filter bar */}
      <div className="flex gap-2 items-center flex-wrap mb-4">
        {/* Connection filter */}
        <Select
          value={filterConnectionId}
          onValueChange={(val) => setFilterConnectionId(val === "__all__" ? "" : val)}
        >
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="전체 연결" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">전체</SelectItem>
            {connections.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={filterStatus}
          onValueChange={(val) => setFilterStatus(val === "__all__" ? "" : val)}
        >
          <SelectTrigger className="w-[120px] h-9 text-sm">
            <SelectValue placeholder="전체 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">전체</SelectItem>
            <SelectItem value="success">성공</SelectItem>
            <SelectItem value="failed">실패</SelectItem>
            <SelectItem value="running">진행중</SelectItem>
          </SelectContent>
        </Select>

        {/* Date range */}
        <span className="text-sm text-neutral-500">시작일</span>
        <input
          type="date"
          value={filterStartDate}
          onChange={(e) => setFilterStartDate(e.target.value)}
          className="h-9 rounded-md border border-neutral-200 px-3 text-sm"
        />
        <span className="text-sm text-neutral-500">종료일</span>
        <input
          type="date"
          value={filterEndDate}
          onChange={(e) => setFilterEndDate(e.target.value)}
          className="h-9 rounded-md border border-neutral-200 px-3 text-sm"
        />

        {/* Reset */}
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          초기화
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border border-neutral-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>연결명</TableHead>
              <TableHead>DB 타입</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>파일명</TableHead>
              <TableHead className="text-right">파일 크기</TableHead>
              <TableHead className="text-right">소요시간</TableHead>
              <TableHead>실행일시</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <History className="h-8 w-8 text-neutral-300" />
                    <p className="text-sm font-semibold text-neutral-700">
                      백업 히스토리가 없습니다
                    </p>
                    <p className="text-xs text-neutral-500">
                      연결 관리에서 백업을 실행하면 이력이 여기에 표시됩니다.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`hover:bg-neutral-50 cursor-pointer ${
                    selectedId === item.id
                      ? "bg-indigo-50 border-l-2 border-indigo-500"
                      : ""
                  }`}
                >
                  <TableCell>
                    <span className="inline-block w-2 h-2 rounded-full mr-2 bg-indigo-400" />
                    {item.connectionName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {item.dbType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <StatusBadge status={item.status} />
                      <CloudUploadIcon status={item.cloudUploadStatus} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs max-w-[240px] truncate block">
                      {item.fileName ?? "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatFileSize(item.fileSizeBytes)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatDuration(item.durationMs)}
                  </TableCell>
                  <TableCell>
                    {format(new Date(item.startedAt), "yyyy-MM-dd HH:mm")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <span className="text-sm text-neutral-500">전체 {total}건</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={prevCursors.length === 0}
          >
            이전
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={!hasMore}
          >
            다음
          </Button>
        </div>
      </div>

      {/* Detail panel */}
      <BackupDetailPanel
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
        jobId={selectedId}
      />
    </div>
  )
}
