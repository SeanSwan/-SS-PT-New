---
decision: Master handoff prompt — de-gate the design-overhaul flag system, restore Sean's push-to-git workflow and the Design Studio preview rule, shrink Launch Control to features-only (CI-enforced whitelist), verify/fix admin 404s against live prod. Fable-drafted from a verified origin/main fact report; Kimi K3 R1 SHIP-WITH-CHANGES applied in full.
status: consensus
supersedes: none
---

# MASTER HANDOFF — De-Gate the Design Overhaul, Restore the Normal Workflow (2026-07-21)

> **You are the executing agent.** Read this whole prompt first. You need NO prior session context — every
> load-bearing fact was verified on `origin/main @ eb4bbdd63` (2026-07-21) with file:line evidence, and every
> protocol you must follow is defined in §5. If a cited file changed after that SHA, re-verify before acting —
> **current code beats this prompt; record any delta in your receipts.** Work on a fresh branch off
> `origin/main` in a fresh worktree (the shared wip checkout is ~950 commits stale — never build there).

## 0 · Sean's law (the WHY — do not violate)

1. **Push-to-git = production.** What the site looks like is decided by code on `main` — never by Render
   env variables, never by a DB flag board. Sean fixes and pushes; that's the whole workflow.
2. **Unfinished design work lives in the admin Design Studio** (preview surface inside the admin dashboard)
   until Sean approves it — then it ships by REPLACING the real page in a normal commit.
3. **Feature kill-switches allowed; design gating is not** — and this is CI-enforced after this work (§2 S3.4).
4. The parked vNext redesigns are **parked, not deleted** (they pre-date the Mobbin intel; a later
   Mobbin-grounded pass will re-use their tokens/primitives). They must still compile after every slice.
5. **Nothing may break.** Money path (StoreV3 checkout/cart/Stripe), auth, admin dashboards, and the
   proof-card + Restore work (§1 "Protected features") stay intact and are re-verified after each slice.

## 1 · Verified ground truth (spot-check, don't re-discover)

**Production already renders the ORIGINAL designs.** All overhaul surfaces are fail-closed dark: no backend
env keys set, no `VITE_` keys set anywhere on main, and (verify in S0) no `flag_overrides` rows. The vNext
code is deployed-but-dark.

**Gate mechanism:** each public route wraps the ORIGINAL page as `children` in a `*Gate.tsx`
(`frontend/src/pages/main-routes.tsx:73-200`); the gate renders vNext only when its flag resolves true AND a
world-contract probe passes; otherwise `return <>{children}</>`.

**Flag resolution precedence:** `?swanpreview=<flagKey>` (needs `swan_preview_ok` localStorage marker set by
the admin board — `frontend/src/config/previewFlags.ts`) → runtime `GET /api/config/public-flags`
(`backend/routes/publicConfigRoutes.mjs`; explicit boolean wins) → QA `localStorage.ff_<flagKey>` → build-time
`VITE_*` fallback → **false = original**. Backend baseline: `backend/services/launchControlResolve.mjs`
`envBaseline()`.

### Flag map (Kimi H2) — verify each row before deleting anything
| Surface | Gate (main-routes.tsx) | flags.ts | Flag key (= seed, ff_ suffix, swanpreview value) | Render env key | VITE fallback | OFF renders (original — keep) | vNext dir (park) |
|---|---|---|---|---|---|---|---|
| Home | `HomeGate` :74 | `pages/HomePage/v-next/flags.ts` | `homeVNext` | `HOME_VNEXT_ENABLED` | `VITE_HOME_VNEXT` | `pages/HomePage/components/HomePage.V4` | `pages/HomePage/v-next/` |
| Store | `StoreGate` :198 | `pages/shop/store-v4/flags.ts` | `storeV4` | `STORE_V4_ENABLED` | `VITE_STORE_V4` | `pages/shop/StoreV3` | `pages/shop/store-v4/` |
| About | `AboutGate` :127 | `pages/about/v-next/flags.ts` | `aboutVNext` | `ABOUT_VNEXT_ENABLED` | `VITE_ABOUT_VNEXT` | `pages/about/About.V4` | `pages/about/v-next/` |
| Contact | `ContactGate` :114 | `pages/contactpage/vnext/flags.ts` | `contactVNext` | `CONTACT_VNEXT_ENABLED` | `VITE_CONTACT_VNEXT` | `pages/contactpage/ContactV3` | `pages/contactpage/vnext/` |
| Video | `VideoGate` :165 | `pages/video-vnext/flags.ts` | `videoVNext` | `VIDEO_VNEXT_ENABLED` | `VITE_VIDEO_VNEXT` | `pages/VideoLibraryV3` | `pages/video-vnext/` |
| Gallery | `GatedGalleryPage` | `pages/gallery-vnext/flags.ts` | `galleryVNext` | `GALLERY_VNEXT_ENABLED` | `VITE_GALLERY_VNEXT` | `pages/GalleryPage` | `pages/gallery-vnext/` |
| Dashboard shell | `DashboardV2RouteGate`/`DashboardGate` (locate exact mount — S0.5) | `components/DashBoard/v2/flags.ts` | `dashboardV2` | `DASHBOARD_V2_ENABLED` | `VITE_DASHBOARD_V2` | V1 `UniversalDashboardLayout` | `components/DashBoard/v2/` |

