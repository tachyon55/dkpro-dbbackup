"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type AuditEventType =
  | "LOGIN"
  | "LOGOUT"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "ROLE_CHANGE"
  | "CONN_CREATE"
  | "CONN_UPDATE"
  | "CONN_DELETE"
  | "CONN_TEST"
  | "BACKUP_START"
  | "BACKUP_COMPLETE"
  | "BACKUP_FAIL"
  | "SCHEDULE_CREATE"
  | "SCHEDULE_UPDATE"
  | "SCHEDULE_DELETE"
  | "SCHEDULE_RUN"
  | "NOTIF_SENT"
  | "NOTIF_FAIL"

const EVENT_LABELS: Record<AuditEventType, string> = {
  LOGIN: "로그인",
  LOGOUT: "로그아웃",
  USER_CREATE: "사용자 생성",
  USER_UPDATE: "사용자 수정",
  USER_DELETE: "사용자 삭제",
  ROLE_CHANGE: "역할 변경",
  CONN_CREATE: "연결 생성",
  CONN_UPDATE: "연결 수정",
  CONN_DELETE: "연결 삭제",
  CONN_TEST: "연결 테스트",
  BACKUP_START: "백업 시작",
  BACKUP_COMPLETE: "백업 완료",
  BACKUP_FAIL: "백업 실패",
  SCHEDULE_CREATE: "스케줄 생성",
  SCHEDULE_UPDATE: "스케줄 수정",
  SCHEDULE_DELETE: "스케줄 삭제",
  SCHEDULE_RUN: "스케줄 실행",
  NOTIF_SENT: "알림 전송",
  NOTIF_FAIL: "알림 실패",
}

type AuditLog = {
  id: string
  userId: string | null
  userEmail: string | null
  event: AuditEventType
  targetId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  user: { email: string; name: string } | null
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AuditLogsPageClient() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  })
  const [filterEvent, setFilterEvent] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [page, setPage] = useState(1)

  async function fetchLogs() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterEvent) params.set("event", filterEvent)
      if (dateFrom) params.set("from", dateFrom)
      if (dateTo) params.set("to", dateTo)
      params.set("page", String(page))
      params.set("limit", "50")

      const res = await fetch(`/api/audit-logs?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) {
        console.error(json.error ?? "감사 로그를 불러오지 못했습니다")
        return
      }
      setLogs(json.data)
      setPagination(json.pagination)
    } catch {
      console.error("서버 연결 오류")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterEvent, dateFrom, dateTo, page])

  function handleEventChange(value: string) {
    setFilterEvent(value === "all" ? "" : value)
    setPage(1)
  }

  function handleDateFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDateFrom(e.target.value)
    setPage(1)
  }

  function handleDateToChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDateTo(e.target.value)
    setPage(1)
  }

  function formatMetadata(metadata: Record<string, unknown> | null): string {
    if (!metadata) return "-"
    const str = JSON.stringify(metadata)
    return str.length > 80 ? str.slice(0, 77) + "..." : str
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">감사 로그</h1>
        <p className="text-sm text-neutral-500 mt-1">시스템 이벤트 및 사용자 활동 기록</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Select onValueChange={handleEventChange} defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="이벤트 유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {(Object.entries(EVENT_LABELS) as [AuditEventType, string][]).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={handleDateFromChange}
          className="w-[160px]"
          placeholder="시작 날짜"
        />

        <Input
          type="date"
          value={dateTo}
          onChange={handleDateToChange}
          className="w-[160px]"
          placeholder="종료 날짜"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-md border border-neutral-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시간</TableHead>
                <TableHead>이벤트</TableHead>
                <TableHead>사용자</TableHead>
                <TableHead>대상</TableHead>
                <TableHead>상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-40 bg-neutral-100 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-neutral-100 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-32 bg-neutral-100 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-neutral-100 rounded animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-48 bg-neutral-100 rounded animate-pulse" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-md border border-neutral-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-neutral-400">감사 로그가 없습니다</p>
        </div>
      ) : (
        <div className="rounded-md border border-neutral-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">시간</TableHead>
                <TableHead className="w-[120px]">이벤트</TableHead>
                <TableHead className="w-[200px]">사용자</TableHead>
                <TableHead className="w-[160px]">대상</TableHead>
                <TableHead>상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-neutral-600 font-mono">
                    {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {EVENT_LABELS[log.event] ?? log.event}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-700">
                    {log.userEmail ?? "시스템"}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500 font-mono">
                    {log.targetId ? log.targetId.slice(0, 12) + "..." : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500 font-mono">
                    {formatMetadata(log.metadata)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            이전
          </Button>
          <span className="text-sm text-neutral-500">
            {page} / {pagination.totalPages} 페이지 (총 {pagination.total}건)
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  )
}
