import { NextResponse } from "next/server"
import { auth } from "@/auth"

// ── POST /api/cloud-storage/test ──────────────────────────────────────────────

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  if (session.user.role !== "admin") return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })

  // Dynamic import to avoid loading S3 client unless needed
  const { testS3Connection } = await import("@/lib/s3-upload")
  const result = await testS3Connection()

  // testS3Connection() never throws — always returns { success, message }
  return NextResponse.json({ data: result })
}
