import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import type { AuditEventType } from "@prisma/client"

export async function createAuditLog(params: {
  userId?: string | null
  userEmail?: string | null
  event: AuditEventType
  targetId?: string | null
  metadata?: Record<string, unknown> | null
}) {
  try {
    const metadata: Prisma.InputJsonValue | typeof Prisma.JsonNull =
      params.metadata != null ? (params.metadata as Prisma.InputJsonValue) : Prisma.JsonNull

    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        userEmail: params.userEmail ?? null,
        event: params.event,
        targetId: params.targetId ?? null,
        metadata,
      },
    })
  } catch {
    // Audit log failure must not break the main operation
    console.error("[AuditLog] Failed to write audit log:", params.event)
  }
}
