import type { DbConnectionConfig, QueryResult } from "./index"
import { serializeRows } from "./index"

export async function testMysql(config: DbConnectionConfig): Promise<void> {
  const mysql2 = await import("mysql2/promise")
  const connection = await mysql2.createConnection({
    host: config.host ?? undefined,
    port: config.port ?? undefined,
    user: config.username ?? undefined,
    password: config.password ?? undefined,
    database: config.database ?? undefined,
    connectTimeout: 10000,
  })
  try {
    await connection.execute("SELECT 1")
  } finally {
    await connection.end()
  }
}

export async function executeMysql(config: DbConnectionConfig, sql: string): Promise<QueryResult> {
  const mysql2 = await import("mysql2/promise")
  const start = Date.now()
  const connection = await mysql2.createConnection({
    host: config.host ?? undefined,
    port: config.port ?? undefined,
    user: config.username ?? undefined,
    password: config.password ?? undefined,
    database: config.database ?? undefined,
    connectTimeout: 10000,
  })
  try {
    const [rows] = await connection.execute(sql)
    const durationMs = Date.now() - start
    if (Array.isArray(rows)) {
      // SELECT result
      const columns = rows.length > 0 ? Object.keys(rows[0] as object) : []
      return {
        type: "select",
        columns,
        rows: serializeRows(rows as Record<string, unknown>[]),
        durationMs,
      }
    } else {
      // DML result — ResultSetHeader
      const header = rows as { affectedRows: number }
      return {
        type: "dml",
        rowCount: header.affectedRows,
        durationMs,
      }
    }
  } finally {
    await connection.end()
  }
}

export async function listMysqlDatabases(config: DbConnectionConfig): Promise<string[]> {
  const mysql2 = await import("mysql2/promise")
  const connection = await mysql2.createConnection({
    host: config.host ?? undefined,
    port: config.port ?? undefined,
    user: config.username ?? undefined,
    password: config.password ?? undefined,
    connectTimeout: 10000,
  })
  try {
    const [rows] = await connection.execute("SHOW DATABASES")
    return (rows as Array<{ Database: string }>).map((r) => r.Database)
  } finally {
    await connection.end()
  }
}
