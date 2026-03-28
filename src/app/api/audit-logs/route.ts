import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

// ── GET /api/audit-logs — List audit logs (admin only, D-17) ────────────────
export async function GET(request: Request) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const event = searchParams.get("event")       // filter by AuditEventType
  const userId = searchParams.get("userId")      // filter by actor
  const from = searchParams.get("from")          // ISO date string
  const to = searchParams.get("to")              // ISO date string
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "50", 10)

  const where: Prisma.AuditLogWhereInput = {}

  if (event) {
    where.event = event as Prisma.AuditLogWhereInput["event"]
  }
  if (userId) {
    where.userId = userId
  }
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({
    data: logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}
