import { prisma } from "@/lib/prisma"
import type { AuditEventType } from "@prisma/client"

export async function createAuditLog(params: {
  userId?: string | null
  userEmail?: string | null
  event: AuditEventType
  targetId?: string | null
  metadata?: Record<string, unknown> | null
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        userEmail: params.userEmail ?? null,
        event: params.event,
        targetId: params.targetId ?? null,
        metadata: params.metadata ?? null,
      },
    })
  } catch {
    // Audit log failure must not break the main operation
    console.error("[AuditLog] Failed to write audit log:", params.event)
  }
}
