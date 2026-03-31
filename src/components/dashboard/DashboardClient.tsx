"use client"

import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { Database, CheckCircle2, AlertCircle, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DashboardProps {
  totalConnections: number
  todaySuccess: number
  todayFailed: number
  nextSchedule: { connectionName: string; nextFire: string } | null
  recentHistory: Array<{
    id: string
    connectionName: string
    dbType: string
    status: string
    fileName: string | null
    fileSizeBytes: string | null
    startedAt: string
    durationMs: number | null
  }>
  connectionStatuses: Array<{
    id: string
    name: string
    type: string
    color: string
    latestBackup: { status: string; startedAt: string } | null
  }>
}

function formatFileSize(bytes: string | null): string {
  if (!bytes) return "-"
  const n = parseInt(bytes, 10)
  if (n >= 1073741824) return `${(n / 1073741824).toFixed(1)} GB`
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${n} B`
}

function relativeTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ko })
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <span className="text-green-700 bg-green-100 font-semibold text-sm px-2 py-1 rounded">
        성공
      </span>
    )
  }
  if (status === "failed") {
    return (
      <span className="text-red-600 bg-red-50 font-semibold text-sm px-2 py-1 rounded">
        실패
      </span>
    )
  }
  return (
    <span className="text-amber-600 bg-amber-50 font-semibold text-sm px-2 py-1 rounded">
      실행 중
    </span>
  )
}

export function DashboardClient({
  totalConnections,
  todaySuccess,
  todayFailed,
  nextSchedule,
  recentHistory,
  connectionStatuses,
}: DashboardProps) {
  const router = useRouter()

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-6">대시보드</h1>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 전체 연결 */}
        <Card className="h-28 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-500">
            <Database className="h-4 w-4" />
            전체 연결
          </div>
          <div className="text-2xl font-semibold">{totalConnections}</div>
        </Card>

        {/* 오늘 성공 */}
        <Card className="h-28 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-500">
            <CheckCircle2 className="h-4 w-4" />
            오늘 성공
          </div>
          <div className="text-2xl font-semibold text-green-700">{todaySuccess}</div>
        </Card>

        {/* 실패 건수 */}
        <Card
          className={
            todayFailed > 0
              ? "h-28 p-4 flex flex-col justify-between border-l-4 border-red-600"
              : "h-28 p-4 flex flex-col justify-between"
          }
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-500">
            <AlertCircle className="h-4 w-4" />
            실패 건수
          </div>
          <div
            className={
              todayFailed > 0
                ? "text-2xl font-semibold text-red-600"
                : "text-2xl font-semibold"
            }
          >
            {todayFailed}
          </div>
        </Card>

        {/* 다음 스케줄 */}
        <Card className="h-28 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-500">
            <Clock className="h-4 w-4" />
            다음 스케줄
          </div>
          {nextSchedule ? (
            <div>
              <div className="text-sm font-semibold truncate">{nextSchedule.connectionName}</div>
              <div className="text-sm text-neutral-500">{relativeTime(nextSchedule.nextFire)}</div>
            </div>
          ) : (
            <div className="text-sm text-neutral-400">스케줄 없음</div>
          )}
        </Card>
      </div>

      {/* Bottom 2 Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        {/* Left: 연결별 최근 백업 */}
        <Card className="p-4">
          <h2 className="text-base font-semibold mb-4">연결별 최근 백업</h2>
          {connectionStatuses.length === 0 ? (
            <p className="text-sm text-neutral-400">
              연결이 없습니다. 연결 관리에서 첫 번째 DB를 추가하세요.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>연결명</TableHead>
                  <TableHead>DB 타입</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>시간</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connectionStatuses.map((conn) => {
                  const isFailed = conn.latestBackup?.status === "failed"
                  return (
                    <TableRow
                      key={conn.id}
                      className={isFailed ? "bg-red-50 cursor-pointer" : "cursor-pointer"}
                      onClick={() => router.push(`/connections?highlight=${conn.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full mr-2 shrink-0"
                            style={{ backgroundColor: conn.color }}
                          />
                          <span className="text-sm font-semibold truncate max-w-[120px]">
                            {conn.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-neutral-600">{conn.type}</span>
                      </TableCell>
                      <TableCell>
                        {conn.latestBackup ? (
                          <StatusBadge status={conn.latestBackup.status} />
                        ) : (
                          <span className="text-sm text-neutral-400">백업 없음</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-500">
                        {conn.latestBackup ? relativeTime(conn.latestBackup.startedAt) : "-"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Right: 최근 백업 히스토리 */}
        <Card className="p-4">
          <h2 className="text-base font-semibold mb-4">최근 백업 히스토리</h2>
          {recentHistory.length === 0 ? (
            <p className="text-sm text-neutral-400">백업 내역이 없습니다.</p>
          ) : (
            <div className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>연결명</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>파일명</TableHead>
                    <TableHead>크기</TableHead>
                    <TableHead>시간</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentHistory.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-sm font-semibold truncate max-w-[100px]">
                        {h.connectionName}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={h.status} />
                      </TableCell>
                      <TableCell className="text-sm text-neutral-600 truncate max-w-[120px]">
                        {h.fileName ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-500">
                        {formatFileSize(h.fileSizeBytes)}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-500">
                        {relativeTime(h.startedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
