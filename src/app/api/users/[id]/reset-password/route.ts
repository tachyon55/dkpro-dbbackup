import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// ── POST /api/users/[id]/reset-password — Reset to temp password (admin, D-08) ─
export async function POST(
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

  const targetUser = await prisma.user.findUnique({ where: { id } })
  if (!targetUser) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 })
  }

  // Generate temporary password: "Temp" + 6-digit random number + "!"
  const randomDigits = Math.floor(100000 + Math.random() * 900000)
  const tempPassword = `Temp${randomDigits}!`

  const hashedPassword = bcrypt.hashSync(tempPassword, 10)

  await prisma.user.update({
    where: { id },
    data: {
      password: hashedPassword,
      mustChangePassword: true, // D-02: force change on next login
    },
  })

  return NextResponse.json({
    data: {
      tempPassword,
      message: "임시 비밀번호가 설정되었습니다. 사용자에게 안전하게 전달하세요.",
    },
  })
}
