import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createUserSchema } from "@/lib/validations/user"
import bcrypt from "bcryptjs"
import { createAuditLog } from "@/lib/audit"

// ── GET /api/users — List all users (admin only) ─────────────────────────────
export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ data: users })
}

// ── POST /api/users — Create user (admin only) ───────────────────────────────
export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  }

  const body = await request.json()
  const result = createUserSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const { email, name, password, role } = result.data

  // Check for duplicate email
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: "이미 등록된 이메일입니다" },
      { status: 409 }
    )
  }

  const hashedPassword = bcrypt.hashSync(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role,
      mustChangePassword: true, // D-02: new users must change password on first login
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true,
    },
  })

  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email,
    event: "USER_CREATE",
    targetId: user.id,
    metadata: { email: user.email, name: user.name, role: user.role },
  })

  return NextResponse.json({ data: user }, { status: 201 })
}
