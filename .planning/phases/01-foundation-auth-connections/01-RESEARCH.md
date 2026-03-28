# Phase 1: Foundation + Auth + Connections - Research

**Researched:** 2026-03-28
**Domain:** Next.js 15 App Router, NextAuth.js v5 (Credentials + RBAC), Prisma 5 + PostgreSQL, AES-256-GCM encryption, multi-DB connection drivers
**Confidence:** HIGH (core stack), MEDIUM (NextAuth v5 beta edge cases)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**초기 사용자 설정**
- D-01: 첫 admin 계정은 환경변수 시드로 생성 (ADMIN_EMAIL, ADMIN_PASSWORD → 서버 시작 시 자동 upsert)
- D-02: admin이 사용자 생성 시 임시 비밀번호를 발급하고, 사용자는 첫 로그인 시 비밀번호 변경 강제
- D-03: 사용자 관리 화면에 기본 정보 표시: 이메일, 이름, 역할, 상태(활성/비활성), 마지막 로그인 시간
- D-04: 비밀번호 정책: 최소 8자, 영문+숫자 필수
- D-05: 계정 비활성화 시 로그인 차단 (기존 세션은 만료 시 종료)
- D-06: 마지막 admin 계정은 삭제/비활성화 불가 (admin이 0명이 되는 상황 방지)
- D-07: 로그인 5회 연속 실패 시 15분 계정 잠금 (brute force 방지)
- D-08: 비밀번호 분실 시 admin이 임시 비밀번호로 재설정 (이메일 복구는 Phase 3 이후)

**연결 관리 UI**
- D-09: DB 연결 목록은 카드형 그리드 레이아웃 (이름, DB 타입, 호스트, 포트, 상태 표시)
- D-10: 연결 생성/수정은 모달 다이얼로그 방식
- D-11: DB 타입 선택 시 폼 필드가 동적으로 변경
- D-12: 연결 테스트 결과는 모달 내 인라인 표시 (성공/실패 + 응답시간)
- D-13: 연결별 색상은 프리셋 팔레트(8~12개)에서 선택
- D-14: CONN-07 DB 목록 조회는 연결 상세 영역(카드 클릭 시)에 탭으로 표시
- D-15: 연결 삭제 시 확인 다이얼로그 표시

**감사 로그**
- D-16: 감사 로그 대상: 로그인/로그아웃, 사용자 CRUD, 역할 변경, 연결 생성/수정/삭제/테스트
- D-17: admin 전용 감사 로그 조회 페이지 (사용자, 이벤트 타입, 날짜 범위 필터)
- D-18: 감사 로그 90일 보관 후 자동 삭제

**인증 세션**
- D-19: NextAuth.js v5 JWT 세션 방식
- D-20: JWT 토큰 만료 24시간, 활동 시 자동 갱신
- D-21: 동시 로그인 허용
- D-22: 로그인 후 기본 랜딩 페이지는 연결 목록

**앱 레이아웃**
- D-23: 사이드바 네비게이션 구조
- D-24: Phase 1 사이드바 메뉴: 연결 관리, 사용자 관리(admin), 감사 로그(admin)
- D-25: 라이트 모드만 지원

