import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"
import { createReadStream, statSync } from "fs"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"
import type { CloudStorageSettings } from "@prisma/client"

// ── S3 client factory ─────────────────────────────────────────────────────────

function createS3Client(settings: CloudStorageSettings): S3Client {
  return new S3Client({
    region: settings.region ?? "us-east-1",
    credentials: {
      accessKeyId: settings.accessKeyId!,
      secretAccessKey: decrypt(settings.secretAccessKey!),
    },
    // Only pass endpoint for S3-compatible services (NCP, MinIO, etc.)
    ...(settings.endpoint ? { endpoint: settings.endpoint } : {}),
    // forcePathStyle is required for non-AWS S3-compatible endpoints
    forcePathStyle: !!settings.endpoint,
  })
}

// ── Main upload function ───────────────────────────────────────────────────────

export async function uploadToS3(
  filePath: string,
  connectionName: string,
  fileName: string
): Promise<{ key: string; bucket: string; size: number }> {
  const settings = await prisma.cloudStorageSettings.findFirst()

  if (!settings || !settings.bucket || !settings.accessKeyId || !settings.secretAccessKey) {
    throw new Error("클라우드 스토리지 설정이 없습니다")
  }

  // Build S3 key: connectionName/YYYY-MM-DD/fileName
  const datePart = new Date().toISOString().slice(0, 10)
  const key = [
    encodeURIComponent(connectionName),
    encodeURIComponent(datePart),
    encodeURIComponent(fileName),
  ].join("/")

  // Get file size
  const { size } = statSync(filePath)

  // Create read stream
  const stream = createReadStream(filePath)

  // Use @aws-sdk/lib-storage Upload for multipart support (handles files > 5MB automatically)
  const upload = new Upload({
    client: createS3Client(settings),
    params: {
      Bucket: settings.bucket,
      Key: key,
      Body: stream,
    },
    queueSize: 4,             // parallel upload parts
    partSize: 5 * 1024 * 1024, // 5MB minimum per AWS spec
    leavePartsOnError: false,
  })

  await upload.done()

  return { key, bucket: settings.bucket, size }
}

// ── Test connection ────────────────────────────────────────────────────────────

export async function testS3Connection(): Promise<{ success: boolean; message: string }> {
  const settings = await prisma.cloudStorageSettings.findFirst()

  if (!settings || !settings.bucket || !settings.accessKeyId || !settings.secretAccessKey) {
    return { success: false, message: "설정이 없습니다" }
  }

  try {
    const client = createS3Client(settings)
    await client.send(new HeadBucketCommand({ Bucket: settings.bucket }))
    return { success: true, message: "연결 성공" }
  } catch (err) {
    return { success: false, message: (err as Error).message }
  }
}
