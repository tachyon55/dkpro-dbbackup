import { spawn } from "child_process"
import { createWriteStream, createReadStream } from "fs"
import { stat } from "fs/promises"
import { createHash } from "crypto"
import path from "path"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"
import { createAuditLog } from "@/lib/audit"
import { lockBackup, unlockBackup } from "@/lib/backup-store"
import {
  buildSpawnArgs,
  generateBackupFileName,
  getBackupDir,
  isStdoutDump,
} from "@/lib/backup-tools"

// ── Types ────────────────────────────────────────────────────────────────────

type SendFn = (event: string, data: unknown) => void

// ── Core backup runner ───────────────────────────────────────────────────────

/**
 * Execute a backup job identified by historyId.
 * This function is called after a BackupHistory record has already been created
 * with status='running' and the connection lock has been acquired.
 *
 * @param historyId - The BackupHistory record id to update during execution
 * @param send      - SSE event emitter: send(eventName, data)
 */
export async function runBackup(historyId: string, send: SendFn, backupDir?: string): Promise<void> {
  const startTime = Date.now()

  // 1. Fetch the BackupHistory record (includes connectionId)
  const history = await prisma.backupHistory.findUnique({
    where: { id: historyId },
  })
  if (!history) {
    send("error", { message: `백업 히스토리를 찾을 수 없습니다: ${historyId}` })
    return
  }

  const connectionId = history.connectionId
  if (!connectionId) {
    await prisma.backupHistory.update({
      where: { id: historyId },
      data: {
        status: "failed",
        errorMessage: "연결 정보가 없습니다",
        completedAt: new Date(),
      },
    })
    send("error", { message: "연결 정보가 없습니다" })
    return
  }

  // 2. Fetch DbConnection
  const conn = await prisma.dbConnection.findUnique({
    where: { id: connectionId },
  })
  if (!conn) {
    await prisma.backupHistory.update({
      where: { id: historyId },
      data: {
        status: "failed",
        errorMessage: "DB 연결을 찾을 수 없습니다",
        completedAt: new Date(),
      },
    })
    send("error", { message: "DB 연결을 찾을 수 없습니다" })
    unlockBackup(connectionId)
    return
  }

  // 3. Decrypt password
  let decryptedPassword: string | null = null
  if (conn.password) {
    try {
      decryptedPassword = decrypt(conn.password)
    } catch {
      const msg = "비밀번호 복호화에 실패했습니다"
      await prisma.backupHistory.update({
        where: { id: historyId },
        data: { status: "failed", errorMessage: msg, completedAt: new Date() },
      })
      send("error", { message: msg })
      unlockBackup(connectionId)
      return
    }
  }

  const decryptedConn = { ...conn, password: decryptedPassword }

  // 4. Build output path — use caller-provided dir if given, else derive default
  const resolvedBackupDir = backupDir ?? await getBackupDir(connectionId)
  const fileName = generateBackupFileName(conn.database ?? conn.name, conn.type)
  const outputPath = path.join(resolvedBackupDir, fileName)

  // 5. Send started event
  send("started", {
    historyId,
    connectionName: conn.name,
    dbType: conn.type,
    fileName,
  })

  // 6. Audit: backup started
  try {
    await createAuditLog({
      event: "BACKUP_START",
      targetId: connectionId,
      metadata: {
        connectionName: conn.name,
        dbType: conn.type,
        historyId,
      },
    })
  } catch {
    // Audit failures never propagate
  }

  // 7. Build spawn config
  const { cmd, args, env: spawnEnv } = buildSpawnArgs(decryptedConn, outputPath)

  const logLines: string[] = []
  let errorMessage: string | undefined

  try {
    if (isStdoutDump(conn.type)) {
      // ── Stdout-dump path (mysql, mariadb, postgresql, sqlite) ──────────────
      await runStdoutDump({
        historyId,
        connectionId,
        conn,
        cmd,
        args,
        spawnEnv,
        outputPath,
        fileName,
        startTime,
        logLines,
        send,
      })
    } else {
      // ── Disk-write path (sqlserver, oracle) ────────────────────────────────
      await runDiskWriteDump({
        historyId,
        connectionId,
        conn,
        cmd,
        args,
        spawnEnv,
        outputPath,
        fileName,
        startTime,
        logLines,
        send,
      })
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err)
    const fullLog = logLines.join("\n")
    await prisma.backupHistory.update({
      where: { id: historyId },
      data: {
        status: "failed",
        errorMessage,
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        fullLog,
      },
    })
    send("error", { message: errorMessage })

    try {
      await createAuditLog({
        event: "BACKUP_FAIL",
        targetId: connectionId,
        metadata: { connectionName: conn.name, historyId, errorMessage },
      })
    } catch {
      // Audit failures never propagate
    }
  } finally {
    unlockBackup(connectionId)
  }
}

// ── Stdout-dump execution ────────────────────────────────────────────────────

interface DumpParams {
  historyId: string
  connectionId: string
  conn: { name: string; type: string }
  cmd: string
  args: string[]
  spawnEnv?: Record<string, string>
  outputPath: string
  fileName: string
  startTime: number
  logLines: string[]
  send: SendFn
}

