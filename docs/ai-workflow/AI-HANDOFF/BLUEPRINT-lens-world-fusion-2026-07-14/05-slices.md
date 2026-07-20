# 05 — SLICES + EXECUTABLE ACCEPTANCE CRITERIA

Every slice: (a) tests written FIRST and proven RED by stashing the implementation (paste the
fail output), (b) Rule 61 hostile self-review with findings+fixes listed, (c) Rule 42 backend
audit both commands pasted, (d) `npx tsc --noEmit` + prod build + the affected vitest folders
green, (e) STOP — output diff + evidence, wait for Fable checkpoint verdict.

## F0 — Atmosphere axis + chart-secondary token
Scope: 04-build-order F0 files only.
Accept when ALL of:
1. `npx vitest run src/core/style-lens-os src/adapters/style-lens-swan
   src/components/DashBoard/Pages/workout-design-lab` — all green; count reported.
2. New tests (RED-proven): recipe with 4 layers REJECTED; opacity 0.2 REJECTED; atmosphere without
   stillPoster REJECTED; unknown assetId compiles with degradation `atmosphere invalid — dropped`
   and the component tokens still apply; reduced-motion render shows ONLY the stillPoster layer
   (jsdom: assert the atmosphere el carries `data-atmo-mode="still"` under a mocked matchMedia).
3. Golden Pair renders byte-identical plans when `atmosphere` is absent (zero-delta lock —
   assert `compileRecipe` output deep-equals a pre-change snapshot for both shipped recipes).
4. Existing lens test suite still green — **re-count it first** (do NOT target the stale "187"
   number, which drifted; run the folders and report the actual count). Explorer/LabPage budgets
   unchanged.
STOP.

## F1 — Server persistence
Accept when ALL of:
1. Migration runs clean; `SELECT column_name FROM information_schema.columns WHERE
   table_name='user_appearance_profiles'` output pasted (Rule 58 receipt) and FK verified against
   `"Users"` via `information_schema.table_constraints` paste.
2. Backend tests green incl.: GET unauthenticated → 401; GET other-user impossible by construction
   (route derives userId from auth token ONLY — no userId param exists; source-contract asserts
   the route file contains no `req.params.userId`/`req.query.userId`); first GET → `profile:null`
   200; PUT roundtrip → GET returns same; PUT bad motionMode (e.g. `'lean'`) → 422; PUT VALID
   `motionMode:'reduced'` and `profileSchemaVersion:1` (number) → 200 (the drift-trap: a real
   shipped profile MUST pass — assert it explicitly).
3. curl transcript pasted: PUT then GET as an authenticated test user showing the roundtrip JSON.
4. Frontend: commit in the Lab → network PUT observed (paste devtools/network line or msw assert);
   PUT failure path shows the exact offline receipt copy; local commit NOT rolled back.
5. Rule 20 sweep: `rg -n "api/appearance" frontend/src backend/` output enumerated in the receipt.
STOP.

## F2 — Crown Header + Looks Carousel
Accept when ALL of:
1. Rule 26 Canonical Surface Receipt for the user-dashboard Home mount (route file:line, mounted
   JSX file:line) pasted BEFORE the diff.
2. Tests (RED-proven): header renders committed look name; tapping a card previews INSIDE the
   header frame only (assert the header's scoped frame data attr changes while the page-level
   frame does not); `Wear this` calls commitPreview once and fires the chip with the exact copy
   `<Name> is now your look everywhere.`; carousel order law (committed → v2 by family → chrome);
   WORN badge exactly on committed; ◄ ► buttons have the exact aria-labels; anonymous state shows
   the exact sign-in line.
3. Screenshots: 375 and 1440, plus 375 @ 667px-height proving the band's 148px collapse and the
   next-best-action module visible.
4. a11y: carousel cards are buttons ≥44px; band el `aria-hidden`; axe (or manual role dump) shows
   no new violations on Home.
STOP.

## F3 — v2 production rollout
Accept when ALL of:
1. With flag ON + committed `candy-glass-arcade`: ALL makeLensFrame surfaces (16 as of 2026-07-16 — re-enumerate per 04-build-order §F3, incl. the 4 dashboard shells + 6 public v-next pages) render
   `data-lens2-*` attrs (paste one DOM query per surface from the running app or targeted tests).
