import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { startSchedule, stopSchedule } from "@/lib/scheduler"
import { createAuditLog } from "@/lib/audit"

// ── Validation schemas ────────────────────────────────────────────────────────

const updateSchema = z.object({
  hour: z.number().int().min(0).max(23),
  minute: z
    .number()
    .int()
    .refine((v) => [0, 15, 30, 45].includes(v), {
      message: "분은 0, 15, 30, 45 중 하나여야 합니다",
    }),
  backupPath: z.string().nullable().optional(),
  retentionDays: z.number().int().min(1).max(3650),
  notificationsEnabled: z.boolean(),
  catchUpOnRestart: z.boolean(),
  isEnabled: z.boolean(),
})

const toggleSchema = z.object({
  isEnabled: z.boolean(),
})

// ── GET /api/schedules/[id] — Get single schedule ────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  const { id } = await params

  const schedule = await prisma.schedule.findUnique({
    where: { id },
    include: {
      connection: { select: { id: true, name: true } },
    },
  })

  if (!schedule) {
    return NextResponse.json({ error: "스케줄을 찾을 수 없습니다" }, { status: 404 })
  }

  return NextResponse.json({ data: schedule })
}

// ── PUT /api/schedules/[id] — Full update ────────────────────────────────────

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  if (session.user.role === "viewer") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.schedule.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "스케줄을 찾을 수 없습니다" }, { status: 404 })
  }

  const body = await request.json()
  const result = updateSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const data = result.data

  const updated = await prisma.schedule.update({
    where: { id },
    data: {
      hour: data.hour,
      minute: data.minute,
      backupPath: data.backupPath ?? null,
      retentionDays: data.retentionDays,
      notificationsEnabled: data.notificationsEnabled,
      catchUpOnRestart: data.catchUpOnRestart,
      isEnabled: data.isEnabled,
    },
  })

  // Sync cron task if enabled state or timing changed
  if (data.isEnabled) {
    startSchedule(existing.connectionId, data.hour, data.minute)
  } else {
    stopSchedule(existing.connectionId)
  }

  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email,
    event: "SCHEDULE_UPDATE",
    targetId: existing.connectionId,
    metadata: { hour: data.hour, minute: data.minute, isEnabled: data.isEnabled },
  })

  return NextResponse.json({ data: updated })
}

// ── DELETE /api/schedules/[id] — Delete schedule ─────────────────────────────

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  if (session.user.role === "viewer") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.schedule.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "스케줄을 찾을 수 없습니다" }, { status: 404 })
  }

  // Stop cron task BEFORE deleting DB record (Pitfall 5)
  stopSchedule(existing.connectionId)

  await prisma.schedule.delete({ where: { id } })

  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email,
    event: "SCHEDULE_DELETE",
    targetId: existing.connectionId,
    metadata: { hour: existing.hour, minute: existing.minute },
  })

  return NextResponse.json({ data: { success: true } })
}

// ── PATCH /api/schedules/[id] — Toggle isEnabled ──────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  if (session.user.role === "viewer") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.schedule.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "스케줄을 찾을 수 없습니다" }, { status: 404 })
  }

  const body = await request.json()
  const result = toggleSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const { isEnabled } = result.data

  const updated = await prisma.schedule.update({
    where: { id },
    data: { isEnabled },
  })

  if (isEnabled) {
    startSchedule(existing.connectionId, existing.hour, existing.minute)
  } else {
    stopSchedule(existing.connectionId)
  }

  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email,
    event: "SCHEDULE_UPDATE",
    targetId: existing.connectionId,
    metadata: { isEnabled },
  })

  return NextResponse.json({ data: updated })
}
