import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/crypto"
import { updateConnectionSchema } from "@/lib/validations/connection"
import { createAuditLog } from "@/lib/audit"
import { stopSchedule } from "@/lib/scheduler"

const CONNECTION_SELECT = {
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
  backupStorageType: true,
  backupLocalPath: true,
  createdAt: true,
  updatedAt: true,
} as const

// ── GET /api/connections/[id] — Get single connection ────────────────────────
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  const { id } = await params

  const connection = await prisma.dbConnection.findUnique({
    where: { id },
    select: CONNECTION_SELECT,
  })

  if (!connection) {
    return NextResponse.json({ error: "연결을 찾을 수 없습니다" }, { status: 404 })
  }

  return NextResponse.json({ data: connection })
}

// ── PUT /api/connections/[id] — Update connection ────────────────────────────
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  if (!["admin", "operator"].includes(session.user.role)) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.dbConnection.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "연결을 찾을 수 없습니다" }, { status: 404 })
  }

  const body = await request.json()
  const result = updateConnectionSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const data = result.data

  // Re-encrypt if a new non-empty password is provided; keep existing if empty/null
  let passwordUpdate: string | null | undefined = undefined // undefined = don't touch
  if (data.password !== undefined) {
    if (data.password && data.password.length > 0) {
      passwordUpdate = encrypt(data.password)
    } else {
      // Empty string or null → keep existing encrypted password
      passwordUpdate = undefined
    }
  }

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.type !== undefined) updateData.type = data.type
  if (data.host !== undefined) updateData.host = data.host
  if (data.port !== undefined) updateData.port = data.port
  if (data.username !== undefined) updateData.username = data.username
  if (passwordUpdate !== undefined) updateData.password = passwordUpdate
  if (data.database !== undefined) updateData.database = data.database
  if (data.filePath !== undefined) updateData.filePath = data.filePath
  if (data.sid !== undefined) updateData.sid = data.sid
  if (data.serviceName !== undefined) updateData.serviceName = data.serviceName
  if (data.color !== undefined) updateData.color = data.color
  if (data.backupStorageType !== undefined) updateData.backupStorageType = data.backupStorageType
  if (data.backupLocalPath !== undefined) updateData.backupLocalPath = data.backupLocalPath

  const connection = await prisma.dbConnection.update({
    where: { id },
    data: updateData,
    select: CONNECTION_SELECT,
  })

  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email,
    event: "CONN_UPDATE",
    targetId: id,
    metadata: { name: connection.name, changes: Object.keys(updateData) },
  })

  return NextResponse.json({ data: connection })
}

// ── DELETE /api/connections/[id] — Delete connection (admin only) ─────────────
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  // Admin only for delete (D-15)
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.dbConnection.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "연결을 찾을 수 없습니다" }, { status: 404 })
  }

  stopSchedule(id) // prevent orphaned cron task (Pitfall 5)

  await prisma.dbConnection.delete({ where: { id } })

  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email,
    event: "CONN_DELETE",
    targetId: id,
    metadata: { name: existing.name, type: existing.type },
  })

  return NextResponse.json({ data: { deleted: true } })
}
