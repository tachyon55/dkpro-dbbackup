import { z } from "zod"

const baseFields = {
  name: z.string().min(1, "연결 이름을 입력해주세요").max(100),
  type: z.enum(["mysql", "mariadb", "postgresql", "sqlserver", "oracle", "sqlite"]),
  host: z.string().nullable().optional(),
  port: z.number().int().min(1).max(65535).nullable().optional(),
  username: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  database: z.string().nullable().optional(),
  filePath: z.string().nullable().optional(),
  sid: z.string().nullable().optional(),
  serviceName: z.string().nullable().optional(),
  toolPath: z.string().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "유효한 색상 코드를 선택해주세요")
    .optional(),
  backupStorageType: z.enum(["local", "cloud"]).default("local").optional(),
  backupLocalPath: z.string().nullable().optional(),
}

export const createConnectionSchema = z.object(baseFields).superRefine((data, ctx) => {
  if (data.type === "sqlite") {
    if (!data.filePath) {
      ctx.addIssue({
        code: "custom",
        message: "SQLite 파일 경로를 입력해주세요",
        path: ["filePath"],
      })
    }
  } else {
    if (!data.host) {
      ctx.addIssue({ code: "custom", message: "호스트를 입력해주세요", path: ["host"] })
    }
    if (!data.port) {
      ctx.addIssue({ code: "custom", message: "포트를 입력해주세요", path: ["port"] })
    }
  }
})

export const updateConnectionSchema = z.object({
  ...baseFields,
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["mysql", "mariadb", "postgresql", "sqlserver", "oracle", "sqlite"]).optional(),
})