**Parked-surface count (Kimi H3):** the 7 directories in the table are the parked set THIS prompt asserts.
The program tracker says "8/8 public surfaces" (it counts Gallery as two slices #8/#9). **S0.5 must
authoritatively enumerate** via `git grep -l "swanpreview\|_VNEXT\|storeV4\|dashboardV2" frontend/src` +
the Launch Control seed list, reconcile with this table, and record any extra parked dir in the receipts —
then register ALL of them in S2.

**Feature flags that SURVIVE (never touch their behavior):** `postSaveHandoff` (env
`ENABLE_POST_SAVE_HANDOFF`; consumers `frontend/src/components/WorkoutLogger/handoff/usePostSaveHandoffFlag.ts`
+ `WorkoutLoggerHandoffMount.tsx`, mounted `WorkoutLogger.tsx:811` — the workout proof card),
`dashboardV2Finance` (env `DASHBOARD_V2_FINANCE`, server-enforced), `prismCapture` (env
`PRISM_CAPTURE_ENABLED`, marketing lead capture inside HomeGate — after de-gating Home, verify its mount
survives on the original Home route; if it was only mounted via HomeGate, remount it on the original Home
page unchanged).
**dashboardV2Finance dependency verdict (Kimi H5):** in S0.5, locate its consumer. IF it renders only
inside the v2 shell, it becomes dormant when v2 parks — record that in the tracker ("dormant until a
dashboard redesign returns"), keep the flag registered, do NOT delete it. IF it has a V1 consumer, verify
it still works post-de-gate.

**Launch Control (admin flag board):** route `/dashboard/admin/launch-control`
(`frontend/src/config/dashboard-tabs.ts:563`; page `components/DashBoard/Pages/admin-launch-control/`),
API `/api/admin/flags` (`backend/routes/adminFlagRoutes.mjs`, mounted `backend/core/routes.mjs:455`),
service `launchControlService.mjs` writes `flag_overrides` + append-only `flag_audit`; tables from
migrations `20260720120000-launch-control.cjs` (seeds 9 flags) + `20260721130000-…post-save-handoff.cjs`.

**VITE_ trap (must die structurally):** if any `VITE_<X>_VNEXT=true` were set in the Render build env, an
unreachable flags endpoint fails OPEN (forces the new design) — `docs/ai-workflow/references/FLAG-FLIP-RUNBOOK.md`
§0/§3. None are set today.

**Design Studio (the original "Design tab", component name `DesignPlayground`):**
`frontend/src/pages/DesignPlayground/DesignPlaygroundLayout.tsx` — concept-registry viewer. Currently mounts
ONLY when built with `VITE_DESIGN_PLAYGROUND=true` (`main-routes.tsx:357,913`) — unset in prod → unmounted.
Its old dashboard nav entry sits in DEAD legacy config `ADMIN_DASHBOARD_TABS` (`dashboard-tabs.ts:425-433`,
whose only consumers are tests). Back-buttons target unmounted `/dashboard/design-playground`
(`DesignPlaygroundLayout.tsx:254,268`).

**Admin 404s: NOT reproducible at main HEAD.** All 33 admin `WORKSPACE_CONFIG` prefixes
(`dashboard-tabs.ts:513`, rendered by `AdminStellarSidebar.tsx:51`) have route parity in
`UniversalDashboardLayout.routes.tsx`; unmatched `/dashboard/admin/*` redirects (not 404) via catch-all
(`UniversalDashboardLayout.shellPieces.tsx:111-114`). BUT `sidebarRouteParity.contract.test.ts` asserts only
5 admin ids — drift ships silently. Churn suspects: `3dde0f81c`, `dd4494ee9`, `9069a3d8c`, `b08c55217`.

**Program docs to update in S5:** `SWAN-DESIGN-OVERHAUL-PROGRAM-TRACKER-2026-07-18.md` (8/8 built, 0/8
activated), `FLAG-FLIP-RUNBOOK.md`, `FLAG-LIFECYCLE-DOCTRINE.md`.

**Protected features (verify after every slice):** proof card (paths above; flag must still flip), the
Restore branch work (`claude/recovery-compass-20260721` — `frontend/src/components/UserDashboard/components/RestoreToday/`
+ `backend/services/recovery/` + `/api/recovery/*`; if it merged to main before you start, its surfaces must
stay green), StoreV3 checkout, auth/login.

## 2 · Slices (strict order · per-slice gates · ONE batch push at the end)

**Per-slice gate (Kimi H8), required before EVERY slice commit:** `npx tsc --noEmit` (frontend) → affected
`vitest run` suites → `npm run build` (frontend) green, PLUS the assertion "all parked vNext dirs still
compile" (they're in the tsc program; a build proves the chunks). No broken intermediate commits.

### S0 — Live-production probe (read-only; no code; produces the receipts bundle)
1. The 6 public URLs on the live site render the ORIGINAL designs — record HTML `<title>`/hero marker per page.
2. `GET /api/config/public-flags` from prod — save the JSON (expect all redesign keys false/absent).
3. Read `flag_overrides`/`flag_audit` via the Launch Control board (admin UI, read-only) — screenshot/record rows.
4. **Admin 404 repro is Sean's 10-minute click-pass** (Kimi H10 — you have no prod credentials): give Sean a
   checklist of all 33 sidebar items; he records click → URL → outcome. If 404s appear live but not at HEAD,
   diagnose stale-build/intermediate-deploy BEFORE any code change; write a Canonical Surface Receipt (§5.2)
   for anything you will change.
5. Enumerations: authoritative parked-surface list (per §1); dashboardV2 gate mount location + V1 fallback
   confirmation; `dashboardV2Finance` + `prismCapture` consumer locations + dependency verdicts; **flag-fetch
   origin** — find where `/api/config/public-flags` is called (per-surface hook vs global provider). Record all
   in the receipts bundle.
6. Receipts bundle home (Kimi I4): `docs/receipts/de-gate-2026-07-21/` — S0 artifacts + (later) build-manifest
   diff + post-deploy click-pass.

### S1 — De-gate the seven surfaces (design gating dies)
1. In `main-routes.tsx` (and the dashboard mount for v2): unwrap each gate so the route renders the ORIGINAL
   component directly. Delete the Gate components and remove vNext lazy imports from the ROUTER only.
   Do NOT delete vNext directories.
2. **Flag-plumbing deletion scope (Kimi H7):** for each removed flag, grep importers of its `flags.ts`.
   (a) If only the Gate imports it → delete the flags.ts with the Gate. (b) If the parked vNext page imports
   it → keep the file, gut it to `export const <key>Enabled = false as const;` (inert, no fetch/env/localStorage),
   note it in the parked inventory. After deletions: `git grep -l "ff_homeVNext\|ff_storeV4\|ff_aboutVNext\|ff_contactVNext\|ff_videoVNext\|ff_galleryVNext\|ff_dashboardV2\|VITE_HOME_VNEXT\|VITE_STORE_V4\|VITE_ABOUT_VNEXT\|VITE_CONTACT_VNEXT\|VITE_VIDEO_VNEXT\|VITE_GALLERY_VNEXT\|VITE_DASHBOARD_V2\b"`
   must return ZERO hits outside parked dirs + docs. The `?swanpreview` mechanism: remove handling for removed
   keys; if nothing else uses it, delete `previewFlags.ts` and its board hook-in.
3. Launch Control shrink: remove the 7 design flags from the seed/registry, `envBaseline()`, and the board UI
   list. `postSaveHandoff`, `dashboardV2Finance`, `prismCapture` keep working IDENTICALLY (run their tests).
4. **Registry migration (single override-clearing mechanism — Kimi H4):** one reversible migration deletes the
   7 removed flags' `flags` rows + any of their `flag_overrides` rows. **Board clearing in S4 is NOT used for
   these** (the board no longer lists them after S1.3); the migration is the one mechanism, and it must be a
   safe no-op when rows are already absent. Pre-check (Kimi H9): confirm `flag_audit` has NO FK to `flags`
   (read the two migration files) so audit rows survive; never touch `flag_audit`.
5. Tests: replace gate tests with a regression asserting the 7 routes render original components AND
   (per S0.5's fetch-origin finding — Kimi H6): if per-surface hooks → assert these page modules have no
   import path to any flag-resolution module; if a global provider → assert the provider serves ONLY the
   3 surviving feature flags and the 7 routes never consume it.
6. If `prismCapture`'s mount lived in HomeGate: remount it identically on the original Home route (feature
   preserved, appearance unchanged).

### S2 — Design Studio: the one preview home (Kimi I1-I3)
1. Mount `DesignPlaygroundLayout` UNCONDITIONALLY for admins at `/dashboard/admin/design-playground`
   (admin-guarded dashboard route; delete the `VITE_DESIGN_PLAYGROUND` build gate at `main-routes.tsx:357,913`).
   Nav label: **"Design Studio"** (one name everywhere — Kimi H11) in the live `WORKSPACE_CONFIG` admin
   sidebar. Fix the layout's back-buttons to the new path.
2. **Manifest registry:** new `frontend/src/pages/DesignPlayground/playgroundRegistry.ts` —
   `{ id, title, lazyImport, status: 'parked'|'iterating'|'approved', sourceRoute, mobbinRefs: string[], notes }`.
   Register every parked surface from S0.5. Promotion path documented in a playground README: promote =
   move the import from registry to the real route in a normal commit (Sean's law #2).
3. **Preview frame (wiring only, zero styling):** "PREVIEW — not live" banner + desktop/tablet/mobile viewport
   switcher. Lazy-load registry entries ONLY inside the playground; prove via build-manifest diff that vNext
   chunks left the public pages' graph (record the KB delta in the receipts bundle — Kimi I4).
4. **Parked inventory (Kimi I2):** `docs/ai-workflow/AI-HANDOFF/PARKED-VNEXT-INVENTORY-2026-07-21.md` — per
   surface: screenshot, what was built, why parked (pre-Mobbin), reusable primitives/tokens/copy worth
   harvesting in the Mobbin pass. Link it from the tracker.

### S3 — Admin nav parity: harden what let the 404s happen
1. Extend `sidebarRouteParity.contract.test.ts` to assert EVERY admin `WORKSPACE_CONFIG` prefix has a mounted
   route (same rigor as trainer/client), including the new design-playground entry.
2. Fix any live-prod 404 from Sean's S0.4 click-pass with its receipt (route remount or nav retarget —
   smallest diff wins).
3. Quarantine dead legacy `ADMIN_DASHBOARD_TABS` (`dashboard-tabs.ts:83`): grep consumers first — its only
   consumers are tests, so UPDATE those tests (don't break them — Kimi H11), then delete the dead config, or
   if a non-test consumer surfaces, stop and record instead.
4. **Whitelist contract test (Kimi §3 — the teeth):** new test asserting the Launch Control registry contains
   EXACTLY `{postSaveHandoff, dashboardV2Finance, prismCapture}` — any future design flag fails CI with the
   message "Design surfaces never gate (Sean's law, 2026-07-21). Use the Design Studio."

### S4 — Runtime cleanup (Sean's 5-minute checklist — agent writes it, Sean executes)
1. Render dashboard → backend service env: UNSET `HOME_VNEXT_ENABLED, ABOUT_VNEXT_ENABLED,
   CONTACT_VNEXT_ENABLED, VIDEO_VNEXT_ENABLED, STORE_V4_ENABLED, GALLERY_VNEXT_ENABLED, DASHBOARD_V2_ENABLED`
   (if present; they may already be unset). KEEP `DASHBOARD_V2_FINANCE, PRISM_CAPTURE_ENABLED,
   ENABLE_POST_SAVE_HANDOFF` as valid feature keys.
2. Render frontend build env: confirm NO `VITE_*_VNEXT` and no `VITE_DESIGN_PLAYGROUND` keys exist.
3. (Overrides are handled by the S1.4 migration — nothing to do on the board.)

### S5 — Docs, gates, push, verify
1. Update with frontmatter (`decision/status/supersedes`): the TRACKER (status: PARKED for Mobbin re-ground;
   de-gated 2026-07-21; dashboardV2Finance dormancy verdict), FLAG-FLIP-RUNBOOK (feature flags only),
   FLAG-LIFECYCLE-DOCTRINE (add "design surfaces never gate; features may — CI-enforced").
2. Full gates + the §5.4 pre-push backend audit + hostile self-review (§5.5). **Rollback story (Kimi H9)
   stated in the PR/commit body:** revert = `git revert` the batch; the migration is backward-compatible
   (older code + migrated DB still fail closed to originals because env keys are unset).
3. ONE batch push with Sean's explicit go.
4. Post-deploy: 6 public URLs render originals; Sean repeats the sidebar click-pass (zero dead clicks);
   `/api/config/public-flags` returns only the 3 feature flags; proof-card flag flips on the board and the
   card still renders after a logged workout; Design Studio lists the parked surfaces; receipts bundle
   completed (before/after JSON + build-manifest KB delta + click-pass logs).
5. Hermes memo + phase audit record (§5.6).

## 3 · Hard guardrails
- No destructive DB ops outside the S1.4 reversible migration; `flag_audit` is append-only and untouchable.
- StoreV3 checkout/cart/Stripe: read receipts before touching anything within two imports of them.
- If any S0 finding contradicts §1, STOP that slice, re-verify, record the delta — facts beat this prompt.
- This is wiring removal, not redesign: if you are styling anything beyond the preview frame's banner, stop.
- Sean-gated moments: the S0.4 + S5.4 click-passes, the S4 env checklist, and the batch push.

## 4 · Definition of done
Sean edits `HomePage.V4`, pushes, and the change IS the live site — no env var, no flag board. Admin sidebar
has zero dead clicks, proven by the extended parity test AND Sean's live click-pass. The parked vNext work is
browsable ONLY in the admin **Design Studio** (with manifest registry + parked inventory ready for the Mobbin
redesign). Launch Control lists exactly 3 feature flags, CI-enforced. The VITE_ fail-open trap is structurally
gone (grep returns zero). Receipts bundle complete.

## 5 · Protocol appendix (inlined — Kimi H1; these replace external rule references)
1. **Batch push:** commit per slice locally; push ONCE at the end after Sean's go. Never push per slice.
2. **Canonical Surface Receipt** (before changing any UI/route you believe is broken): a markdown note in the
   receipts bundle with file:line for (a) the route mount, (b) the mounted component (JSX usage, not lazy
   declaration), (c) the consumer hook/service, (d) frontend API path literal, (e) backend route match. No
   code before the receipt exists.
3. **Confidence tags** on non-trivial claims in your closeout: `[VERIFIED]` (you ran/read it this session),
   `[LIKELY]`, `[HYPOTHESIS]`, `[UNKNOWN]`. "Fixed" requires naming the exact verified path or test.
4. **Pre-push backend audit:** `git ls-files --others --exclude-standard backend/` AND
   `git diff --name-only HEAD backend/` must both be empty of surprises before the push (untracked or
   uncommitted backend files crash the Render deploy at boot).
5. **Hostile self-review before reporting done:** re-attack your own slice (stale state, wrong route/env,
   auth mismatches, mobile overflow, happy-path-only logic); fix findings; only then report, blockers first.
6. **Phase audit record:** at the end, one self-contained markdown in `docs/ai-workflow/AI-HANDOFF/`
   (files touched, flow, security posture, limitations, rollback, future review hooks, sign-off slot).
7. **Forbidden language:** "should be fixed", "safe to delete", "guaranteed". State what was verified or tag it.
8. **Secret hygiene:** never cat/grep `.env` values into output; never write credentials into docs.

---

## Kimi K3 co-review log
- **R1 (2026-07-21): SHIP-WITH-CHANGES** — 11 hostile findings (H1-H11) + 5 upgrades (I1-I5) + Launch-Control
  verdict AGREE-with-teeth (whitelist CI test). Full text: `KIMI-DEGATE-HANDOFF-REVIEW-R1-2026-07-21.md`.
- **Fable disposition:** ALL findings applied in this revision — rules inlined (§5), flag map added (§1),
  parked-set enumeration made an S0 deliverable with the 7 known dirs asserted, single override-clearing
  mechanism (S1.4 migration; S4 board step removed), dashboardV2 located + finance dependency verdict made an
  S0.5 directive, per-slice gates added, rollback + flag_audit FK check added, S1.5 criterion made
  conditional on the S0.5 fetch-origin finding, deletion scope delimited with grep-verify, S0.4 converted to
  Sean's click-pass, "Design Studio" named everywhere, proof-card/Restore paths pinned, I1-I5 + whitelist test
  adopted.
- **R2 (2026-07-21): SHIP — CO-SIGNED.** All 16 R1 items verified RESOLVED (H5 partial-by-design: the one
  unverified line is honestly deferred to S0.5 with a guardrail); no new defects; document judged
  self-contained and executable by a zero-context agent. Full text:
  `KIMI-DEGATE-HANDOFF-REVIEW-R2-2026-07-21.md`. Fable Final-Decider ratifies — **this prompt is
  execution-ready. Hand it to the executing agent verbatim.**
