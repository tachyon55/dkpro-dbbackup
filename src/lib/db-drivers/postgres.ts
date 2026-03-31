import type { DbConnectionConfig, QueryResult } from "./index"
import { serializeRows } from "./index"

export async function testPostgres(config: DbConnectionConfig): Promise<void> {
  const { Client } = await import("pg")
  const client = new Client({
    host: config.host ?? undefined,
    port: config.port ?? undefined,
    user: config.username ?? undefined,
    password: config.password ?? undefined,
    database: config.database ?? undefined,
    connectionTimeoutMillis: 10000,
  })
  await client.connect()
  try {
    await client.query("SELECT 1")
  } finally {
    await client.end()
  }
}

export async function executePostgres(config: DbConnectionConfig, sql: string): Promise<QueryResult> {
  const { Client } = await import("pg")
  const start = Date.now()
  const client = new Client({
    host: config.host ?? undefined,
    port: config.port ?? undefined,
    user: config.username ?? undefined,
    password: config.password ?? undefined,
    database: config.database ?? undefined,
    connectionTimeoutMillis: 10000,
    query_timeout: 30000,
  })
  await client.connect()
  try {
    const result = await client.query({ text: sql })
    const durationMs = Date.now() - start
    if (result.fields && result.fields.length > 0) {
      // SELECT result
      const columns = result.fields.map((f: { name: string }) => f.name)
      return {
        type: "select",
        columns,
        rows: serializeRows(result.rows as Record<string, unknown>[]),
        durationMs,
      }
    } else {
      // DML result
      return {
        type: "dml",
        rowCount: result.rowCount ?? 0,
        durationMs,
      }
    }
  } finally {
    await client.end()
  }
}

export async function listPostgresDatabases(config: DbConnectionConfig): Promise<string[]> {
  const { Client } = await import("pg")
  const client = new Client({
    host: config.host ?? undefined,
    port: config.port ?? undefined,
    user: config.username ?? undefined,
    password: config.password ?? undefined,
    database: config.database ?? "postgres",
    connectionTimeoutMillis: 10000,
  })
  await client.connect()
  try {
    const result = await client.query(
      "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname"
    )
    return result.rows.map((r: { datname: string }) => r.datname)
  } finally {
    await client.end()
  }
}