### Claude's Discretion
- 사용자 관리 화면의 정확한 레이아웃과 UX 디테일
- 비밀번호 변경 강제 플로우의 UX 디테일
- 에러 메시지 문구와 토스트/알림 스타일
- 사이드바 접기/펼치기 동작

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | 사용자가 이메일/비밀번호로 로그인할 수 있다 | NextAuth v5 Credentials provider + bcryptjs |
| AUTH-02 | 사용자가 로그아웃할 수 있다 | NextAuth v5 signOut() server action |
| AUTH-03 | 세션이 브라우저 새로고침 후에도 유지된다 | NextAuth v5 JWT strategy (24h expiry, auto-renew) |
| AUTH-04 | admin이 사용자를 생성/수정/삭제할 수 있다 | Prisma User model CRUD via API routes |
| AUTH-05 | 사용자에게 admin/operator/viewer 역할을 부여할 수 있다 | Prisma Role enum + NextAuth session callback |
| AUTH-06 | viewer는 조회만, operator는 백업/쿼리, admin은 모든 권한 | middleware.ts RBAC + Server Action auth checks |
| AUTH-07 | 모든 주요 작업이 감사 로그에 기록된다 | Prisma AuditLog model + helper function |
| CONN-01 | DB 연결을 생성할 수 있다 | Prisma Connection model + Zod validation |
| CONN-02 | DB 연결을 수정할 수 있다 | PUT /api/connections/[id] route |
| CONN-03 | DB 연결을 삭제할 수 있다 | DELETE /api/connections/[id] route |
| CONN-04 | 연결 테스트를 실행할 수 있다 | Per-driver test function (mysql2/pg/mssql/etc.) |
| CONN-05 | 6가지 DB 타입을 지원한다 | mysql2, pg, mssql, oracledb, better-sqlite3 |
| CONN-06 | DB 비밀번호가 AES-256-GCM으로 암호화되어 저장된다 | Node.js crypto built-in module |
| CONN-07 | 연결 후 사용 가능한 DB 목록을 조회할 수 있다 | Driver-specific SHOW DATABASES / pg_database queries |
| CONN-08 | 연결별 시각적 구분 색상을 지정할 수 있다 | Prisma Connection.color field + preset palette |
</phase_requirements>

---

## Summary

Phase 1 is a greenfield Next.js 15 App Router project requiring: (1) project scaffolding with the full locked stack, (2) NextAuth.js v5 beta Credentials authentication with JWT strategy and RBAC (3 roles: admin/operator/viewer), (3) AES-256-GCM credential encryption using Node.js built-in `crypto`, and (4) multi-DB connection management supporting 6 database types with per-type test functions.

The tech stack is fully locked (Next.js 15, TypeScript, Tailwind v4, shadcn/ui, PostgreSQL, Prisma 5, NextAuth.js v5 beta). No alternatives need to be considered. The primary implementation challenges are: (a) NextAuth v5 is still in beta — the API is stable but setup differs from v4; (b) NextAuth v5 + Prisma adapter works but requires careful split between `auth.config.ts` (edge-safe) and `auth.ts` (Node.js full); (c) brute-force lockout (D-07) must be implemented in the database layer, not middleware, due to a critical 2025 CVE (CVE-2025-29927) that showed middleware can be bypassed.

**Primary recommendation:** Scaffold with `create-next-app@15`, split NextAuth config into `auth.config.ts` + `auth.ts`, store brute-force counters in the User model (failedLoginAttempts, lockedUntil), implement AES-256-GCM as a `lib/crypto.ts` utility, and build per-driver connection test functions in `lib/db-drivers/`.

---

## Standard Stack

### Core (Verified via npm registry 2026-03-28)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.5.14 | Framework (App Router) | Locked decision; latest stable 15.x |
| typescript | 5.x | Type safety | Locked; Prisma requires TS |
| react | 19.x | UI (bundled with Next 15) | Bundled |
| tailwindcss | 4.2.2 | Styling | Locked decision |
| @tailwindcss/postcss | 4.x | PostCSS plugin for Tailwind v4 | Required for Tailwind v4 |
| shadcn/ui | latest CLI | UI components | Locked; copy-paste model |
| prisma | 5.22.0 | ORM + migrations | Locked; latest stable 5.x |
| @prisma/client | 5.22.0 | Generated query client | Bundled with prisma |
| next-auth | 5.0.0-beta.30 | Authentication | Locked; v5 beta |
| @auth/prisma-adapter | 2.11.1 | NextAuth + Prisma integration | Standard adapter |
| bcryptjs | 3.0.3 | Password hashing | Locked; pure JS, no native dep |
| zod | 3.24.4 | Schema validation | Locked |
| react-hook-form | 7.x | Form state management | Locked |
| @hookform/resolvers | latest | Zod resolver for RHF | Standard companion |
| date-fns | 4.x | Date formatting | Locked |

### Multi-DB Drivers (Target Database Connections)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| mysql2 | 3.20.0 | MySQL + MariaDB connections | Promise interface |
| pg | 8.20.0 | PostgreSQL connections | Most mature PG driver |
| mssql | 12.2.1 | SQL Server connections | tedious-based |
| better-sqlite3 | 12.8.0 | SQLite connections | Synchronous API |
| oracledb | 6.10.0 | Oracle connections | Requires Oracle Instant Client ⚠️ |

