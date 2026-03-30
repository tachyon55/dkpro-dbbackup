"use client"

import { Database, Loader2, MoreVertical, Play } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

// ── Types ─────────────────────────────────────────────────────────────────────

export type Connection = {
  id: string
  name: string
  type: "mysql" | "mariadb" | "postgresql" | "sqlserver" | "oracle" | "sqlite"
  host: string | null
  port: number | null
  username: string | null
  database: string | null
  filePath: string | null
  sid: string | null
  serviceName: string | null
  color: string
  createdAt: string
  updatedAt: string
  schedule?: {
    id: string
    isEnabled: boolean
    hour: number
    minute: number
    retentionDays: number
    notificationsEnabled: boolean
    catchUpOnRestart: boolean
    backupPath: string | null
  } | null
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
  connection: Connection
  onEdit: (c: Connection) => void
  onDelete: (c: Connection) => void
  onClick: (c: Connection) => void
  onBackup: (c: Connection) => void
  isBackingUp: boolean
  userRole: "admin" | "operator" | "viewer"
  onScheduleToggle: (connectionId: string, scheduleId: string, isEnabled: boolean) => void
  onScheduleClick: (connection: Connection) => void
}

// ── Helper ────────────────────────────────────────────────────────────────────

function getNextRunDisplay(hour: number, minute: number): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0)
  const isToday = today > now
  const hh = String(hour).padStart(2, "0")
  const mm = String(minute).padStart(2, "0")
  return `${hh}:${mm} ${isToday ? "오늘" : "내일"}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConnectionCard({
  connection,
  onEdit,
  onDelete,
  onClick,
  onBackup,
  isBackingUp,
  userRole,
  onScheduleToggle,
  onScheduleClick,
}: Props) {
  const hostInfo =
    connection.type === "sqlite"
      ? connection.filePath ?? ""
      : connection.host
        ? `${connection.host}${connection.port ? `:${connection.port}` : ""}`
        : ""

  return (
    <Card
      className="h-[200px] relative cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
      style={{ borderLeft: `4px solid ${connection.color}` }}
    >
      {/* Dropdown menu — positioned top-right, stops card click propagation */}
      <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-neutral-400 hover:text-neutral-700"
              aria-label="연결 관리"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(connection)}>수정</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(connection)}
              className="text-red-600 focus:text-red-600"
            >
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Card body — clicking opens detail */}
      <CardContent
        className="flex flex-col justify-between h-full p-4 pr-10"
        onClick={() => onClick(connection)}
      >
        <div className="flex items-start gap-2">
          <Database className="h-4 w-4 text-neutral-400 mt-0.5 shrink-0" />
          <span className="font-semibold text-neutral-900 text-sm leading-tight line-clamp-2">
            {connection.name}
          </span>
        </div>

        <div className="space-y-1">
          <span className="inline-block text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium">
            {DB_TYPE_LABELS[connection.type]}
          </span>
          {hostInfo && (
            <p className="text-xs text-neutral-400 truncate">{hostInfo}</p>
          )}
        </div>

        {/* Backup button — hidden for viewer role */}
        {userRole !== "viewer" && (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            {isBackingUp ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="h-7 text-xs text-amber-600 cursor-not-allowed"
              >
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                백업 중...
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onBackup(connection)}
              >
                <Play className="mr-1.5 h-3 w-3" />
                백업 실행
              </Button>
            )}
          </div>
        )}

        {/* Schedule row */}
        <div className="border-t border-neutral-100 pt-2 mt-2 flex items-center justify-between">
          {connection.schedule ? (
            <>
              <div
                className="flex items-center gap-2 cursor-pointer flex-1"
                onClick={(e) => { e.stopPropagation(); onScheduleClick(connection) }}
              >
                <Switch
                  checked={connection.schedule.isEnabled}
                  onCheckedChange={(checked) => {
                    onScheduleToggle(connection.id, connection.schedule!.id, checked)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  disabled={userRole === "viewer"}
                  aria-label="스케줄 활성화/비활성화"
                />
                <span className="text-xs text-neutral-600">스케줄</span>
                {connection.schedule.isEnabled ? (
                  <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700">
                    활성
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2 py-1 rounded bg-neutral-100 text-neutral-500">
                    비활성
                  </span>
                )}
              </div>
              {connection.schedule.isEnabled && (
                <span className="text-xs text-neutral-400">
                  다음 실행: {getNextRunDisplay(connection.schedule.hour, connection.schedule.minute)}
                </span>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">스케줄 미설정</span>
              {userRole !== "viewer" && (
                <button
                  className="text-xs text-indigo-600 underline"
                  onClick={(e) => { e.stopPropagation(); onScheduleClick(connection) }}
                >
                  설정하기
                </button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
