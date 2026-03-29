import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { existsSync } from "fs"

// ── GET /api/backups/[jobId] — Single backup history record with full detail ──

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  const { jobId } = await params

  const record = await prisma.backupHistory.findUnique({
    where: { id: jobId },
  })

  if (!record) {
    return NextResponse.json({ error: "히스토리를 찾을 수 없습니다" }, { status: 404 })
  }

  // Check if file still exists on disk
  const fileExists = record.filePath ? existsSync(record.filePath) : false

  return NextResponse.json({
    data: {
      ...record,
      fileSizeBytes: record.fileSizeBytes?.toString() ?? null,
      fileExists,
    },
  })
}
