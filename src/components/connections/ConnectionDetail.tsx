"use client"

import { useEffect, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import type { Connection } from "./ConnectionCard"

// ── DB type labels ─────────────────────────────────────────────────────────────

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
  connection: Connection | null
  open: boolean
  onClose: () => void
  onEdit: (c: Connection) => void
}

// ── Helper — field row ─────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 border-b border-neutral-100 last:border-0">
      <span className="text-sm text-neutral-500 w-28 shrink-0">{label}</span>
      <span className="text-sm text-neutral-900 break-all">{value ?? "—"}</span>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ConnectionDetail({ connection, open, onClose, onEdit }: Props) {
  const [activeTab, setActiveTab] = useState("info")
  const [databases, setDatabases] = useState<string[]>([])
  const [dbLoading, setDbLoading] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)

  // Reset tab when connection changes
  useEffect(() => {
    if (connection) {
      setActiveTab("info")
      setDatabases([])
      setDbError(null)
    }
  }, [connection?.id])

  // Fetch databases when databases tab is selected
  useEffect(() => {
    if (activeTab !== "databases" || !connection?.id) return
    setDbLoading(true)
    setDbError(null)
    fetch(`/api/connections/${connection.id}/databases`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setDbError(json.error)
        } else {
          setDatabases(json.data?.databases ?? [])
        }
      })
      .catch(() => setDbError("서버 연결 오류"))
      .finally(() => setDbLoading(false))
  }, [activeTab, connection?.id])

  function handleEdit() {
    if (connection) {
      onEdit(connection)
      onClose()
    }
  }

  if (!connection) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="right" className="w-[480px]" />
      </Sheet>
    )
  }

  const createdAt = new Date(connection.createdAt).toLocaleString("ko-KR")
  const updatedAt = new Date(connection.updatedAt).toLocaleString("ko-KR")

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[480px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: connection.color }}
            />
            {connection.name}
          </SheetTitle>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col mt-4 min-h-0"
        >
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1">
              정보
            </TabsTrigger>
            <TabsTrigger value="databases" className="flex-1">
              데이터베이스
            </TabsTrigger>
          </TabsList>

          {/* 정보 tab */}
          <TabsContent value="info" className="flex-1 overflow-y-auto mt-4 space-y-0">
            <div className="divide-y divide-neutral-100">
              <Field label="연결 이름" value={connection.name} />
              <Field label="DB 타입" value={DB_TYPE_LABELS[connection.type]} />
              {connection.type === "sqlite" ? (
                <Field label="파일 경로" value={connection.filePath} />
              ) : (
                <>
                  <Field label="호스트" value={connection.host} />
                  <Field label="포트" value={connection.port} />
                  <Field label="데이터베이스" value={connection.database} />
                  <Field label="사용자명" value={connection.username} />
                  {connection.type === "oracle" && (
                    <>
                      {connection.sid && <Field label="SID" value={connection.sid} />}
                      {connection.serviceName && (
                        <Field label="서비스명" value={connection.serviceName} />
                      )}
                    </>
                  )}
                </>
              )}
              <Field
                label="백업 저장"
                value={connection.backupStorageType === "cloud" ? "클라우드" : "로컬"}
              />
              {connection.backupStorageType !== "cloud" && (
                <Field
                  label="백업 경로"
                  value={connection.backupLocalPath ?? "기본 경로"}
                />
              )}
              <Field
                label="색상"
                value={
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block w-4 h-4 rounded-full border border-neutral-200"
                      style={{ backgroundColor: connection.color }}
                    />
                    {connection.color}
                  </span>
                }
              />
              <Field label="생성일" value={createdAt} />
              <Field label="수정일" value={updatedAt} />
            </div>
            <div className="pt-4">
              <Button variant="outline" className="w-full" onClick={handleEdit}>
                수정
              </Button>
            </div>
          </TabsContent>

          {/* 데이터베이스 tab */}
          <TabsContent value="databases" className="flex-1 overflow-y-auto mt-4">
            {dbLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded-md" />
                ))}
              </div>
            ) : dbError ? (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-600">{dbError}</p>
              </div>
            ) : databases.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-8">
                데이터베이스 목록이 없습니다
              </p>
            ) : (
              <ul className="space-y-1">
                {databases.map((db) => (
                  <li
                    key={db}
                    className="text-sm px-3 py-2 rounded-md bg-neutral-50 hover:bg-neutral-100 text-neutral-800"
                  >
                    {db}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
