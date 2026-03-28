"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { UserRow } from "./UserTable"

// ── Schemas ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  email: z.string().email("유효한 이메일을 입력해주세요"),
  name: z.string().min(1, "이름을 입력해주세요").max(50),
  password: z
    .string()
    .min(8, "비밀번호는 최소 8자입니다")
    .regex(/(?=.*[a-zA-Z])(?=.*\d)/, "영문과 숫자를 포함해야 합니다"),
  role: z.enum(["admin", "operator", "viewer"]),
})

const editSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요").max(50),
  role: z.enum(["admin", "operator", "viewer"]),
  isActive: z.boolean(),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm = z.infer<typeof editSchema>

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  mode: "create" | "edit"
  user?: UserRow
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UserModal({ mode, user, open, onClose, onSuccess }: Props) {
  const isEdit = mode === "edit"

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: "", name: "", password: "", role: "viewer" },
  })

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: user?.name ?? "",
      role: user?.role ?? "viewer",
      isActive: user?.isActive ?? true,
    },
  })

  // Sync edit form when user prop changes
  useEffect(() => {
    if (isEdit && user) {
      editForm.reset({
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      })
    }
  }, [user, isEdit, editForm])

  // Reset create form when dialog opens fresh
  useEffect(() => {
    if (!isEdit && open) {
      createForm.reset({ email: "", name: "", password: "", role: "viewer" })
    }
  }, [open, isEdit, createForm])

  // ── Submit handlers ──────────────────────────────────────────────────────

  const handleCreate = createForm.handleSubmit(async (data) => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error ?? "사용자 생성에 실패했습니다")
      return
    }
    toast.success("사용자가 생성되었습니다")
    onSuccess()
    onClose()
  })

  const handleEdit = editForm.handleSubmit(async (data) => {
    if (!user) return
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error ?? "사용자 수정에 실패했습니다")
      return
    }
    toast.success("사용자 정보가 수정되었습니다")
    onSuccess()
    onClose()
  })

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "사용자 수정" : "사용자 추가"}</DialogTitle>
        </DialogHeader>

        {isEdit ? (
          // ── Edit form ──────────────────────────────────────────────────
          <form onSubmit={handleEdit} className="space-y-4 py-2">
            {/* Email — disabled in edit mode */}
            <div className="space-y-1">
              <Label>이메일</Label>
              <Input value={user?.email ?? ""} disabled className="bg-neutral-50" />
            </div>

            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="edit-name">이름</Label>
              <Input
                id="edit-name"
                {...editForm.register("name")}
                placeholder="이름 입력"
              />
              {editForm.formState.errors.name && (
                <p className="text-xs text-red-500">{editForm.formState.errors.name.message}</p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-1">
              <Label>역할</Label>
              <Select
                value={editForm.watch("role")}
                onValueChange={(v) =>
                  editForm.setValue("role", v as "admin" | "operator" | "viewer", {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">관리자 (admin)</SelectItem>
                  <SelectItem value="operator">운영자 (operator)</SelectItem>
                  <SelectItem value="viewer">뷰어 (viewer)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* isActive toggle */}
            <div className="flex items-center gap-3">
              <Switch
                id="edit-active"
                checked={editForm.watch("isActive")}
                onCheckedChange={(v) => editForm.setValue("isActive", v)}
              />
              <Label htmlFor="edit-active">계정 활성화</Label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button type="submit" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          // ── Create form ────────────────────────────────────────────────
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="create-email">이메일</Label>
              <Input
                id="create-email"
                type="email"
                {...createForm.register("email")}
                placeholder="user@example.com"
              />
              {createForm.formState.errors.email && (
                <p className="text-xs text-red-500">
                  {createForm.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="create-name">이름</Label>
              <Input
                id="create-name"
                {...createForm.register("name")}
                placeholder="이름 입력"
              />
              {createForm.formState.errors.name && (
                <p className="text-xs text-red-500">
                  {createForm.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-1">
              <Label>역할</Label>
              <Select
                value={createForm.watch("role")}
                onValueChange={(v) =>
                  createForm.setValue("role", v as "admin" | "operator" | "viewer", {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">관리자 (admin)</SelectItem>
                  <SelectItem value="operator">운영자 (operator)</SelectItem>
                  <SelectItem value="viewer">뷰어 (viewer)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <Label htmlFor="create-password">비밀번호 (임시)</Label>
              <Input
                id="create-password"
                type="text"
                {...createForm.register("password")}
                placeholder="최소 8자, 영문+숫자 포함"
              />
              {createForm.formState.errors.password && (
                <p className="text-xs text-red-500">
                  {createForm.formState.errors.password.message}
                </p>
              )}
              <p className="text-xs text-neutral-400">
                사용자는 첫 로그인 시 비밀번호를 변경해야 합니다 (D-02)
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button type="submit" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting ? "생성 중..." : "사용자 추가"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
