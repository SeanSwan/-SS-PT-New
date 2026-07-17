---
surface: vs-claude
utc: 20260717T093000Z
topic: CRITICAL — retired Galaxy-Swan purple is LIVE in production (rgb-notation evasion); frontend build BROKEN on clean install (@zxing missing from lockfile)
tags: [prod-issue, tokens, lockfile, build-broken, retractions]
---

## What I did / learned
- **SHIPPED `d32fa9a9e`** to main (gates: 6 contract files / 65 tests PASS, `tsc --noEmit` **0 errors repo-wide**, Rule 42 clean; re-verified green after merging another session's Aurora Console work).
- **FINDING 1 — RETIRED BRAND COLOUR IS LIVE IN PRODUCTION.** Verified against the real bundle: `https://sswanstudios.com/v3/index.CbuCXHBG.css` serves `.bg-cosmic-gradient{...#7851a933}`. Root cause: **colour-space evasion** — `#7851A9` is `rgb(120,81,169)`, sources write `rgba(120,81,169,.2)`, and the bundler minifies it back to hex. My ban only matched hex, so it was green while the retired brand shipped. **Ban now matches hex AND rgb/rgba** (red/green proven). Real scope: **12 entries across 10 files** (live CSS: cosmic-elegance-utilities, cosmic-mobile-navigation, visual-polish, visual-softening; plus About.jsx, NewsletterSignup.jsx, Hero-Section.V2.tsx, gallery cards, galaxy-swan-theme.ts). Now an explicit **shrink-only DEBT LEDGER** in the test — removal changes live pixels, so it is its own slice + QA (rule 37).
- **FINDING 2 — FRONTEND BUILD IS BROKEN ON A CLEAN INSTALL.** `@zxing/browser@^0.1.5` is in `frontend/package.json:40` but **absent from `frontend/package-lock.json`** (grep count 0). `npm ci` therefore never installs it and `vite build` dies: *Rollup failed to resolve import "@zxing/browser" from src/hooks/useBarcodeCamera.ts*. Introduced by `aa40a877a chore(security): harden production dependencies` (2026-07-16), which touched package.json AND the lock. **If Render runs `npm ci`, every frontend deploy since has failed and prod is serving a stale bundle.** Not my slice — pre-existing on main, NOT fixed by me (touching the shared lockfile mid-session with 3 Claude sessions + Codex live is its own gated act).
- **FINDING 3 — palette drift, Sean's call.** The `crystallineDark` theme (`UniversalThemeContext.tsx:240`) uses `deepSpace #0D1117 / stardust #161B22 / text #E6EDF3` — GitHub-family darks, NOT the documented Crystalline Swan palette (Obsidian `#0A0A0F` / Carbon `#141419` / Graphite `#1A1A24` / Frost `#E0ECF4`, which `tokens.css` declares correctly). Only the accents match. Changing it restyles the whole app → surfaced, not silently "fixed".

## TWO RETRACTIONS (I was wrong; carry the corrections)
1. **"universal-theme-styles.css is a competing owner with non-Swan values"** — FALSE. Its `:root` block faithfully mirrors the active theme and is an intentional pre-JS fallback; themeUtils wins by document order BY DESIGN, not luck. Replaced with a **fallback-parity test** (CSS block must equal the theme's values) — which promptly caught a bad edit of my own (I "fixed" `--text-muted` 0.6→0.55 off a sloppy grep; the theme says 0.6; reverted).
2. **"retired-hex remediation surface is 1 line"** — FALSE (see Finding 1: 12 entries / 10 files).

## Why it matters to Hermes
- If asked "is the retired brand gone?" → **no**, it is live in prod via rgba(); a cleanup slice is owed.
- If asked "why don't my frontend changes appear?" → check Finding 2 first (lockfile/build), not the code.
- Durable lesson: **a colour ban that knows only one notation is not a ban.** Any future token/brand guard must cover hex + rgb/rgba (+ hsl if introduced). Verify guards with red/green injection, never by "it passes".

## State right now
- main @ `d32fa9a9e`. Nothing else pushed. Prod healthy (`/api/health` 200) but bundle staleness unverified pending Finding 2.

## Sean owes / blockers
- **P0: lockfile fix** — `npm install @zxing/browser` (regenerates lock) or restore it; then confirm Render's frontend build is actually succeeding.
- **P1: retired-purple cleanup slice** — 12 ledger entries; changes live pixels; needs QA.
- **Decision: crystallineDark palette** — keep GitHub darks or move to the documented Crystalline Swan palette?
- Still open: gallery aesthetic confirm; Coach DPA + FDA/MHMDA legal slices; Codex review.
