"use client"

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
import type { Connection } from "@/components/connections/ConnectionCard"

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
  onConfirm: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BackupConfirmDialog({ open, onOpenChange, connection, onConfirm }: Props) {
  if (!connection) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>백업을 실행하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-900">{connection.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium">
                  {DB_TYPE_LABELS[connection.type]}
                </span>
              </div>
              <p className="text-sm text-neutral-500">백업 파일이 서버에 저장됩니다.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>실행</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
