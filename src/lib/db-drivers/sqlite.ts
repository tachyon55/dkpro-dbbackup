import type { DbConnectionConfig } from "./index"

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

export async function listSqliteDatabases(config: DbConnectionConfig): Promise<string[]> {
  // SQLite is a single-file database — no concept of multiple databases.
  // Return the file path as the single "database" entry.
  return [config.filePath || "main"]
}
