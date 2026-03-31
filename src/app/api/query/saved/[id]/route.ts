import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const updateSavedQuerySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sql: z.string().min(1).optional(),
  connectionId: z.string().nullable().optional(),
})

// ── PUT /api/query/saved/[id] — Update a saved query (owner only) ─────────────
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  const { id } = await params

  // Ownership guard — also ensures record exists
  const existing = await prisma.savedQuery.findUnique({
    where: { id, userId: session.user.id },
  })

  if (!existing) {
    return NextResponse.json({ error: "저장된 쿼리를 찾을 수 없습니다" }, { status: 404 })
  }

  const body = await request.json()
  const result = updateSavedQuerySchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const updated = await prisma.savedQuery.update({
    where: { id },
    data: { ...result.data },
  })

  return NextResponse.json({ data: updated })
}

// ── DELETE /api/query/saved/[id] — Delete a saved query (owner only) ─────────
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  const { id } = await params

  // Ownership guard — also ensures record exists
  const existing = await prisma.savedQuery.findUnique({
    where: { id, userId: session.user.id },
  })

  if (!existing) {
    return NextResponse.json({ error: "저장된 쿼리를 찾을 수 없습니다" }, { status: 404 })
  }

  await prisma.savedQuery.delete({ where: { id } })

  return NextResponse.json({ data: { id } })
}
