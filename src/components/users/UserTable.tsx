"use client"

import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export type UserRow = {
  id: string
  email: string
  name: string
  role: "admin" | "operator" | "viewer"
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: "관리자",
  operator: "운영자",
  viewer: "뷰어",
}

const ROLE_VARIANT: Record<string, "destructive" | "default" | "secondary"> = {
  admin: "destructive",
  operator: "default",
  viewer: "secondary",
}

type Props = {
  users: UserRow[]
  currentUserId: string
  onEdit: (user: UserRow) => void
  onDelete: (user: UserRow) => void
  onResetPassword: (user: UserRow) => void
}

export function UserTable({ users, currentUserId, onEdit, onDelete, onResetPassword }: Props) {
  if (users.length === 0) {
    return (
      <div className="rounded-md border border-neutral-200 bg-white px-6 py-12 text-center">
        <p className="text-sm text-neutral-500">등록된 사용자가 없습니다</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-neutral-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-neutral-50">
            <TableHead className="w-[220px]">이메일</TableHead>
            <TableHead className="w-[140px]">이름</TableHead>
            <TableHead className="w-[100px]">역할</TableHead>
            <TableHead className="w-[90px]">상태</TableHead>
            <TableHead className="w-[160px]">마지막 로그인</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium text-neutral-900">{user.email}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>
                <Badge variant={ROLE_VARIANT[user.role]}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </Badge>
              </TableCell>
              <TableCell>
                {user.isActive ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                    활성
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-neutral-500">
                    비활성
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-neutral-500 text-sm">
                {user.lastLoginAt
                  ? format(new Date(user.lastLoginAt), "yyyy-MM-dd HH:mm")
                  : "-"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(user)}
                  >
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onResetPassword(user)}
                  >
                    비밀번호 초기화
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={user.id === currentUserId}
                    onClick={() => onDelete(user)}
                  >
                    삭제
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
