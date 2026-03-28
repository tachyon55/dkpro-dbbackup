import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/crypto"
import { createConnectionSchema } from "@/lib/validations/connection"

// ── GET /api/connections — List all connections ───────────────────────────────
export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  const connections = await prisma.dbConnection.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      host: true,
      port: true,
      username: true,
      // password intentionally excluded — never send encrypted password to client
      database: true,
      filePath: true,
      sid: true,
      serviceName: true,
      color: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ data: connections })
}

// ── POST /api/connections — Create connection ─────────────────────────────────
export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  if (!["admin", "operator"].includes(session.user.role)) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  }

  const body = await request.json()
  const result = createConnectionSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const data = result.data

  // Encrypt password before storing
  const encryptedPassword =
    data.password && data.password.length > 0 ? encrypt(data.password) : null

  const connection = await prisma.dbConnection.create({
    data: {
      name: data.name,
      type: data.type,
      host: data.host ?? null,
      port: data.port ?? null,
      username: data.username ?? null,
      password: encryptedPassword,
      database: data.database ?? null,
      filePath: data.filePath ?? null,
      sid: data.sid ?? null,
      serviceName: data.serviceName ?? null,
      color: data.color ?? "#6366f1",
    },
    select: {
      id: true,
      name: true,
      type: true,
      host: true,
      port: true,
      username: true,
      // password intentionally excluded
      database: true,
      filePath: true,
      sid: true,
      serviceName: true,
      color: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({ data: connection }, { status: 201 })
}
