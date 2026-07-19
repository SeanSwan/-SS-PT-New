# NEXT-CHAT PROMPT — Swan Design-Overhaul Program (resume point: 7/14 surfaces shipped, 2026-07-18)

> Paste this whole file to a fresh agent. It is self-contained: read it + the tracker and you can continue
> exactly where the last session left off. Then produce the comprehensive panel report Sean asks for below.

---

## 0. WHO YOU ARE + THE MISSION
You are Claude (Opus 4.8, 1M) continuing SwanStudios' **14-surface Swan Design-Overhaul Program** — Sean's
directive (2026-07-18): *"build ALL 14 blueprints autonomously in sequence,"* gating **each production push**
with Sean. Every surface is a reversible, flag-gated visual redesign that CONSUMES the shipped Swan Lens
design system. **7 surfaces are already shipped to main (all flag-OFF, all Sean-gated).** Your job: continue
the remaining surfaces with the identical discipline, OR (Sean's current call) start with the comprehensive
panel report + the billing-critical Gallery decision.

Read first, in order: this file → `docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-OVERHAUL-PROGRAM-TRACKER-2026-07-18.md`
(the load-bearing tracker; has the status board + the "RESUME NOTE" + per-surface recipe) → `CLAUDE.md` rules
(esp. 6, 8, 40, 46, 61, 67) → the specific KIMI-*-BLUEPRINT/DIRECTION doc for the surface you're building.

## 1. GIT / WORKTREE STATE (verify freshness FIRST — Rule: branches drift)
- **Worktree:** `C:/tmp/ss-build-swan-lens` (a git worktree; node_modules is a PowerShell junction — if missing,
  recreate with `New-Item -ItemType Junction`, NOT git-bash mklink).
- **Branch:** `claude/build-swan-lens` (cut from origin/main). **main HEAD at handoff = `8d85bd766`.**
- **First command every session:** `git -C C:/tmp/ss-build-swan-lens fetch origin main && git -C C:/tmp/ss-build-swan-lens rev-list --left-right --count origin/main...HEAD`.
  If behind, `git merge origin/main --no-edit` (NOT rebase — Rule 45). Upstream may carry **Living Worlds**
  doc commits (docs only, no code overlap — merges clean).
- **Pushing:** commit per slice; push ONCE per batch (Rule 70) with `git push origin HEAD:main` — only after
  Sean gates the push. Every push must be fast-forward (0 behind).

## 2. WHAT'S SHIPPED (7 surfaces — all on main, flag-OFF → V-prev still live)
| # | Surface | main SHA | New code | Env flag to activate |
|---|---|---|---|---|
| 1 | Swan Lens (keystone) | `cba39192b` | `frontend/src/adapters/style-lens-swan/` | (always on — the engine) |
| 2 | Dashboards (4 roles + backend) | `8a8545605` | `frontend/src/components/DashBoard/v2/` + backend routes | `DASHBOARD_V2_ENABLED` (+`DASHBOARD_V2_FINANCE`) |
| 3 | Store "Crystal Case" | `bf00e721f` | `frontend/src/pages/shop/store-v4/` + `StoreGate.tsx` | `STORE_V4_ENABLED` |
| 4 | Home optics hero | `0606edc23` | `frontend/src/pages/HomePage/v-next/` + `HomeGate.tsx` | `HOME_VNEXT_ENABLED` |
| 5 | About caustic swan-occluder | `816cce70e` | `frontend/src/pages/about/v-next/` + `AboutGate.tsx` | `ABOUT_VNEXT_ENABLED` |
| 6 | Video refraction library | `7b2b84184` | `frontend/src/pages/video-vnext/` + `VideoGate.tsx` | `VIDEO_VNEXT_ENABLED` |
| 7 | Contact Crystallize-Submit | `4e116d3c6` | `frontend/src/pages/contactpage/vnext/` + `ContactGate.tsx` | `CONTACT_VNEXT_ENABLED` |

All 6 flags live in `backend/routes/publicConfigRoutes.mjs` (`GET /api/config/public-flags`). Local preview
without env: `localStorage.ff_storeV4 / ff_homeVNext / ff_aboutVNext / ff_videoVNext / ff_contactVNext = '1'`.

## 3. THE PROVEN PER-SURFACE RECIPE (used x7 — don't reinvent)
1. **Direction:** if the surface is SEND-BACK (no build-exact spec), run `node scripts/consult-kimi.mjs
   --document <seed> --effort medium --max-tokens 26000 --out <dir>/KIMI-<X>-DIRECTION-2026-07-18.md`
   with a tight creative-direction seed (transcript "get out of the model's way" ethos + real code + real
   substrate + zero-new-deps). **`--effort high` returns EMPTY (burns the whole token budget on reasoning) —
   always use `--effort medium`.** Serialize consults. Ship-with-changes surfaces already have a usable blueprint.
2. **Foundation (mechanical clone of any shipped surface's dir):** `lensBindings.ts` (the ONLY lens import site;
   `CrystallizeOverlay` takes NO children), `flags.ts` (runtime `/api/config/public-flags.<key>` → env → false;
   **runtime `false` is an ABSOLUTE kill switch over the QA localStorage override** — a Codex-caught bug),
   `<x>.tokens.ts` (the ONLY file naming `--world-*`/`--lens-*`; ZERO hex or ONE sanctioned literal;
   `--<x>-*: var(--world-bg/panel/text/muted/accent/action/title-font)` + `var(--lens-canvas/elev-1..3/
   panel-radius/z-*/fx-glow-primary/ease-standard/ease-crystallize/crystallize-charge-ms)`), `<x>Manifest.ts`
   (`makeLensFrame`), `<X>Gate.tsx` (React.lazy + ErrorBoundary + **rAF-retry** ContractCheck → V-prev,
   fail-closed on every axis). Add the flag key to `publicConfigRoutes.mjs`.
3. **Signature moment:** consume the shipped `useCrystallizeTransition`/`CrystallizeOverlay`; fire ONCE on
   first in-view (IntersectionObserver, not a blind timer); **reduced-motion must disable framer's JS entrance
   too** (`initial={false}` / start-charged) — the CSS reduced-motion guard does NOT stop framer.
4. **Data/money surfaces are BIND-ONLY:** reuse the pure `.logic` helpers + reimplement fetch/state in the
   vNext hook (V-prev component untouched, SAME API path). NEVER edit the money/catalog/auth logic (Store's
   `/api/storefront`+`useCart`, Video's `/api/v2/videos`, Contact's `/api/contact`).
5. **Seam:** ONE `Gated<X>` wrapper at the route binding in `frontend/src/routes/main-routes.tsx`.
6. **Verify → hostile-review-to-dry → triangle:** tsc (`npx tsc --noEmit`, 0 errors), eslint (0 errors —
   **the `style={{}}` JSX ban hits framer too**; use CSS vars/`theme`/`colorScale` props), de-Galaxy grep
   (no `#0a0a1a`/`#00FFFF`/`#7851A9`/`rgba(0,255,255,…)`; ZERO hex ideal), `npm run build` passes, Rule 42
   backend audit. Then **triangle**: build a repo-RELATIVE packet, `node scripts/consult-codex.mjs --file
   <packet>` + `node scripts/consult-gemini.mjs --review --file <packet>`. Fix Codex's confirmed bugs.
   **Gemini is a design AUTHOR, not the gate (Rule 46)** — it has repeatedly directed deleting the token
   bridge / removing the gate / using theme-provider hex; REJECT those (they break the skinnable architecture
   + Rule 6). Clean up the packet from the main repo after.
7. **Gate the push with Sean** (dual-tier summary, Rule 57) → push → record: tracker row → SHIPPED, Hermes
   memo (`.ai-workflow/hermes-inbox/pending/`, secret-scan it), memory update.

## 4. GOTCHAS (hard-won — inherit these)
- consult-*.mjs **mangle absolute Windows paths → RELATIVE paths only.** Serialize consults. Background-task
  "exit 0" can be the wrapper's echo — read the real redirected output; a Kimi consult can save an EMPTY file
  (use `--effort medium`). A `*/` inside a JS block comment (e.g. `--home-facet-*/`) prematurely closes it.
- `useId()` for SVG def ids (document-global ids collide across instances — Codex). `.svg.tsx` filenames
  resolve via TS extension-appending only (no svgr plugin) — prefer plain `.tsx`.
- The **credential contract test** (`about/credentialPhrasing.contract.test.ts`) scans ALL frontend src for
  the literal `NASM-certified` — even a COMMENT saying "never NASM-certified" reddens it. Use "NASM-protocol",
  "NCEP-certified", "26+ years". Pre-commit only secret-scans, NOT vitest — a broken test can ship silently.
- On fetch error, reset pagination (don't retain stale page). One `<h1>` per hero; duplicate/ghost text
  aria-hidden. `<dl>` needs `<dt>`/`<dd>` (not bare anchors). Faked glass only (NO `backdrop-filter` in scroll
  grids — perf). Single stretched-link per card (no button-in-anchor).

## 5. THE NEXT WORK
- **#8 Cover/Gallery — BILLING-CRITICAL, do carefully (Sean's current gate).** `frontend/src/pages/GalleryPage.tsx`
  (~2000L) runs an enhancement-CREDIT PURCHASE system (`/api/gallery/credits`), VIP conversion modal, checkout-
  return feedback, referral modal, support actions — all money-path with truth tests (`pages/gallery/*.truth.test.ts`).
  Blueprint `KIMI-COVER-GALLERY-BLUEPRINT-2026-07-17.md` = SEND-BACK + "Core-Loop rewire" (architectural).
  **Approach:** study the credit/checkout/referral/VIP logic FIRST; a visual reskin keeps ALL of it BIND-ONLY
  (money-path untouched, like Store); the "Core-Loop rewire" architectural part needs Sean's explicit scoping
  BEFORE building. CLAUDE.md: billing gets no bypass. Recommend a FRESH, focused session for this one.
- **#9 Photography** — decompose `PhotographyPage` (~2219L), rename to "Cosmic Gate"; non-billing → lower risk.
- **#10 Design Skill redo + #11 Design Brain enhance** — **review + propose only** (swap on Sean confirm),
  NOT autonomous builds.

## 6. COORDINATION (Living Worlds — non-collision, keep it that way)
Two other lanes (runtime + design/generator) build the **Living Worlds** engine on the `wip/comms` tree
(`LIVING-WORLDS-CONVERGENCE-DIRECTIVE-2026-07-17.md`). This design-overhaul lane is a **pure CONSUMER** of the
lens+world contract — our `*.tokens.ts` only READ `--world-*`/`--lens-*`; we NEVER emit/modify them,
`SurfaceLensGate`, `makeLensFrame`, or `AppearanceProfile`. When they land `worldId` + `<WorldAtmosphere>`,
all 7 shipped surfaces re-skin for FREE. Non-collision note is in `.ai-workflow/coordination/claude.lane.md`
(gitignored, local). Re-read the other lanes before touching any shared-seam file (there shouldn't be any).

## 7. WHAT SEAN WANTS RIGHT NOW — the comprehensive panel report
Sean asked for a "wonderful comprehensive panel report" so he can continue exactly here. Produce, in chat:
(1) a plain-English recap of the 7 shipped surfaces (what each looks like now) + how to preview them (the
flags); (2) the full technical state (SHAs, dirs, the recipe, the gotchas); (3) the decision on #8 Gallery
(billing-critical — fresh session vs. careful bind-only reskin vs. skip to #9); (4) a clean menu of next moves
with a recommendation. Optionally run a triangle (Codex+Gemini) or a Village panel ONLY if Sean asks + gates
the spend (Rule 16). Then wait for Sean's direction — do NOT auto-start #8 (billing) without his scoping.
