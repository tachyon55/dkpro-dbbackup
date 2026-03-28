import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"
import { testConnection } from "@/lib/db-drivers"
import type { DbConnectionConfig, DbType } from "@/lib/db-drivers"

// ── POST /api/connections/[id]/test — Test connection ────────────────────────
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  const { id } = await params

  const connection = await prisma.dbConnection.findUnique({ where: { id } })

  if (!connection) {
    return NextResponse.json({ error: "연결을 찾을 수 없습니다" }, { status: 404 })
  }

  // Decrypt password before connecting
  let decryptedPassword: string | null = null
  if (connection.password) {
    try {
      decryptedPassword = decrypt(connection.password)
    } catch {
      return NextResponse.json(
        { error: "비밀번호 복호화에 실패했습니다" },
        { status: 500 }
      )
    }
  }

  const config: DbConnectionConfig = {
    type: connection.type as DbType,
    host: connection.host,
    port: connection.port,
    username: connection.username,
    password: decryptedPassword,
    database: connection.database,
    filePath: connection.filePath,
    sid: connection.sid,
    serviceName: connection.serviceName,
  }

  const result = await testConnection(config)

  return NextResponse.json({ data: result })
}
