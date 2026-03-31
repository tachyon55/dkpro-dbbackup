import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"
import { executeQuery, detectStatementType } from "@/lib/db-drivers"
import type { DbConnectionConfig, DbType } from "@/lib/db-drivers"

const executeQuerySchema = z.object({
  connectionId: z.string(),
  sql: z.string().min(1).max(10000),
})

// ── POST /api/query/execute — Execute SQL against a connection ────────────────
export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  const body = await request.json()
  const result = executeQuerySchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const { connectionId, sql } = result.data

  // Fetch connection record
  const connection = await prisma.dbConnection.findUnique({
    where: { id: connectionId },
  })

  if (!connection) {
    return NextResponse.json({ error: "연결을 찾을 수 없습니다" }, { status: 404 })
  }

  // RBAC: viewer role can only execute SELECT
  const stmtType = detectStatementType(sql)
  if (session.user.role === "viewer" && stmtType !== "select") {
    return NextResponse.json(
      { error: "viewer 역할은 SELECT만 실행할 수 있습니다" },
      { status: 403 }
    )
  }

  // Decrypt password
  const decryptedPassword = connection.password ? decrypt(connection.password) : null

  // Build DbConnectionConfig from Prisma record
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

  try {
    const queryResult = await executeQuery(config, sql)
    return NextResponse.json({ data: queryResult })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    )
  }
}
