import type { DbConnectionConfig } from "./index"

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
