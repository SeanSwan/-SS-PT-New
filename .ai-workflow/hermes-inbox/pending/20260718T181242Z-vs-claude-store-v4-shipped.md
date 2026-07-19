# Hermes inbox memo

- **Surface:** vs-claude
- **UTC:** 20260718T181242Z
- **Topic:** Swan design-overhaul #3 (Store V4 "Crystal Case") SHIPPED to main

## What I did / learned
- Shipped surface #3 of the 14-surface Swan design-overhaul: **Store V4** to `main` `bf00e721f` (Sean-gated). Program now: #1 lens (cba39192b), #2 Dashboards (8a8545605), #3 Store (bf00e721f) — all live, all flag-off.
- Design-only rebuild of the storefront, money path NEVER touched (git diff confirms only store-v4 + publicConfig changed). Reads the same `/api/storefront` V3 uses; calls the shipped `useCart`. Flagship "pedestal" (not a tag); Crystallize fires on add-to-cart success (confirm-first).
- Kimi reground returned SEND-BACK: the original blueprint's token chain + feature-flag were authored against code that doesn't exist. Corrected to real lens slots + the proven Dashboards gate pattern. Codex triangle then caught a dead 3rd hex + a QA localStorage override that defeated the runtime kill switch — both fixed (kill switch now absolute).

## Why it matters to Hermes
- Store V4 is **dormant in production** — flag off, users still see StoreV3. Activates only when `STORE_V4_ENABLED=true` on Render (or the runtime flag / `localStorage.ff_storeV4='1'` for a local preview). If Sean asks "where's the new store," that's why.
- Reusable gate pattern now proven twice (Dashboards + Store): flags.ts (runtime /api/config/public-flags → env → false, kill switch absolute), lensBindings (CrystallizeOverlay takes NO children), tokens.ts (only --x-*→real --world-*/--lens-* + minimal hex), makeLensFrame, lazy Gate + ErrorBoundary + world-contract check. Surfaces #4-14 mirror this.

## State right now
- Branch `claude/build-swan-lens`; main == `bf00e721f`; Render auto-deploying. tsc/eslint/de-Galaxy/build all clean; Rule 42 clean.
- Next: surfaces #4-6 (Home/About/Video — all SEND-BACK in the master review, need full re-pass).

## Sean owes / blockers
- Optional: set `STORE_V4_ENABLED=true` on Render to activate/preview the new store.
- Each subsequent surface push is individually Sean-gated (standing rule).
