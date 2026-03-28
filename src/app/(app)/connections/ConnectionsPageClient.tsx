"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
import { Skeleton } from "@/components/ui/skeleton"
import { ConnectionCard, type Connection } from "@/components/connections/ConnectionCard"
import { ConnectionModal } from "@/components/connections/ConnectionModal"
import { ConnectionDetail } from "@/components/connections/ConnectionDetail"

// ── Component ─────────────────────────────────────────────────────────────────

export function ConnectionsPageClient() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [selectedConnection, setSelectedConnection] = useState<Connection | undefined>()

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Connection | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Detail sheet state
  const [detailConnection, setDetailConnection] = useState<Connection | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async function fetchConnections() {
    setLoading(true)
    try {
      const res = await fetch("/api/connections")
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "연결 목록을 불러오지 못했습니다")
        return
      }
      setConnections(json.data)
    } catch {
      toast.error("서버 연결 오류")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConnections()
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleOpenCreate() {
    setSelectedConnection(undefined)
    setModalMode("create")
    setModalOpen(true)
  }

  function handleEdit(connection: Connection) {
    setSelectedConnection(connection)
    setModalMode("edit")
    setModalOpen(true)
  }

  function handleDeleteRequest(connection: Connection) {
    setDeleteTarget(connection)
    setDeleteDialogOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/connections/${deleteTarget.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "연결 삭제에 실패했습니다")
        return
      }
      toast.success("연결이 삭제되었습니다")
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      // Close detail sheet if the deleted connection was open
      if (detailConnection?.id === deleteTarget.id) {
        setDetailOpen(false)
        setDetailConnection(null)
      }
      fetchConnections()
    } catch {
      toast.error("서버 연결 오류")
    } finally {
      setDeleteLoading(false)
    }
  }

  function handleCardClick(connection: Connection) {
    setDetailConnection(connection)
    setDetailOpen(true)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">연결 관리</h1>
          <p className="text-sm text-neutral-500 mt-1">데이터베이스 연결을 관리합니다</p>
        </div>
        <Button onClick={handleOpenCreate}>연결 추가</Button>
      </div>

      {/* Loading skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="rounded-md border h-[140px] bg-neutral-100" />
          ))}
        </div>
      ) : connections.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-lg font-medium text-neutral-700 mb-2">
            등록된 DB 연결이 없습니다
          </h2>
          <p className="text-sm text-neutral-400 mb-6">
            새 연결을 추가하여 데이터베이스 백업 관리를 시작하세요.
          </p>
          <Button onClick={handleOpenCreate}>연결 추가</Button>
        </div>
      ) : (
        /* Connection card grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {connections.map((conn) => (
            <ConnectionCard
              key={conn.id}
              connection={conn}
              onClick={handleCardClick}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <ConnectionModal
        mode={modalMode}
        connection={selectedConnection}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchConnections}
      />

      {/* Connection detail sheet */}
      <ConnectionDetail
        connection={detailConnection}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEdit}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>연결 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &apos;{deleteTarget?.name}&apos; 연결을 삭제하시겠습니까? 이 작업은 취소할 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteLoading ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
