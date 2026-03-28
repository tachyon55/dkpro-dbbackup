import { z } from "zod"

export const createUserSchema = z.object({
  email: z.string().email("유효한 이메일을 입력해주세요"),
  name: z.string().min(1, "이름을 입력해주세요").max(50),
  password: z
    .string()
    .min(8, "비밀번호는 최소 8자입니다")
    .regex(/(?=.*[a-zA-Z])(?=.*\d)/, "영문과 숫자를 포함해야 합니다"),
  role: z.enum(["admin", "operator", "viewer"]),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  role: z.enum(["admin", "operator", "viewer"]).optional(),
  isActive: z.boolean().optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
