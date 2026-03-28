---
phase: 01-foundation-auth-connections
plan: 02
subsystem: users
tags: [nextjs, prisma, zod, shadcn, rbac, user-management]

requires:
  - 01-01 (auth session, Prisma User model, app shell layout)

provides:
  - GET/POST /api/users (admin-only list and create)
  - GET/PUT/DELETE /api/users/[id] (admin-only single-user ops)
  - POST /api/users/[id]/reset-password (temp password generation, D-08)
  - Zod validation schemas: createUserSchema, updateUserSchema
  - UserTable component with D-03 columns and role/status badges
  - UserModal component supporting create and edit modes
  - UsersPageClient with full CRUD flow, confirmation dialogs, toast feedback
  - D-06 last-admin protection in PUT and DELETE routes
  - D-02 mustChangePassword=true on create and reset-password

affects:
  - All plans that display user lists or check user permissions
  - Sidebar user-count badge (if added later)

tech-stack:
  added:
    - sonner (toast notifications via shadcn/ui sonner wrapper)
    - "@types/mssql" (dev — type declarations for mssql driver)
    - "@types/oracledb" (dev — type declarations for oracledb driver)
  patterns:
    - shadcn/ui components: Table, Badge, Dialog, Select, Switch, AlertDialog, Sonner
    - Zod 4 API: .issues (not .errors) on ZodError
    - Server component role-check + client component delegation pattern (UsersPage -> UsersPageClient)
    - One-time temp password display dialog (shown once, cannot be retrieved again)

key-files:
  created:
    - src/lib/validations/user.ts (createUserSchema, updateUserSchema)
    - src/app/api/users/route.ts (GET list, POST create)
    - src/app/api/users/[id]/route.ts (GET, PUT, DELETE with D-06 guards)
    - src/app/api/users/[id]/reset-password/route.ts (POST temp password, D-08)
    - src/components/users/UserTable.tsx (D-03 columns, role+status badges)
    - src/components/users/UserModal.tsx (create/edit mode, RHF + Zod)
    - src/app/(app)/users/UsersPageClient.tsx (client CRUD orchestration)
    - src/components/ui/alert-dialog.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/dialog.tsx
    - src/components/ui/select.tsx
    - src/components/ui/switch.tsx
    - src/components/ui/table.tsx
    - src/components/ui/sonner.tsx
  modified:
    - src/app/(app)/users/page.tsx (replaced stub with server check + client delegation)
    - src/app/layout.tsx (added Toaster for global toast notifications)
    - package.json (added @types/mssql, @types/oracledb dev deps)

key-decisions:
  - "Zod 4 breaking change: ZodError.errors renamed to ZodError.issues — fixed in both route files"
  - "UsersPageClient colocated in app/(app)/users/ alongside page.tsx — avoids prop-drilling session through layout"
  - "Temp password shown in one-time Dialog (not toast) to ensure admin reads it before dismissing"
  - "Delete button disabled for current user in UserTable as secondary UX guard (server also enforces)"

duration: 7min
completed: 2026-03-28
---

# Phase 01 Plan 02: User Management Summary

**Admin user CRUD via REST API (Zod validation, D-06 last-admin guard, D-08 temp password) and shadcn/ui management UI with table, create/edit modals, delete confirmations, and one-time temp password display.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-28T10:58:38Z
- **Completed:** 2026-03-28T11:05:00Z
- **Tasks:** 2 of 2
- **Files modified:** 14 created, 3 modified

## Accomplishments

### Task 1: User management API routes with Zod validation and RBAC

- Created `src/lib/validations/user.ts`: `createUserSchema` (email, name, password D-04, role) and `updateUserSchema` (name, role, isActive — all optional)
- Created `GET /api/users`: lists all users (no password field), admin-only via `auth()` re-check
- Created `POST /api/users`: creates user with bcrypt-hashed password and `mustChangePassword: true` (D-02); 409 on duplicate email
- Created `GET /api/users/[id]`: single user without password, admin-only
- Created `PUT /api/users/[id]`: updates name/role/isActive with D-06 last-admin guard (checks active admin count before demotion or deactivation)
- Created `DELETE /api/users/[id]`: self-delete guard + D-06 last-admin guard
- Created `POST /api/users/[id]/reset-password`: generates "Temp{6 digits}!" temp password, bcrypt-hashed, sets `mustChangePassword: true` (D-08)
- All routes verify admin role via `auth()` at route level per CVE-2025-29927 anti-pattern guidance

### Task 2: Admin user management UI

- `UserTable`: 6 columns per D-03 (이메일, 이름, 역할, 상태, 마지막 로그인, 작업); role badges (admin=red, operator=blue, viewer=gray); status badges (활성=green, 비활성=gray); action buttons (수정, 비밀번호 초기화, 삭제); self-delete button disabled in UI as secondary guard
- `UserModal`: create mode (email+name+password+role) and edit mode (name+role+isActive toggle); React Hook Form + Zod resolver; Korean validation messages; `Dialog` from shadcn/ui
- `UsersPageClient`: useEffect fetch on mount; "사용자 추가" button opens create modal; AlertDialog confirmation for delete and reset-password; one-time temp password display Dialog after reset
- `users/page.tsx`: server component admin role check, delegates to `UsersPageClient`
- Added `Toaster` to root layout for global toast coverage
- Added shadcn/ui components: Table, Badge, Dialog, Select, Switch, AlertDialog, Sonner

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod 4 breaking change: ZodError.errors renamed to ZodError.issues**
- **Found during:** Task 1 build
- **Issue:** TypeScript error "Property 'errors' does not exist on type 'ZodError'" — Zod 4 (installed in Plan 01) moved the errors array to `.issues`
- **Fix:** Changed `result.error.errors[0].message` to `result.error.issues[0].message` in both `route.ts` files
- **Files modified:** src/app/api/users/route.ts, src/app/api/users/[id]/route.ts
- **Commit:** 1768dd9

**2. [Rule 3 - Blocking] Missing type declarations for mssql and oracledb**
- **Found during:** Task 1 build (pre-existing from Plan 01)
- **Issue:** TypeScript "Could not find a declaration file for module 'mssql'" and same for 'oracledb' — blocked type-check phase of `next build`
- **Fix:** Installed `@types/mssql` and `@types/oracledb` as dev dependencies
- **Files modified:** package.json, package-lock.json
- **Commit:** 1768dd9

## Known Stubs

None — this plan's goal (admin CRUD for users) is fully wired. All D-03, D-02, D-06, D-08 requirements implemented end-to-end.

The connection management stub (`src/app/(app)/connections/page.tsx`) remains from Plan 01 — resolved in Plan 01-03.

## Self-Check: PASSED
