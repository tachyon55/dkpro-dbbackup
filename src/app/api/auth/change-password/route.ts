import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { validatePassword } from "@/lib/auth-utils"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  const body = await request.json()
  const { currentPassword, newPassword, confirmNewPassword } = body

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return NextResponse.json({ error: "모든 필드를 입력해주세요" }, { status: 400 })
  }

  if (newPassword !== confirmNewPassword) {
    return NextResponse.json({ error: "새 비밀번호가 일치하지 않습니다" }, { status: 400 })
  }

  // D-04: validate new password strength
  const validation = validatePassword(newPassword)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.message }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  })

  if (!user?.password) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 })
  }

  const currentPasswordMatch = await bcrypt.compare(currentPassword, user.password)
  if (!currentPasswordMatch) {
    return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다" }, { status: 400 })
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10)

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      password: hashedPassword,
      mustChangePassword: false,
    },
  })

  return NextResponse.json({ success: true })
}
