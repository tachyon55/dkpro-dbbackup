import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { updateUserSchema } from "@/lib/validations/user"
import { createAuditLog } from "@/lib/audit"

// ── GET /api/users/[id] — Get single user (admin only) ───────────────────────
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  }

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 })
  }

  return NextResponse.json({ data: user })
}

// ── PUT /api/users/[id] — Update user (admin only) ───────────────────────────
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const result = updateUserSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const updates = result.data

  // D-06 guard: prevent demoting/deactivating the last active admin
  const targetUser = await prisma.user.findUnique({ where: { id } })
  if (!targetUser) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 })
  }

  const isDemotingFromAdmin = targetUser.role === "admin" && updates.role && updates.role !== "admin"
  const isDeactivating = updates.isActive === false && targetUser.isActive

  if (isDemotingFromAdmin || isDeactivating) {
    const activeAdminCount = await prisma.user.count({
      where: { role: "admin", isActive: true },
    })
    if (activeAdminCount <= 1) {
      return NextResponse.json(
        { error: "마지막 관리자 계정은 변경할 수 없습니다" },
        { status: 400 }
      )
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updates,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  })

  if (updates.role && updates.role !== targetUser.role) {
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email,
      event: "ROLE_CHANGE",
      targetId: id,
      metadata: { from: targetUser.role, to: updates.role, email: targetUser.email },
    })
  }

  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email,
    event: "USER_UPDATE",
    targetId: id,
    metadata: { changes: Object.keys(updates), email: targetUser.email },
  })

  return NextResponse.json({ data: updated })
}

// ── DELETE /api/users/[id] — Delete user (admin only) ────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  }

  const { id } = await params

  // Cannot delete self
  if (session.user.id === id) {
    return NextResponse.json(
      { error: "자기 자신은 삭제할 수 없습니다" },
      { status: 400 }
    )
  }

  const targetUser = await prisma.user.findUnique({ where: { id } })
  if (!targetUser) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 })
  }

  // D-06 guard: prevent deleting the last active admin
  if (targetUser.role === "admin") {
    const activeAdminCount = await prisma.user.count({
      where: { role: "admin", isActive: true },
    })
    if (activeAdminCount <= 1) {
      return NextResponse.json(
        { error: "마지막 관리자 계정은 삭제할 수 없습니다" },
        { status: 400 }
      )
    }
  }

  await prisma.user.delete({ where: { id } })

  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email,
    event: "USER_DELETE",
    targetId: id,
    metadata: { email: targetUser.email, role: targetUser.role },
  })

  return NextResponse.json({ data: { message: "사용자가 삭제되었습니다" } })
}
