import type { DbConnectionConfig, QueryResult } from "./index"
import { serializeRows } from "./index"

export async function testMssql(config: DbConnectionConfig): Promise<void> {
  const mssql = await import("mssql")
  const pool = await mssql.connect({
    server: config.host ?? "",
    port: config.port ?? 1433,
    user: config.username ?? undefined,
    password: config.password ?? undefined,
    database: config.database ?? undefined,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    connectionTimeout: 10000,
  })
  try {
    await pool.request().query("SELECT 1")
  } finally {
    await pool.close()
  }
}

export async function executeMssql(config: DbConnectionConfig, sql: string): Promise<QueryResult> {
  const mssql = await import("mssql")
  const start = Date.now()
  const pool = await mssql.connect({
    server: config.host ?? "",
    port: config.port ?? 1433,
    user: config.username ?? undefined,
    password: config.password ?? undefined,
    database: config.database ?? undefined,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    connectionTimeout: 10000,
    requestTimeout: 30000,
  })
  try {
    const result = await pool.request().query(sql)
    const durationMs = Date.now() - start
    if (result.recordset !== undefined) {
      // SELECT result
      const columns = result.recordset.length > 0
        ? Object.keys(result.recordset[0] as object)
        : []
      return {
        type: "select",
        columns,
        rows: serializeRows(result.recordset as unknown as Record<string, unknown>[]),
        durationMs,
      }
    } else {
      // DML result — rowsAffected is an array
      return {
        type: "dml",
        rowCount: result.rowsAffected[0] ?? 0,
        durationMs,
      }
    }
  } finally {
    await pool.close()
  }
}

export async function listMssqlDatabases(config: DbConnectionConfig): Promise<string[]> {
  const mssql = await import("mssql")
  const pool = await mssql.connect({
    server: config.host ?? "",
    port: config.port ?? 1433,
    user: config.username ?? undefined,
    password: config.password ?? undefined,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    connectionTimeout: 10000,
  })
  try {
    const result = await pool.request().query("SELECT name FROM sys.databases ORDER BY name")
    return result.recordset.map((r: { name: string }) => r.name)
  } finally {
    await pool.close()
  }
}
