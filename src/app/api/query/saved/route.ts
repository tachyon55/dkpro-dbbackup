import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const createSavedQuerySchema = z.object({
  name: z.string().min(1).max(100),
  sql: z.string().min(1),
  connectionId: z.string().optional(),
})

// ── GET /api/query/saved — List saved queries for current user ────────────────
export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  const queries = await prisma.savedQuery.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json({ data: queries })
}

// ── POST /api/query/saved — Create a saved query ──────────────────────────────
export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  const body = await request.json()
  const result = createSavedQuerySchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const { name, sql, connectionId } = result.data

  const query = await prisma.savedQuery.create({
    data: {
      userId: session.user.id,
      name,
      sql,
      connectionId: connectionId ?? null,
    },
  })

  return NextResponse.json({ data: query }, { status: 201 })
}
