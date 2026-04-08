---
phase: quick
plan: 260408-jf6
subsystem: deployment
tags: [vercel, deployment, next.js, configuration]
key-files:
  deleted:
    - netlify.toml
  created:
    - vercel.json
    - .vercelignore
  modified:
    - next.config.ts
decisions:
  - "vercel.json의 env 필드 대신 _comments 비표준 키를 사용하여 환경변수 문서화 — 실제 env 값이 배포에 영향 주는 것을 방지"
  - "Socket.io 제한 사항을 vercel.json _comments에 명시 — Vercel 서버리스 환경에서 영구 WebSocket 불가 경고"
metrics:
  duration: "46s"
  completed: "2026-04-08"
  tasks_completed: 2
  files_changed: 4
---

# Quick Task 260408-jf6: Netlify to Vercel Deployment Config Summary

**One-liner:** netlify.toml 삭제 후 vercel.json + .vercelignore 생성으로 Vercel 배포 환경 전환, next.config.ts 주석 Vercel 기준 업데이트

## What Was Done

Netlify 배포 설정(netlify.toml)을 제거하고 Vercel 배포 설정으로 전환했다. `prisma generate`가 포함된 buildCommand, Socket.io 서버리스 제한 경고, 환경변수 목록을 vercel.json에 문서화했다. `.vercelignore`로 개발 문서 및 백업 파일을 배포 번들에서 제외했다.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | netlify.toml 삭제 및 vercel.json 생성 | 54a07e8 | netlify.toml (삭제), vercel.json (신규) |
| 2 | next.config.ts 주석 업데이트 및 .vercelignore 생성 | 9b45ce4 | next.config.ts, .vercelignore (신규) |

## Key Decisions

1. **_comments 키 사용** — vercel.json은 JSON 형식으로 실제 주석 불가. `env` 필드에 설명 문자열을 넣으면 Vercel이 해당 값을 환경변수로 주입하는 문제 발생. `_comments` 비표준 키로 문서화하여 배포에 영향 없이 설명 포함.

2. **Socket.io 제한 명시** — Vercel 서버리스 환경에서는 영구 WebSocket 연결 불가. 실시간 백업 진행 상황 기능은 Railway, Render, Fly.io 등 장기 실행 서버 환경 필요. 이를 vercel.json에 명확히 경고로 남김.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- vercel.json exists and contains valid JSON with `buildCommand: "npx prisma generate && next build"`
- netlify.toml deleted (git rm)
- next.config.ts has "Vercel" comment, no "Netlify" reference
- .vercelignore exists with .planning/, backups/, .env patterns
- Commits 54a07e8 and 9b45ce4 verified
