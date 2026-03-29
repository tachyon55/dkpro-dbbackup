import path from "path"
import { mkdir } from "fs/promises"
import { format } from "date-fns"
import type { DbType } from "@prisma/client"

// ── Types ────────────────────────────────────────────────────────────────────

export interface SpawnConfig {
  cmd: string
  args: string[]
  env?: Record<string, string>
}

export interface DecryptedConnection {
  type: DbType
  host?: string | null
  port?: number | null
  username?: string | null
  password?: string | null
  database?: string | null
  filePath?: string | null
  sid?: string | null
  serviceName?: string | null
}

// ── Spawn args builder ───────────────────────────────────────────────────────

/**
 * Build the spawn command + args for the native dump tool.
 * CRITICAL: Always uses args array — never string interpolation — to prevent shell injection.
 */
export function buildSpawnArgs(
  conn: DecryptedConnection,
  outputPath: string
): SpawnConfig {
  const host = conn.host ?? "localhost"
  const port = conn.port ?? getDefaultPort(conn.type)
  const username = conn.username ?? ""
  const password = conn.password ?? ""
  const database = conn.database ?? ""

  switch (conn.type) {
    case "mysql":
    case "mariadb":
      return {
        cmd: "mysqldump",
        args: [
          "-h", host,
          "-P", String(port),
          "-u", username,
          `--password=${password}`,
          database,
        ],
      }

    case "postgresql":
      return {
        cmd: "pg_dump",
        args: [
          "-h", host,
          "-p", String(port),
          "-U", username,
          "-F", "c",
          database,
        ],
        // PGPASSWORD env var — never pass password as CLI arg for PostgreSQL
        env: { PGPASSWORD: password },
      }

    case "sqlserver": {
      // sqlcmd writes to disk directly — no stdout stream
      const query = `BACKUP DATABASE [${database}] TO DISK=N'${outputPath}' WITH FORMAT`
      return {
        cmd: "sqlcmd",
        args: [
          "-S", `${host},${port}`,
          "-U", username,
          "-P", password,
          "-Q", query,
        ],
      }
    }

    case "oracle": {
      // expdp writes to Oracle server directory — not stdout
      const serviceOrSid = conn.serviceName ?? conn.sid ?? database
      const fileName = path.basename(outputPath)
      const logFileName = fileName.replace(/\.dmp$/, ".log")
      return {
        cmd: "expdp",
        args: [
          `${username}/${password}@${host}:${port}/${serviceOrSid}`,
          "DIRECTORY=DATA_PUMP_DIR",
          `DUMPFILE=${fileName}`,
          `LOGFILE=${logFileName}`,
        ],
      }
    }

    case "sqlite":
      return {
        cmd: "sqlite3",
        args: [conn.filePath ?? database, ".dump"],
      }

    default:
      throw new Error(`Unsupported DB type: ${conn.type}`)
  }
}

// ── File extension ───────────────────────────────────────────────────────────

export function getFileExtension(dbType: DbType): string {
  switch (dbType) {
    case "mysql":
    case "mariadb":
    case "sqlite":
      return ".sql"
    case "postgresql":
      return ".dump"
    case "sqlserver":
      return ".bak"
    case "oracle":
      return ".dmp"
    default:
      return ".bak"
  }
}

// ── Filename generator ───────────────────────────────────────────────────────

export function generateBackupFileName(dbName: string, dbType: DbType): string {
  const sanitized = (dbName || "unknown").replace(/[^a-zA-Z0-9]/g, "_")
  const timestamp = format(new Date(), "yyyyMMdd_HHmmss")
  const ext = getFileExtension(dbType)
  return `${sanitized}_${timestamp}${ext}`
}

// ── Backup directory ─────────────────────────────────────────────────────────

export async function getBackupDir(connectionId: string): Promise<string> {
  const baseDir = process.env.BACKUP_BASE_DIR ?? path.join(process.cwd(), "backups")
  const dir = path.join(baseDir, connectionId)
  await mkdir(dir, { recursive: true })
  return dir
}

// ── Stdout-dump detection ────────────────────────────────────────────────────

/**
 * Returns true for DB types that stream dump output to stdout.
 * Returns false for types that write directly to disk (sqlserver, oracle).
 */
export function isStdoutDump(dbType: DbType): boolean {
  switch (dbType) {
    case "mysql":
    case "mariadb":
    case "postgresql":
    case "sqlite":
      return true
    case "sqlserver":
    case "oracle":
      return false
    default:
      return false
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultPort(dbType: DbType): number {
  switch (dbType) {
    case "mysql":
    case "mariadb":
      return 3306
    case "postgresql":
      return 5432
    case "sqlserver":
      return 1433
    case "oracle":
      return 1521
    default:
      return 3306
  }
}
