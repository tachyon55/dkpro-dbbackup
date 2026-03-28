import type { DbConnectionConfig } from "./index"

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
