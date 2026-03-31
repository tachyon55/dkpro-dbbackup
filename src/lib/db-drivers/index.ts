export type DbType = "mysql" | "mariadb" | "postgresql" | "sqlserver" | "oracle" | "sqlite"

export interface DbConnectionConfig {
  type: DbType
  host?: string | null
  port?: number | null
  username?: string | null
  password?: string | null  // decrypted plaintext
  database?: string | null
  filePath?: string | null
  sid?: string | null
  serviceName?: string | null
}

export interface TestResult {
  success: boolean
  latencyMs?: number
  error?: string
}

export interface QueryResult {
  type: "select" | "dml" | "other"
  columns?: string[]
  rows?: Record<string, unknown>[]
  rowCount?: number
  durationMs: number
  capped?: boolean
}

export const ROW_CAP = 500

export function detectStatementType(sql: string): "select" | "dml" | "other" {
  const trimmed = sql.trim().toUpperCase()
  if (/^(SELECT|WITH)\s/i.test(trimmed)) return "select"
  if (/^(INSERT|UPDATE|DELETE|MERGE)\s/i.test(trimmed)) return "dml"
  return "other"
}

export function serializeRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const serialized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      serialized[key] = typeof value === "bigint" ? value.toString() : value
    }
    return serialized
  })
}

export async function executeQuery(config: DbConnectionConfig, sql: string): Promise<QueryResult> {
  let result: QueryResult
  switch (config.type) {
    case "mysql":
    case "mariadb":
      result = await (await import("./mysql")).executeMysql(config, sql)
      break
    case "postgresql":
      result = await (await import("./postgres")).executePostgres(config, sql)
      break
    case "sqlserver":
      result = await (await import("./mssql")).executeMssql(config, sql)
      break
    case "sqlite":
      result = await (await import("./sqlite")).executeSqlite(config, sql)
      break
    case "oracle":
      result = await (await import("./oracle")).executeOracle(config, sql)
      break
    default:
      throw new Error(`Unsupported database type: ${(config as DbConnectionConfig).type}`)
  }
  // Apply row cap
  if (result.rows && result.rows.length > ROW_CAP) {
    result.rows = result.rows.slice(0, ROW_CAP)
    result.capped = true
  }
  return result
}

export async function testConnection(config: DbConnectionConfig): Promise<TestResult> {
  const start = Date.now()
  try {
    switch (config.type) {
      case "mysql":
      case "mariadb":
        await (await import("./mysql")).testMysql(config)
        break
      case "postgresql":
        await (await import("./postgres")).testPostgres(config)
        break
      case "sqlserver":
        await (await import("./mssql")).testMssql(config)
        break
      case "sqlite":
        await (await import("./sqlite")).testSqlite(config)
        break
      case "oracle":
        await (await import("./oracle")).testOracle(config)
        break
      default:
        throw new Error(`Unsupported database type: ${(config as DbConnectionConfig).type}`)
    }
    return { success: true, latencyMs: Date.now() - start }
  } catch (err) {
    return { success: false, error: (err as Error).message, latencyMs: Date.now() - start }
  }
}

export async function listDatabases(config: DbConnectionConfig): Promise<string[]> {
  switch (config.type) {
    case "mysql":
    case "mariadb":
      return (await import("./mysql")).listMysqlDatabases(config)
    case "postgresql":
      return (await import("./postgres")).listPostgresDatabases(config)
    case "sqlserver":
      return (await import("./mssql")).listMssqlDatabases(config)
    case "sqlite":
      return (await import("./sqlite")).listSqliteDatabases(config)
    case "oracle":
      return (await import("./oracle")).listOracleDatabases(config)
    default:
      throw new Error(`Unsupported database type: ${(config as DbConnectionConfig).type}`)
  }
}
