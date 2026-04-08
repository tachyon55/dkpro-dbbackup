---
phase: quick-260408-ge8
plan: "01"
subsystem: deployment
tags: [netlify, deployment, next.js, configuration]
dependency_graph:
  requires: []
  provides: [netlify-deployment-config]
  affects: [build-pipeline]
tech_stack:
  added: ["@netlify/plugin-nextjs (declared in netlify.toml)"]
  patterns: ["Netlify plugin-based Next.js deployment"]
key_files:
  created:
    - netlify.toml
  modified:
    - next.config.ts
decisions:
  - "netlify.toml build command uses next build without --turbopack; local dev keeps --turbopack via package.json"
  - "publish directory is .next (not out or public) — required for @netlify/plugin-nextjs"
  - "output: 'export' explicitly NOT used — would disable API Routes and server components"
metrics:
  duration: "< 2 minutes"
  completed: "2026-04-08"
  tasks_completed: 2
  files_changed: 2
---

# Quick Task 260408-ge8: Netlify Deployment Config Summary

**One-liner:** netlify.toml created with @netlify/plugin-nextjs, prisma generate build step, env var docs, and Socket.io limitation warning; next.config.ts annotated for Netlify compatibility.

## What Was Done

Created `netlify.toml` at the project root and updated `next.config.ts` to prepare the project for Netlify deployment.

### Task 1: netlify.toml 생성 — commit `6eec4b1`

Created `netlify.toml` with:
- Build command: `npx prisma generate && next build` (no `--turbopack` flag — Netlify CI compatibility)
- Publish directory: `.next` (correct value for `@netlify/plugin-nextjs`)
- NODE_VERSION: 20
- Required environment variables documented in comments (DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET, ENCRYPTION_KEY, AWS keys)
- `@netlify/plugin-nextjs` plugin declared
- Socket.io WebSocket limitation documented prominently

### Task 2: next.config.ts Netlify 호환 주석 추가 — commit `e94a5c7`

Added explanatory comment clarifying that `output: 'export'` must NOT be used because it disables API Routes and server components. Netlify handles the standard Next.js build via the plugin.

## Deviations from Plan

None — plan executed exactly as written.

## Key Decisions

1. **Build command separates turbopack concern**: `netlify.toml` uses `next build` (standard webpack) while `package.json` keeps `--turbopack` for local dev. This avoids a single flag causing Netlify CI failures without touching local dev workflow.

2. **publish = ".next" is intentional**: Unlike `output: 'export'` which outputs to `out/`, the plugin-based approach requires `.next` as the publish directory.

3. **Socket.io documented, not solved**: The WebSocket limitation is a known architectural constraint for Netlify deployments. Documented clearly so future developers understand they need Railway/Render/Fly.io for real-time backup progress features.

## Known Stubs

None.

## Self-Check: PASSED

- `netlify.toml` exists at project root: PASS
- `@netlify/plugin-nextjs` declared: PASS
- Build command correct: PASS
- publish = ".next": PASS
- Env vars documented: PASS
- Socket.io note present: PASS
- No `output: 'export'` in next.config.ts: PASS
- Commits `6eec4b1` and `e94a5c7` verified in git log
