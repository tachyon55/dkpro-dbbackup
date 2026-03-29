import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { runBackup } from "@/lib/backup-engine"

export const dynamic = "force-dynamic"

// ── GET /api/backups/[jobId]/stream — SSE stream for backup progress ──────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth()

  if (!session?.user) {
    return new Response(JSON.stringify({ error: "인증이 필요합니다" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const { jobId } = await params

  // Verify the BackupHistory record exists and is in 'running' state
  const history = await prisma.backupHistory.findUnique({
    where: { id: jobId },
  })

  if (!history || history.status !== "running") {
    return new Response(JSON.stringify({ error: "백업 작업을 찾을 수 없습니다" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          )
        } catch {
          // Controller may already be closed
        }
      }

      // When the client disconnects, just close the stream — do NOT kill the backup
      request.signal.addEventListener("abort", () => {
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })

      try {
        await runBackup(jobId, send)
      } catch (err) {
        send("error", { message: (err as Error).message })
      } finally {
        try {
          controller.close()
        } catch {
          // Already closed
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