### Installation

```bash
# 1. Scaffold project
npx create-next-app@15 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# 2. shadcn/ui (Tailwind v4)
npx shadcn@latest init

# 3. Database + ORM
npm install prisma @prisma/client
npx prisma init

# 4. Auth
npm install next-auth@beta @auth/prisma-adapter bcryptjs
npm install --save-dev @types/bcryptjs

# 5. Validation + Forms
npm install zod react-hook-form @hookform/resolvers

# 6. Multi-DB drivers
npm install mysql2 pg mssql better-sqlite3
npm install --save-dev @types/pg @types/better-sqlite3

# 7. Oracle (optional - requires Oracle Instant Client on server)
npm install oracledb

# 8. Utilities
npm install date-fns
```

**Version note:** Next.js latest is 16.2.1, but the project locks to 15.x. Use `next@15` (resolves to 15.5.14 at time of research). The `npm install next@15` command will pin to latest 15.x patch.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/                  # Route group — no sidebar layout
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── change-password/     # Forced password change flow
│   │       └── page.tsx
│   ├── (app)/                   # Route group — sidebar layout
│   │   ├── layout.tsx           # Sidebar + top nav shell
│   │   ├── connections/
│   │   │   └── page.tsx         # CONN-01..08 grid
│   │   ├── users/
│   │   │   └── page.tsx         # AUTH-04,05 — admin only
│   │   └── audit-logs/
│   │       └── page.tsx         # AUTH-07 — admin only
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts     # NextAuth handler
│   │   ├── connections/
│   │   │   ├── route.ts         # GET list, POST create
│   │   │   ├── [id]/
│   │   │   │   └── route.ts     # PUT update, DELETE
│   │   │   └── [id]/test/
│   │   │       └── route.ts     # POST connection test
│   │   ├── connections/[id]/databases/
│   │   │   └── route.ts         # CONN-07 list databases
│   │   ├── users/
│   │   │   ├── route.ts         # GET list, POST create
│   │   │   └── [id]/
│   │   │       └── route.ts     # PUT update, DELETE
│   │   └── audit-logs/
│   │       └── route.ts         # GET with filters
│   └── layout.tsx               # Root layout
├── auth.ts                       # NextAuth full config (Node.js only)
├── auth.config.ts                # NextAuth edge-safe config (for middleware)
├── middleware.ts                  # Route protection + RBAC
├── components/
│   ├── ui/                       # shadcn/ui components (auto-generated)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── TopNav.tsx
│   ├── connections/
│   │   ├── ConnectionCard.tsx
│   │   ├── ConnectionModal.tsx
│   │   └── ColorPicker.tsx
│   └── users/
│       └── UserTable.tsx
├── lib/
│   ├── prisma.ts                 # Prisma client singleton
│   ├── crypto.ts                 # AES-256-GCM encrypt/decrypt
│   ├── audit.ts                  # Audit log helper
│   ├── auth-utils.ts             # Password policy, lockout helpers
│   └── db-drivers/
│       ├── index.ts              # Driver registry + testConnection()
│       ├── mysql.ts
│       ├── postgres.ts
│       ├── mssql.ts
│       ├── sqlite.ts
│       └── oracle.ts
├── types/
│   └── next-auth.d.ts            # Session type extensions
└── prisma/
    └── schema.prisma
