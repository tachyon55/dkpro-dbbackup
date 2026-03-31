import type { DbConnectionConfig, QueryResult } from "./index"
import { detectStatementType, serializeRows } from "./index"

export async function testSqlite(config: DbConnectionConfig): Promise<void> {
  if (!config.filePath) throw new Error("SQLite 파일 경로를 입력해주세요")
  const { default: Database } = await import("better-sqlite3")
  const db = new Database(config.filePath, { readonly: true, fileMustExist: true })
  try {
    db.prepare("SELECT 1").get()
  } finally {
    db.close()
  }
}

export async function executeSqlite(config: DbConnectionConfig, sql: string): Promise<QueryResult> {
  if (!config.filePath) throw new Error("SQLite 파일 경로를 입력해주세요")
  const { default: Database } = await import("better-sqlite3")
  const start = Date.now()
  const stmtType = detectStatementType(sql)
  const readonly = stmtType === "select"
  const db = new Database(config.filePath, { readonly, fileMustExist: true })
  try {
    if (stmtType === "select") {
      const rows = db.prepare(sql).all() as Record<string, unknown>[]
      const durationMs = Date.now() - start
      const columns = rows.length > 0 ? Object.keys(rows[0]) : []
      return {
        type: "select",
        columns,
        rows: serializeRows(rows),
        durationMs,
      }
    } else {
      const info = db.prepare(sql).run()
      const durationMs = Date.now() - start
      return {
        type: stmtType,
        rowCount: info.changes,
        durationMs,
      }
    }
  } finally {
    db.close()
  }
}

export async function listSqliteDatabases(config: DbConnectionConfig): Promise<string[]> {
  // SQLite is a single-file database — no concept of multiple databases.
  // Return the file path as the single "database" entry.
  return [config.filePath || "main"]
}
