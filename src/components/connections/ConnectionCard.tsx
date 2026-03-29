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
}: Props) {
  const hostInfo =
    connection.type === "sqlite"
      ? connection.filePath ?? ""
      : connection.host
        ? `${connection.host}${connection.port ? `:${connection.port}` : ""}`
        : ""

  return (
    <Card
      className="h-[160px] relative cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
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
      </CardContent>
    </Card>
  )
}
