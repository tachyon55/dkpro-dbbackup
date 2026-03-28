import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import type { Adapter } from "next-auth/adapters"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"
import { createAuditLog } from "@/lib/audit"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 }, // D-20: 24h session
  providers: [
    Credentials({
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined

        if (!email || !password) return null

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.password) return null

        // D-05: blocked account check
        if (!user.isActive) return null

        // D-07: lockout check
        if (user.lockedUntil && user.lockedUntil > new Date()) return null

        const passwordMatch = await bcrypt.compare(password, user.password)

        if (!passwordMatch) {
          // Increment failedLoginAttempts; lock after 4 failed attempts (5th triggers lock)
          const newAttempts = user.failedLoginAttempts + 1
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newAttempts,
              lockedUntil: newAttempts >= 5
                ? new Date(Date.now() + 15 * 60 * 1000)
                : null,
            },
          })
          if (newAttempts >= 5) {
            await createAuditLog({
              userId: user.id,
              userEmail: user.email,
              event: "LOGIN",
              metadata: { method: "credentials", lockout: true, attempts: newAttempts },
            })
          }
          return null
        }

        // Reset on successful login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        })

        await createAuditLog({
          userId: user.id,
          userEmail: user.email,
          event: "LOGIN",
          metadata: { method: "credentials" },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        }
      },
    }),
  ],
})
