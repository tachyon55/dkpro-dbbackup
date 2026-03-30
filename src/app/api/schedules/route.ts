import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { startSchedule } from "@/lib/scheduler"
import { createAuditLog } from "@/lib/audit"

// ── Validation schema ─────────────────────────────────────────────────────────

const createSchema = z.object({
  connectionId: z.string().min(1),
  hour: z.number().int().min(0).max(23),
  minute: z
    .number()
    .int()
    .refine((v) => [0, 15, 30, 45].includes(v), {
      message: "분은 0, 15, 30, 45 중 하나여야 합니다",
    }),
  backupPath: z.string().nullable().optional(),
  retentionDays: z.number().int().min(1).max(3650).default(30),
  notificationsEnabled: z.boolean().default(false),
  catchUpOnRestart: z.boolean().default(false),
  isEnabled: z.boolean().default(false),
})

// ── GET /api/schedules — List all schedules ───────────────────────────────────

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  const schedules = await prisma.schedule.findMany({
    include: {
      connection: {
        select: { id: true, name: true, type: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ data: schedules })
}

// ── POST /api/schedules — Create schedule ────────────────────────────────────

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  if (session.user.role === "viewer") {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })
  }

  const body = await request.json()
  const result = createSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    )
  }

  const data = result.data

  // Check no existing schedule for this connection
  const existing = await prisma.schedule.findUnique({
    where: { connectionId: data.connectionId },
  })
  if (existing) {
    return NextResponse.json(
      { error: "이 연결에 이미 스케줄이 있습니다" },
      { status: 409 }
    )
  }

  // Check connection exists
  const connection = await prisma.dbConnection.findUnique({
    where: { id: data.connectionId },
  })
  if (!connection) {
    return NextResponse.json({ error: "연결을 찾을 수 없습니다" }, { status: 404 })
  }

  const schedule = await prisma.schedule.create({
    data: {
      connectionId: data.connectionId,
      hour: data.hour,
      minute: data.minute,
      backupPath: data.backupPath ?? null,
      retentionDays: data.retentionDays,
      notificationsEnabled: data.notificationsEnabled,
      catchUpOnRestart: data.catchUpOnRestart,
      isEnabled: data.isEnabled,
    },
  })

  if (data.isEnabled) {
    startSchedule(data.connectionId, data.hour, data.minute)
  }

  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email,
    event: "SCHEDULE_CREATE",
    targetId: data.connectionId,
    metadata: { hour: data.hour, minute: data.minute, retentionDays: data.retentionDays },
  })

  return NextResponse.json({ data: schedule }, { status: 201 })
}
