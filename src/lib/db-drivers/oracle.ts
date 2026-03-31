import type { DbConnectionConfig, QueryResult } from "./index"
import { serializeRows } from "./index"

export async function testOracle(config: DbConnectionConfig): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let oracledb: any
  try {
    oracledb = await import("oracledb")
  } catch {
    throw new Error("Oracle Instant Client가 설치되어 있지 않습니다")
  }

  const connectString = `${config.host}:${config.port}/${config.serviceName || config.sid}`
  const connection = await oracledb.getConnection({
    user: config.username ?? undefined,
    password: config.password ?? undefined,
    connectString,
  })
  try {
    await connection.execute("SELECT 1 FROM DUAL")
  } finally {
    await connection.close()
  }
}

export async function executeOracle(config: DbConnectionConfig, sql: string): Promise<QueryResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let oracledb: any
  try {
    oracledb = await import("oracledb")
  } catch {
    throw new Error("Oracle Instant Client가 설치되어 있지 않습니다")
  }

  const connectString = `${config.host}:${config.port}/${config.serviceName || config.sid}`
  const start = Date.now()
  const connection = await oracledb.getConnection({
    user: config.username ?? undefined,
    password: config.password ?? undefined,
    connectString,
  })
  try {
    const outFormat = oracledb.OUT_FORMAT_OBJECT
    // Wrap in Promise.race with 30s timeout (Oracle callTimeout not reliable in all versions)
    const result = await Promise.race([
      connection.execute(sql, [], { outFormat }) as Promise<{
        metaData?: Array<{ name: string }>
        rows?: Record<string, unknown>[]
        rowsAffected?: number
      }>,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Oracle 쿼리 타임아웃 (30초)")), 30000)
      ),
    ])
    const durationMs = Date.now() - start
    if (result.metaData && result.metaData.length > 0) {
      // SELECT result
      const columns = result.metaData.map((m: { name: string }) => m.name)
      return {
        type: "select",
        columns,
        rows: serializeRows((result.rows ?? []) as Record<string, unknown>[]),
        durationMs,
      }
    } else {
      // DML result
      return {
        type: "dml",
        rowCount: result.rowsAffected ?? 0,
        durationMs,
      }
    }
  } finally {
    await connection.close()
  }
}

export async function listOracleDatabases(config: DbConnectionConfig): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let oracledb: any
  try {
    oracledb = await import("oracledb")
  } catch {
    throw new Error("Oracle Instant Client가 설치되어 있지 않습니다")
  }

  // Oracle has no "SHOW DATABASES" — list schemas (users) instead
  const connectString = `${config.host}:${config.port}/${config.serviceName || config.sid}`
  const connection = await oracledb.getConnection({
    user: config.username ?? undefined,
    password: config.password ?? undefined,
    connectString,
  })
  try {
    const result = await connection.execute(
      "SELECT username FROM all_users ORDER BY username"
    )
    return (result.rows ?? []).map((r: [string]) => r[0])
  } finally {
    await connection.close()
  }
}
