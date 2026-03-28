import type { DbConnectionConfig } from "./index"

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