```

### Pattern 1: NextAuth v5 Split Config (Edge-Safe)

**What:** NextAuth v5 requires splitting config into two files. `auth.config.ts` contains only edge-compatible config (no Prisma adapter, no bcrypt). `auth.ts` imports `auth.config.ts` and adds the Prisma adapter and full callbacks. This is necessary because `middleware.ts` runs on the Edge runtime where Node.js modules like `bcryptjs` are not available.

**When to use:** Always — this is the required v5 pattern for Credentials provider with Prisma.

```typescript
// auth.config.ts — Edge-safe (no Node.js modules)
import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnAuth = nextUrl.pathname.startsWith("/login")
      if (isOnAuth) return isLoggedIn ? Response.redirect(new URL("/connections", nextUrl)) : true
      return isLoggedIn
    },
    jwt({ token, user }) {
      // Persist role and id from user object on first sign-in
      if (user) {
        token.role = user.role
        token.id = user.id
        token.mustChangePassword = user.mustChangePassword
      }
      return token
    },
    session({ session, token }) {
      session.user.role = token.role as string
      session.user.id = token.id as string
      session.user.mustChangePassword = token.mustChangePassword as boolean
      return session
    },
  },
  providers: [], // populated in auth.ts
}
```

```typescript
// auth.ts — Full Node.js config
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user || !user.password) return null
        if (!user.isActive) return null  // D-05 — blocked account
        // D-07 — lockout check
        if (user.lockedUntil && user.lockedUntil > new Date()) return null
        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!passwordMatch) {
          // Increment failedLoginAttempts
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: { increment: 1 },
              lockedUntil: user.failedLoginAttempts >= 4
                ? new Date(Date.now() + 15 * 60 * 1000) : null
            }
          })
          return null
        }
        // Reset on success
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }
        })
        return user
      }
    })
  ],
})
```

### Pattern 2: RBAC Middleware

**What:** Next.js `middleware.ts` reads the JWT session to enforce role-based route protection. **Security note:** Middleware is NOT a security boundary — it can be bypassed via edge routing bugs (CVE-2025-29927, fixed in Next.js 15.2.3+). Route Handlers and Server Actions MUST also verify roles independently.

```typescript
// middleware.ts
import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
```

```typescript
// In API routes/Server Actions — always re-check role
import { auth } from "@/auth"

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== "admin") {
    return Response.json({ error: "권한이 없습니다" }, { status: 403 })
  }
  // ...
}
```

### Pattern 3: AES-256-GCM Encryption Utility

**What:** Encrypt DB passwords before storing in PostgreSQL. Uses Node.js built-in `crypto` — no external library needed. Storage format: `iv:authTag:ciphertext` (all hex-encoded).

```typescript
// lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex") // 32 bytes = 64 hex chars

export function encrypt(plaintext: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":")
}

export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":")
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, "hex"))
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final()
  ])
  return decrypted.toString("utf8")
}
```

### Pattern 4: DB Driver Registry + testConnection()

**What:** A unified driver registry maps DB type to a test function. Each driver creates a transient connection, runs a simple query, measures latency, and tears down. The Oracle driver is wrapped in try-catch with a clear error if Instant Client is missing.

```typescript
// lib/db-drivers/index.ts
export type DbType = "mysql" | "mariadb" | "postgresql" | "sqlserver" | "oracle" | "sqlite"

export interface TestResult {
  success: boolean
  latencyMs?: number
  error?: string
}

export async function testConnection(config: DbConnectionConfig): Promise<TestResult> {
  const start = Date.now()
  try {
    switch (config.type) {
      case "mysql":
      case "mariadb":
        await testMysql(config)
        break
      case "postgresql":
        await testPostgres(config)
        break
      case "sqlserver":
        await testMssql(config)
        break
      case "sqlite":
        await testSqlite(config)
        break
      case "oracle":
        await testOracle(config)
        break
    }
    return { success: true, latencyMs: Date.now() - start }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}
```

### Pattern 5: Prisma Client Singleton

**What:** Prevents connection pool exhaustion in Next.js dev mode (hot reload creates multiple Prisma instances without this).

```typescript
// lib/prisma.ts
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

### Pattern 6: TypeScript Session Type Extension

**What:** Extend NextAuth types to include `role`, `id`, and `mustChangePassword` on the session.

```typescript
// types/next-auth.d.ts
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "admin" | "operator" | "viewer"
      mustChangePassword: boolean
    } & DefaultSession["user"]
  }
  interface User {
    role: "admin" | "operator" | "viewer"
    mustChangePassword: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "admin" | "operator" | "viewer"
    mustChangePassword: boolean
  }
}
```

### Anti-Patterns to Avoid

- **Using `auth.ts` in middleware.ts directly:** `auth.ts` imports Prisma/bcrypt which are Node.js modules — not edge-compatible. Always import from `auth.config.ts` in middleware.
- **Relying on middleware as the only auth check:** CVE-2025-29927 showed middleware can be bypassed. Always re-verify session/role in route handlers and server actions.
- **Using `crypto.createCipher()` (no IV):** Deprecated and insecure. Always use `createCipheriv()` with random IV per encryption operation.
- **Storing ENCRYPTION_KEY in DB or code:** Key must live in environment variable only. If key is compromised, all stored passwords are compromised.
- **Using `exec()` for DB processes:** Relevant from Phase 2 onward — use `spawn()` with args array (locked decision). Note for Phase 1: connection tests use driver APIs directly, not CLI tools.
- **Creating a new Prisma client per request:** Use the singleton pattern to avoid connection pool exhaustion.
- **Keeping oracledb as a hard dependency:** If Oracle Instant Client is not installed, `require('oracledb')` will throw at import time. Lazy-load the oracle driver or wrap in try-catch.

---

## Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  admin
  operator
  viewer
}

