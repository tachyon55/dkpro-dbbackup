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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { UserTable, type UserRow } from "@/components/users/UserTable"
import { UserModal } from "@/components/users/UserModal"
import { Button as Btn } from "@/components/ui/button"

type Props = {
  currentUserId: string
}

export function UsersPageClient({ currentUserId }: Props) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [selectedUser, setSelectedUser] = useState<UserRow | undefined>()

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Reset password confirmation state
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [tempPasswordDialogOpen, setTempPasswordDialogOpen] = useState(false)

  // ── Fetch users ──────────────────────────────────────────────────────────

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch("/api/users")
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "사용자 목록을 불러오지 못했습니다")
        return
      }
      setUsers(json.data)
    } catch {
      toast.error("서버 연결 오류")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleOpenCreate() {
    setSelectedUser(undefined)
    setModalMode("create")
    setModalOpen(true)
  }

  function handleEdit(user: UserRow) {
    setSelectedUser(user)
    setModalMode("edit")
    setModalOpen(true)
  }

  function handleDeleteRequest(user: UserRow) {
    setDeleteTarget(user)
    setDeleteDialogOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "사용자 삭제에 실패했습니다")
        return
      }
      toast.success("사용자가 삭제되었습니다")
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      fetchUsers()
    } catch {
      toast.error("서버 연결 오류")
    } finally {
      setDeleteLoading(false)
    }
  }

  function handleResetPasswordRequest(user: UserRow) {
    setResetTarget(user)
    setResetDialogOpen(true)
  }

  async function handleResetPasswordConfirm() {
    if (!resetTarget) return
    setResetLoading(true)
    try {
      const res = await fetch(`/api/users/${resetTarget.id}/reset-password`, {
        method: "POST",
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "비밀번호 초기화에 실패했습니다")
        return
      }
      setResetDialogOpen(false)
      setResetTarget(null)
      setTempPassword(json.data.tempPassword)
      setTempPasswordDialogOpen(true)
      fetchUsers()
    } catch {
      toast.error("서버 연결 오류")
    } finally {
      setResetLoading(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">사용자 관리</h1>
          <p className="text-sm text-neutral-500 mt-1">시스템 사용자 계정을 관리합니다</p>
        </div>
        <Button onClick={handleOpenCreate}>사용자 추가</Button>
      </div>

      {/* User table */}
      {loading ? (
        <div className="rounded-md border border-neutral-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-neutral-400">불러오는 중...</p>
        </div>
      ) : (
        <UserTable
          users={users}
          currentUserId={currentUserId}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
          onResetPassword={handleResetPasswordRequest}
        />
      )}

      {/* Create / Edit modal */}
      <UserModal
        mode={modalMode}
        user={selectedUser}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchUsers}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}) 사용자를 정말
              삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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

      {/* Reset password confirmation dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>비밀번호 초기화</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{resetTarget?.name}</strong> ({resetTarget?.email}) 사용자의 비밀번호를
              임시 비밀번호로 초기화하시겠습니까? 사용자는 다음 로그인 시 비밀번호를 변경해야 합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetLoading}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPasswordConfirm} disabled={resetLoading}>
              {resetLoading ? "초기화 중..." : "초기화"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Temporary password display dialog */}
      <Dialog open={tempPasswordDialogOpen} onOpenChange={setTempPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>임시 비밀번호 발급 완료</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-neutral-600">
              아래 임시 비밀번호를 사용자에게 안전하게 전달하세요. 사용자는 다음 로그인 시
              비밀번호를 변경해야 합니다.
            </p>
            <div className="rounded-md bg-neutral-100 px-4 py-3 font-mono text-lg font-semibold text-neutral-900 tracking-wider text-center select-all">
              {tempPassword}
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2 border border-amber-200">
              이 창을 닫으면 임시 비밀번호를 다시 확인할 수 없습니다.
            </p>
          </div>
          <DialogFooter>
            <Btn onClick={() => setTempPasswordDialogOpen(false)}>확인</Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