2. With the per-browser OVERRIDE OFF (`localStorage['swan-lens-v2-rollout']='off'` + reload):
   ALL enumerated makeLensFrame surfaces render host defaults — override proof screenshot/DOM
   paste. State in the receipt
   that this is a per-tester override, and name the real production rollback (git revert / env
   default), NOT "kill switch" (M1).
3. Chrome-only committed ids still resolve null; and resolution now goes through
   `V2_RECIPE_BY_CATALOG_ID` (M2) — a source-contract assert that the recipe-id map is retired.
4. Full frontend suite for ALL enumerated lens-frame surface folders green (16 as of 2026-07-16; re-count both). The FOUR
   sanctioned F3 contract-test changes (N1 — two per file) applied and enumerated in the receipt:
   the two rewritten asserts in `WorkoutDesignLab.styleAxis.test.tsx` A3 (+rename) and the two
   catalog-id lookups in `surfaceManifests.test.ts`. If any OTHER test goes RED, STOP — do not edit
   it to pass.
5. Viewport spot: logger + progress at 375/1440 wearing Candy Glass — no clipped/overlapped
   critical controls (screenshots).
STOP — this slice flips live UX; Fable checkpoint + Sean ping before push.

## F4 — Style Studio
Accept when ALL of:
1. Tests (RED-proven): overlay schema — unknown key REJECTED server-side (422 details paste) and
   dropped client-side; FREE(`free`) user PUT with `accent` → the canonical **402 `TIER_REQUIRED`**
   (per requireTier.mjs; NOT a bespoke 403 unless the checkpoint approved a divergence);
   GUARDIAN(`pro`) PUT with `fontPairing` → 402; CRYSTALLINE(`elite`) all keys → 200; the
   `TIER_GATING_ENABLED=false` kill switch and admin/trainer bypass are honored (tests); locked
   rows render disabled+🔒 with the EXACT per-tier string from the 02-wireframes §3 table (`free` →
   "Fine-tuning is a Guardian perk…"; `pro` → "Font pairing is a Crystalline dial…"); `Save my
   style` chip exact copy; Reset clears overlay (PUT `overlay:null`) and the header reverts live.
2. Precedence probe: with Candy Glass + accent `gilded-fern`, computed `--world-accent` on a
   frame equals the gilded value while `--world-action` is UNCHANGED (paste computed-style dump).
3. Chart truth: progress chart primary follows the overlay accent via the existing palette seam;
   secondary stays Wing Purple unless the recipe carries `world-chart-secondary` (test).
4. Sheet a11y: focus trap, Esc close, `aria-modal`, 44px controls, safe-area padding
   (source-contract). Screenshots 375 bottom-sheet + 1440 drawer.
STOP.

## F5 — Distillation + six world-styles
Accept when ALL of:
1. `node scripts/ai-workflow/world-distill.mjs world.natural-sublime.glacier-cathedral` emits a
   §5-shaped seed (paste it); deterministic: same seed input → byte-identical output (hash paste).
2. The six recipes (authored WITH Fable at checkpoint — builder does not invent tokens) land via
   the A4 pipeline; per style: the five entries + enumeration appends; gate suite green; timed
   receipt per style (<30 min each, per the LENS-ADD-A-STYLE DoD).
3. Lab + Crown Header show all six with `v2` tags and family placement; screenshots 414 + 1440.
4. Distinctness gate: every new pair ≥3 axes (suite output paste).
STOP.

## F6 — Fusion gates
Accept when ALL of:
1. Map-completeness assertion green (and RED-proven by temporarily commenting a map entry).
2. Atmosphere gates green across ALL map entries (incl. the six new): caps/opacity/assetId/
   stillPoster/chart-secondary contrast.
3. Boundary test: a planted factory import in core AND in adapters both fail (paste both RED runs,
   then remove the plants).
4. Perf locks: CrownHeader/StyleStudio source-contract (no canvas/webgl/rAF/video) green;
   Lighthouse or web-vitals spot on Home with atmosphere ON: LCP ≤2.5s p75-equivalent local note,
   CLS ≤0.1 (paste numbers, label `[LOCAL-LAB]`).
5. Full program regression: the whole lens suite (re-count — do not target a fixed number),
   ALL enumerated lens-frame surface folders, backend appearance tests — one combined green run
   pasted. Rule 48 audit
   record for the program filed at
   `docs/ai-workflow/AI-HANDOFF/LENS-WORLD-FUSION-AUDIT-RECORD-<date>.md`.
DONE — program closeout (Rule 41 + 57 + 60).