async function runStdoutDump(params: DumpParams): Promise<void> {
  const {
    historyId, connectionId, conn, cmd, args, spawnEnv,
    outputPath, fileName, startTime, logLines, send,
  } = params

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      env: { ...process.env, ...(spawnEnv ?? {}) },
    })

    const fileStream = createWriteStream(outputPath)
    const hash = createHash("sha256")
    let firstChunk = true
    let stdoutLineCount = 0

    // Pipe stdout to file AND hash
    child.stdout.on("data", (chunk: Buffer) => {
      fileStream.write(chunk)
      hash.update(chunk)

      if (firstChunk) {
        firstChunk = false
        send("progress", { stage: "running" })
      }

      // Throttle stdout logging — only every 100 lines to avoid SSE flood
      stdoutLineCount++
      if (stdoutLineCount % 100 === 0) {
        const line = `[stdout] ${stdoutLineCount} chunks received`
        logLines.push(line)
        send("log", { line, source: "stdout" })
      }
    })

    // Capture stderr lines and send to client
    child.stderr.on("data", (chunk: Buffer) => {
      const lines = chunk.toString("utf8").split("\n").filter(Boolean)
      for (const line of lines) {
        logLines.push(`[stderr] ${line}`)
        send("log", { line, source: "stderr" })
      }
    })

    child.on("error", (err) => {
      fileStream.destroy()
      reject(new Error(`프로세스 실행 오류: ${err.message}`))
    })

    child.on("close", async (code) => {
      fileStream.end(async () => {
        if (code !== 0) {
          reject(new Error(`덤프 도구가 종료 코드 ${code}로 실패했습니다`))
          return
        }

        try {
          // Get file size and finalize SHA-256
          const statResult = await stat(outputPath)
          const sha256 = hash.digest("hex")
          const durationMs = Date.now() - startTime
          const fullLog = logLines.join("\n")
          const fileSizeBytes = BigInt(statResult.size)

          await prisma.backupHistory.update({
            where: { id: historyId },
            data: {
              status: "success",
              fileName,
              filePath: outputPath,
              fileSizeBytes,
              sha256,
              durationMs,
              completedAt: new Date(),
              fullLog,
            },
          })

          send("complete", {
            historyId,
            fileName,
            fileSizeBytes: Number(fileSizeBytes),
            durationMs,
            sha256,
          })

          try {
            await createAuditLog({
              event: "BACKUP_COMPLETE",
              targetId: connectionId,
              metadata: {
                connectionName: conn.name,
                historyId,
                fileName,
                durationMs,
                fileSizeBytes: Number(fileSizeBytes),
              },
            })
          } catch {
            // Audit failures never propagate
          }

          resolve()
        } catch (err) {
          reject(err)
        }
      })
    })
  })
}

// ── Disk-write execution (sqlserver, oracle) ─────────────────────────────────

async function runDiskWriteDump(params: DumpParams): Promise<void> {
  const {
    historyId, connectionId, conn, cmd, args, spawnEnv,
    outputPath, fileName, startTime, logLines, send,
  } = params

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      env: { ...process.env, ...(spawnEnv ?? {}) },
    })

    // For disk-write DBs: capture stdout/stderr for logging and progress
    child.stdout.on("data", (chunk: Buffer) => {
      const lines = chunk.toString("utf8").split("\n").filter(Boolean)
      for (const line of lines) {
        logLines.push(`[stdout] ${line}`)
        send("log", { line, source: "stdout" })

        // SQL Server emits "N percent processed" — parse for progress
        const match = line.match(/(\d+)\s+percent/i)
        if (match) {
          send("progress", { stage: "running", percent: parseInt(match[1], 10) })
        }
      }
    })

    child.stderr.on("data", (chunk: Buffer) => {
      const lines = chunk.toString("utf8").split("\n").filter(Boolean)
      for (const line of lines) {
        logLines.push(`[stderr] ${line}`)
        send("log", { line, source: "stderr" })
      }
    })

    child.on("error", (err) => {
      reject(new Error(`프로세스 실행 오류: ${err.message}`))
    })

    child.on("close", async (code) => {
      if (code !== 0) {
        reject(new Error(`덤프 도구가 종료 코드 ${code}로 실패했습니다`))
        return
      }

      try {
        const durationMs = Date.now() - startTime
        const fullLog = logLines.join("\n")

        // For disk-write DBs, try to get file stats if output path was used (sqlserver)
        // Oracle expdp writes to server directory, so we may not have the local file
        let fileSizeBytes: bigint | undefined
        try {
          const statResult = await stat(outputPath)
          fileSizeBytes = BigInt(statResult.size)
        } catch {
          // File may not exist locally (Oracle expdp writes to DB server)
          fileSizeBytes = undefined
        }

        await prisma.backupHistory.update({
          where: { id: historyId },
          data: {
            status: "success",
            fileName,
            filePath: fileSizeBytes !== undefined ? outputPath : null,
            fileSizeBytes: fileSizeBytes ?? null,
            durationMs,
            completedAt: new Date(),
            fullLog,
          },
        })

        send("complete", {
          historyId,
          fileName,
          fileSizeBytes: fileSizeBytes !== undefined ? Number(fileSizeBytes) : null,
          durationMs,
        })

        try {
          await createAuditLog({
            event: "BACKUP_COMPLETE",
            targetId: connectionId,
            metadata: {
              connectionName: conn.name,
              historyId,
              fileName,
              durationMs,
            },
          })
        } catch {
          // Audit failures never propagate
        }

        resolve()
      } catch (err) {
        reject(err)
      }
    })
  })
}

// ── SHA-256 file hash utility (for re-verification) ──────────────────────────

/**
 * Compute SHA-256 hash of an existing file via streaming.
 * Used for re-verification without loading entire file into memory.
 */
export async function computeFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256")
    const stream = createReadStream(filePath)
    stream.on("data", (chunk) => hash.update(chunk))
    stream.on("end", () => resolve(hash.digest("hex")))
    stream.on("error", reject)
  })
}