enum DbType {
  mysql
  mariadb
  postgresql
  sqlserver
  oracle
  sqlite
}

enum AuditEventType {
  LOGIN
  LOGOUT
  USER_CREATE
  USER_UPDATE
  USER_DELETE
  ROLE_CHANGE
  CONN_CREATE
  CONN_UPDATE
  CONN_DELETE
  CONN_TEST
}

model User {
  id                   String    @id @default(cuid())
  email                String    @unique
  name                 String
  password             String?   // bcrypt hash; null for future OAuth
  role                 Role      @default(viewer)
  isActive             Boolean   @default(true)
  mustChangePassword   Boolean   @default(false)
  failedLoginAttempts  Int       @default(0)
  lockedUntil          DateTime?
  lastLoginAt          DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  auditLogs            AuditLog[]

  // NextAuth required fields (for PrismaAdapter + future OAuth)
  accounts             Account[]
  sessions             Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model DbConnection {
  id           String   @id @default(cuid())
  name         String
  type         DbType
  host         String?  // null for SQLite (file path only)
  port         Int?
  username     String?
  password     String?  // AES-256-GCM encrypted ciphertext
  database     String?
  filePath     String?  // SQLite only
  sid          String?  // Oracle SID
  serviceName  String?  // Oracle Service Name
  color        String   @default("#6366f1")  // hex color from preset palette
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model AuditLog {
  id        String         @id @default(cuid())
  userId    String?        // null for unauthenticated events (e.g., failed login)
  userEmail String?        // denormalized — preserve email even if user deleted
  event     AuditEventType
  targetId  String?        // e.g., userId or connectionId affected
  metadata  Json?          // additional details (before/after values, IP, etc.)
  createdAt DateTime       @default(now())

  user      User?          @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([createdAt])    // for 90-day cleanup and date-range queries
  @@index([event])
  @@index([userId])
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication flow | Custom JWT middleware | NextAuth.js v5 | CSRF, token rotation, session management edge cases |
| Password hashing | Custom hash function | bcryptjs | Timing attack resistance, salt rounds, algorithm evolution |
| Form validation | Manual field checks | Zod + React Hook Form | Type inference, nested schemas, async validation |
| UI components | Custom dialog/modal | shadcn/ui Dialog | Accessibility (WAI-ARIA), focus trap, keyboard nav |
| DB credential encryption | AES-CBC or custom scheme | AES-256-GCM (built-in crypto) | GCM provides authentication (integrity) — CBC does not |
| Oracle lazy-load | Global require | Dynamic import + try-catch | Prevents startup crash when Instant Client not installed |

**Key insight:** The most dangerous hand-roll temptation is implementing brute-force lockout purely in middleware — this must live in the database (User.failedLoginAttempts) because middleware can be bypassed.

---

## Common Pitfalls

### Pitfall 1: NextAuth v5 Split Config Not Applied
**What goes wrong:** Importing `auth.ts` (which uses Prisma/bcrypt) in `middleware.ts` causes a build error: "Module not found: Can't resolve 'bcryptjs'" or Prisma client edge runtime errors.
**Why it happens:** `middleware.ts` runs on the Edge Runtime (V8 sandbox). Prisma's Node.js engine and bcryptjs native bindings are incompatible.
**How to avoid:** Always import from `auth.config.ts` in `middleware.ts`. Keep `auth.ts` imports in route handlers and server components only.
**Warning signs:** Build error mentioning "edge-incompatible" or "Dynamic Code Evaluation" in middleware.

### Pitfall 2: NextAuth v5 Credentials + PrismaAdapter Conflict
**What goes wrong:** Using `PrismaAdapter` with Credentials provider and `strategy: "database"` causes errors because PrismaAdapter expects OAuth-style user upsert, not local credential lookup.
**Why it happens:** Database sessions require a Session model record per login — PrismaAdapter creates Sessions but Credentials provider doesn't trigger the OAuth user creation flow correctly.
**How to avoid:** Use `strategy: "jwt"` with Credentials provider. The PrismaAdapter is still used for future OAuth provider compatibility and the Account/Session models it requires.
**Warning signs:** "User not found" errors on login even though the user exists.

### Pitfall 3: AES-256-GCM Key Length Mismatch
**What goes wrong:** `Error: Invalid key length` at runtime.
**Why it happens:** AES-256 requires exactly 32 bytes. If `ENCRYPTION_KEY` is not exactly 64 hex characters (= 32 bytes), `Buffer.from(key, "hex")` produces wrong-length buffer.
**How to avoid:** Generate key with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Validate key length in `lib/crypto.ts` at module load time.
**Warning signs:** Error only appears at decrypt time; encrypt may succeed with wrong length on some Node versions.

### Pitfall 4: Brute-Force Counter Race Condition
**What goes wrong:** Under concurrent requests, two parallel failed logins both read `failedLoginAttempts: 4`, both increment to 5, but only one sets `lockedUntil`. The counter effectively resets.
**Why it happens:** Read-modify-write on the counter in application code is not atomic.
**How to avoid:** Use Prisma `{ increment: 1 }` atomic update (shown in Pattern 1). This translates to `UPDATE ... SET failedLoginAttempts = failedLoginAttempts + 1` which is atomic in PostgreSQL.
**Warning signs:** Lock not triggering despite repeated failures.

### Pitfall 5: oracledb Crashes Server on Import
**What goes wrong:** Server fails to start with "DPI-1047: Cannot locate a 64-bit Oracle Client library" if oracledb is imported at module level without Oracle Instant Client installed.
**Why it happens:** `oracledb` attempts to load native libraries at require-time.
**How to avoid:** Lazy-load the oracle driver inside the `testOracle()` function using dynamic `import()`. Catch the error and return a clear message: "Oracle Instant Client이 설치되지 않았습니다".
**Warning signs:** Entire server crashes at startup, not just Oracle connection attempts.

### Pitfall 6: shadcn/ui + Tailwind v4 Version Mismatch
**What goes wrong:** Running `npx shadcn@latest add` on a Tailwind v3 project installs v4-incompatible component styles.
**Why it happens:** shadcn/ui CLI detects Tailwind version from installed packages. If both v3 and v4 are present (common in Next.js 15 scaffold), detection can fail.
**How to avoid:** After `create-next-app`, verify only `tailwindcss@4.x` is installed. Use `npx shadcn@latest init` (not `@2.3.0`) for Tailwind v4. Add components with `--legacy-peer-deps` flag for React 19 compatibility.
**Warning signs:** CSS variables not working, components rendering without styles.

### Pitfall 7: Admin-Last Protection Race Condition
**What goes wrong:** Two concurrent requests both delete the last admin simultaneously.
**Why it happens:** Both read `adminCount = 1`, both pass the check, both delete.
**How to avoid:** Check admin count inside a database transaction or use PostgreSQL constraint. Minimum approach: query `WHERE role = 'admin' AND id != targetId` — if count = 0, block the operation.
**Warning signs:** No admins in database, application locked out.

### Pitfall 8: Next.js Middleware CVE-2025-29927
**What goes wrong:** Attackers bypass middleware auth by sending `x-middleware-subrequest` header, accessing admin routes without authentication.
**Why it happens:** Middleware design flaw in Next.js versions before 15.2.3.
**How to avoid:** Pin to `next@15.2.3` or later (15.5.14 is latest stable 15.x). Additionally, always re-verify session in route handlers — never rely on middleware alone.
**Warning signs:** Auth middleware not running; unauthorized access to protected routes.

---

## Code Examples

### DB List Queries by Type (CONN-07)

```typescript
// lib/db-drivers/mysql.ts
export async function listDatabases(config: DbConnectionConfig): Promise<string[]> {
  const conn = await mysql2.createConnection({
    host: config.host, port: config.port,
    user: config.username, password: config.password,
  })
  const [rows] = await conn.execute<mysql2.RowDataPacket[]>("SHOW DATABASES")
  await conn.end()
  return rows.map(r => r.Database)
}

// lib/db-drivers/postgres.ts
export async function listDatabases(config: DbConnectionConfig): Promise<string[]> {
  const client = new pg.Client({ host: config.host, port: config.port,
    user: config.username, password: config.password, database: "postgres" })
  await client.connect()
  const res = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false")
  await client.end()
  return res.rows.map(r => r.datname)
}

// lib/db-drivers/mssql.ts
export async function listDatabases(config: DbConnectionConfig): Promise<string[]> {
  await mssql.connect({ server: config.host!, port: config.port,
    user: config.username, password: config.password,
    options: { trustServerCertificate: true } })
  const result = await mssql.query`SELECT name FROM sys.databases`
  await mssql.close()
  return result.recordset.map((r: any) => r.name)
}
```

### Audit Log Helper

```typescript
// lib/audit.ts
import { prisma } from "@/lib/prisma"
import type { AuditEventType } from "@prisma/client"

export async function logAudit({
  userId, userEmail, event, targetId, metadata
}: {
  userId?: string
  userEmail?: string
  event: AuditEventType
  targetId?: string
  metadata?: Record<string, unknown>
}) {
  await prisma.auditLog.create({
    data: { userId, userEmail, event, targetId,
      metadata: metadata ? JSON.stringify(metadata) : undefined }
  })
}

// Usage in an API route:
// await logAudit({ userId: session.user.id, userEmail: session.user.email,
//   event: "CONN_CREATE", targetId: newConn.id, metadata: { name: newConn.name } })
```

### Admin Seed (D-01)

```typescript
// lib/seed-admin.ts — called once on server startup
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) return

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return

  const hash = await bcrypt.hash(password, 12)
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Administrator", password: hash, role: "admin", isActive: true }
  })
  console.log(`[seed] Admin user created: ${email}`)
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth.js v4 (separate callbacks for each provider) | Auth.js v5 single `auth()` function works everywhere | 2024 | Cleaner RBAC; middleware uses same `auth()` |
| `NEXTAUTH_SECRET` env var | `AUTH_SECRET` env var | v5 migration | Must update `.env.example` |
| Tailwind v3 `tailwind.config.js` | Tailwind v4 CSS-first config (`@import "tailwindcss"` in CSS) | 2025 | No `tailwind.config.js` needed for basic setup |
| `pages/api/auth/[...nextauth].ts` | `app/api/auth/[...nextauth]/route.ts` | Next.js 13+ | App Router convention |
| Session strategy "database" with Credentials | JWT strategy required for Credentials provider | v4→v5 | No server-side session store for auth |

**Deprecated/outdated:**
- `NEXTAUTH_URL` env var: Still works but `AUTH_URL` is preferred in v5. Set both during transition.
- `getServerSession()` from next-auth: Replaced by `auth()` in v5. Remove all `getServerSession` usage.
- `next/server` `NextResponse.next()` for auth redirect in middleware: Use `auth` export from `auth.config.ts` directly.

---

## Open Questions

1. **Oracle Instant Client availability on deployment server**
   - What we know: `oracledb` requires Oracle Instant Client C libraries installed on the OS
   - What's unclear: Whether the target deployment server has or can install Instant Client
   - Recommendation: Implement Oracle driver with graceful degradation — if Instant Client is missing, show a clear setup instruction in the UI rather than crashing. Document as a server prerequisite.

2. **NextAuth v5 exact stable release timeline**
   - What we know: v5 is on `5.0.0-beta.30` as of research date; API is stable for production use
   - What's unclear: Whether any beta.x → beta.y breaking changes exist between now and a potential stable release during this project
   - Recommendation: Pin to `next-auth@5.0.0-beta.30` exactly in `package.json` (not `^5.0.0-beta.30`) to prevent automatic beta upgrades.

3. **PostgreSQL connection for app database (local vs. cloud)**
   - What we know: Project uses PostgreSQL as the app database (Prisma)
   - What's unclear: Whether a local PostgreSQL instance is available during development
   - Recommendation: Document `DATABASE_URL` in `.env.example`. The planner should include a Wave 0 task to verify PostgreSQL availability and create the development database.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|---------|
| Node.js | All | ✓ | v22.19.0 | — |
| npm | Package management | ✓ | 10.9.3 | — |
| PostgreSQL | App database (Prisma) | ? | Unknown | Docker: `docker run -e POSTGRES_PASSWORD=secret -p 5432:5432 postgres:16` |
| Oracle Instant Client | oracledb driver | ? | Unknown | Skip Oracle support at test time; show install instructions in UI |

**Missing dependencies with no fallback:**
- PostgreSQL must be running for `prisma migrate dev` and all application functionality. If not available locally, the planner must include a database setup step (install or Docker).

**Missing dependencies with fallback:**
- Oracle Instant Client: oracledb can be lazy-loaded; if missing, Oracle connection test returns a descriptive error. Not blocking for Phase 1 delivery.

---

## Project Constraints (from CLAUDE.md)

| Directive | Type | Detail |
|-----------|------|--------|
| Use Next.js App Router | Required | No Pages Router |
| TypeScript only | Required | No plain `.js` files in src/ |
| Tailwind CSS | Required | No other CSS frameworks |
| shadcn/ui | Required | No other component libraries |
| PostgreSQL + Prisma | Required | No other DB/ORM for app state |
| NextAuth.js v5 | Required | Credentials + JWT strategy |
| AES-256-GCM | Required | Key in `ENCRYPTION_KEY` env var; never in DB/code |
| child_process.spawn() | Required | Not exec() — relevant for Phase 2+; note for Phase 1 |
| No Express.js | Forbidden | Next.js API Routes only (WebSocket custom server is exception) |
| No Sequelize/Mongoose | Forbidden | Prisma only |
| No Redis (Phase 1) | Deferred | BullMQ upgrade path only if multi-instance needed |
| Korean UI | Required | All user-facing strings in Korean |
| GSD workflow enforcement | Required | Use GSD commands for all file changes |

---

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view`) — verified all package versions on 2026-03-28
- Node.js built-in crypto docs — AES-256-GCM pattern
- CLAUDE.md — project constraint directives

### Secondary (MEDIUM confidence)
- [Auth.js Migrating to v5](https://authjs.dev/getting-started/migrating-to-v5) — NextAuth v5 split config pattern (found via WebSearch, official source)
- [Auth.js RBAC Guide](https://authjs.dev/guides/role-based-access-control) — JWT/session callbacks for role (official source)
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) — Tailwind v4 setup (official source)
- [Prisma + Auth.js Guide](https://www.prisma.io/docs/guides/authjs-nextjs) — Prisma schema for NextAuth (official source)
- [Next.js CVE-2025-29927 Security Advisory](https://rhyno.io/blogs/cybersecurity-news/critical-security-update-next-js-15-2-3-fixes-cve-2025-29927/) — middleware security limitation

### Tertiary (LOW confidence)
- Multiple Medium/DEV articles on NextAuth v5 RBAC patterns — verified against official Auth.js docs
- WebSearch results on oracledb startup crash behavior — consistent across multiple sources, aligns with known native dependency behavior

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via npm registry
- NextAuth v5 API: MEDIUM — beta software; API is stable but minor changes possible
- Architecture patterns: HIGH — based on official Next.js and Auth.js docs patterns
- Pitfalls: HIGH — CVE confirmed, other pitfalls verified against official docs
- Multi-DB driver behavior: HIGH — driver APIs are stable and well-documented

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (30 days; NextAuth v5 beta may update sooner — re-check if beta.31+ releases)
