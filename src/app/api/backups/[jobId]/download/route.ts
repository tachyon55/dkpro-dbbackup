import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createReadStream, existsSync, statSync } from "fs"
import { Readable } from "stream"
import path from "path"

// ── GET /api/backups/[jobId]/download — Stream backup file to browser ─────────

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
    select: { filePath: true, fileName: true, status: true },
  })

  if (!record) {
    return NextResponse.json({ error: "히스토리를 찾을 수 없습니다" }, { status: 404 })
  }

  if (record.status !== "success" || !record.filePath) {
    return NextResponse.json({ error: "다운로드할 파일이 없습니다" }, { status: 404 })
  }

  if (!existsSync(record.filePath)) {
    return NextResponse.json(
      { error: "파일을 찾을 수 없습니다. 서버에서 삭제되었을 수 있습니다." },
      { status: 404 }
    )
  }

  const stat = statSync(record.filePath)
  const nodeStream = createReadStream(record.filePath)
  const webStream = Readable.toWeb(nodeStream) as ReadableStream

  const fileName = record.fileName ?? path.basename(record.filePath)

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      "Content-Length": stat.size.toString(),
    },
  })
}
