# BLUEPRINT: SwanStudios Native Mobile (iOS + Android) — Build Package

**Forged:** 2026-07-13 by Fable (architect). **Builder target:** Codex (isolated worktree).
**Scope of this package:** Phase 0 (foundation + contract audit), Phase 1 (native shell), Phase 2
(client vertical slice: login → today's workout → logger → save → history → one progress chart,
with minimal offline draft queue). Phases 3–6 (chart system, depth, trainer app, store submission)
are roadmap-only here and get their own forged packages later.

## What this is

SwanStudios (sswanstudios.com) is a production personal-training SaaS: React 18 + Vite web app
(`frontend/`), Express + Sequelize + PostgreSQL API (`backend/`), deployed on Render. The goal is a
real App Store / Play Store app. Strategy: build a **standalone Expo/React Native client app** that
consumes the EXISTING production API unchanged. The web app is never modified by mobile work.

- New app lives at repo path `mobile/` — a standalone Expo project with its OWN `package.json` and
  lockfile. It is NOT an npm workspace member. Do NOT touch root `package.json`, `frontend/`,
  or `backend/` runtime code (one exception: contract regression tests, see 05-slices Slice 0.3).
- Charts: Victory on web stays; mobile uses `victory-native` (Skia). Never Recharts, never any
  other chart lib.
- v1 ships with ZERO purchasing/checkout. No Stripe, no IAP. Login, train, log, see progress.

## Build order

Read in order: `01-architecture.md` → `03-contracts.md` → `04-build-order.md` → `05-slices.md`.
`02-wireframes.md` when building each screen. `06-bans.md` before writing ANY code.
`07-checkpoints.md` defines the review gate you must pass after every slice.

## Builder Contract (binding)

> You are the builder, not the architect. Follow the package to the letter. Where the package
> decides, you do not re-decide — even if you'd do it differently. Where the package is silent on
> something that matters, STOP and return the question; do not improvise. Build ONE slice at a
> time; after each slice, output the diff + the acceptance-criteria evidence (test output, curl
> results, screenshots) and WAIT for the checkpoint verdict before continuing. Never claim a
> criterion passed without pasting its output.

## Environment facts the builder needs

- Dev machine: Windows 11, Git Bash + PowerShell available. Node ≥20.
- Production API origin: `https://sswanstudios.com` ([VERIFIED] web hardcodes it in
  `frontend/src/utils/axiosConfig.ts:15`). The app reads it from env-driven `src/config/env.ts`
  with this as the default — never inline elsewhere.
- Local backend dev: `npm run dev` from repo root serves backend on `:10000` — but the mobile app
  should default to the production API for the vertical slice (local dev uses production DB anyway).
- Devices for acceptance: iPhone (physical or Simulator ≥ iOS 17) AND one Android
  (physical or emulator, API ≥ 34). EAS dev builds, not Expo Go (victory-native needs native modules).
