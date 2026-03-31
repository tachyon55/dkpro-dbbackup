import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/crypto"

// ── Validation schema ─────────────────────────────────────────────────────────

const settingsSchema = z.object({
  endpoint: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  bucket: z.string().nullable().optional(),
  accessKeyId: z.string().nullable().optional(),
  secretAccessKey: z.string().nullable().optional(),
})

// ── GET /api/cloud-storage/settings ──────────────────────────────────────────

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  if (session.user.role !== "admin") return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })

  const settings = await prisma.cloudStorageSettings.findFirst()

  if (!settings) {
    return NextResponse.json({ data: null })
  }

  // D-08: Mask secretAccessKey — never return encrypted value to client
  const maskedValue = settings.secretAccessKey ? "__masked__" : null

  return NextResponse.json({
    data: {
      ...settings,
      secretAccessKey: maskedValue,
    },
  })
}

// ── PUT /api/cloud-storage/settings ──────────────────────────────────────────

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  if (session.user.role !== "admin") return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 })

  const body = await request.json()
  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다" }, { status: 400 })
  }

  const { endpoint, region, bucket, accessKeyId, secretAccessKey: rawSecret } = parsed.data

  // Load existing record to preserve encrypted secret if not changing
  const existing = await prisma.cloudStorageSettings.findFirst()

  // Determine encrypted secret value:
  // - null, empty string, or "__masked__" → preserve existing encrypted value
  // - New plaintext value → encrypt it
  let encryptedSecret: string | null | undefined
  if (!rawSecret || rawSecret === "__masked__") {
    encryptedSecret = existing?.secretAccessKey ?? null
  } else {
    encryptedSecret = encrypt(rawSecret)
  }

  await prisma.cloudStorageSettings.upsert({
    where: { id: existing?.id ?? "" },
    create: {
      endpoint: endpoint ?? null,
      region: region ?? null,
      bucket: bucket ?? null,
      accessKeyId: accessKeyId ?? null,
      secretAccessKey: encryptedSecret ?? null,
    },
    update: {
      endpoint: endpoint ?? null,
      region: region ?? null,
      bucket: bucket ?? null,
      accessKeyId: accessKeyId ?? null,
      secretAccessKey: encryptedSecret ?? null,
    },
  })

  // D-08: Do NOT return the encrypted value — return only success indicator
  return NextResponse.json({ data: { saved: true } })
}
