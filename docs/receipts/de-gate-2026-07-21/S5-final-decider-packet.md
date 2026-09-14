---
status: READY_FOR_MANUAL_FABLE_REVIEW
date: 2026-07-21
reviewer: claude-fable-5-subscription
branch: codex/degate-design-overhaul-20260721
baseline: eb4bbdd63794d0d842f5e5c107254f8013544367
linear: SWA-30
production_mutated: false
---

# Fable Final-Decider Prompt - SwanStudios De-gate Release

Copy everything from `BEGIN FABLE PROMPT` through `END FABLE PROMPT` into the Fable subscription session.

## BEGIN FABLE PROMPT

You are the Final Decider for the SwanStudios design de-gating release. Perform a hostile, evidence-first review
of the existing implementation. Do not assume the handoff is correct, do not redesign the site, and do not push,
deploy, mutate Render, or touch production data.

### Repository and lane

- Repository: `<REPO>`
- Isolated worktree to review: `C:\tmp\sspt-degate-design-20260721`
- Branch: `codex/degate-design-overhaul-20260721`
- Baseline: `origin/main@eb4bbdd63794d0d842f5e5c107254f8013544367`
- Current committed head: `42fb7f575`
- Four local slice commits are ahead of baseline; S5 remains uncommitted.
- Linear issue: SWA-30.
- Production has not been changed by this branch.

Before reading or editing anything, follow `AGENTS.md`, Rule 67, and the lane files under
`.ai-workflow/coordination/`. Treat every existing dirty file as owned work. Review read-only first. If you decide
to repair something, claim the exact file before editing and never stage unrelated paths.

### Product decision being implemented

Sean rejected the gated redesign workflow. The release must restore normal push-to-git behavior:

1. The original Home, Store, About, Contact, Video, Gallery, and dashboard surfaces mount directly.
2. No design surface may depend on Launch Control, Render variables, Vite variables, local storage, query flags,
   or runtime feature flags.
3. The seven rejected redesigns remain available only as previews inside Admin -> Design Studio.
4. Launch Control remains available only for these three real feature controls:
   - `dashboardV2Finance`
   - `postSaveHandoff`
   - `prismCapture`
5. The full admin sidebar/route contract must cover all 34 registered entries.
6. The seven retired design registry rows are removed by one migration; `flag_audit` history remains untouched.
7. No Store V3 money-path, Gallery delivery/commerce path, auth flow, PRISM lead capture, workout post-save
   handoff, or dashboard finance enforcement may be accidentally weakened.

### Important corrected discovery

The original handoff claimed the redesign flags were dark in production. A read-only production probe disproved
that: all seven were enabled. This release is therefore a visible rollback from the rejected vNext pages to the
original pages, plus a workflow repair. Judge the code against that corrected truth.

### Implementation slices already present

- S0: read-only production probe, route/flag receipt, repo hygiene inventory, and authenticated admin click-pass
  checklist.
- S1 (`5bb59ace1`): direct original route mounts; removed seven design gates and retired runtime design keys.
- S2 (`3b4e948c3`): always-on admin Design Studio with a seven-entry manifest, viewport frame, warning that previews
  are not live, admin-only preview routes, and a direct-route read-only boundary.
- S3 (`1dd289c89`): 34/34 admin nav-route parity contract and exact three-feature Launch Control whitelist.
- S4 (`42fb7f575`): Render environment-owner checklist covering both frontend build surfaces.
- S5 working diff: truth-in-operations copy, parked-preview token cleanup, final receipts/docs, and focused
  contracts. A post-packet hostile pass found that DELETE override clearing bypassed the exact whitelist.
  The current worktree rejects retired keys before SQL on both set and clear paths, returns the DELETE rejection
  through the route, and locks both behaviors with red-green tests (targeted backend de-gate suite: 20/20).
  A subsequent hostile pass found that same-origin parked previews retained live mutation-capable controls.
  The mounted preview route now wraps every parked surface in native `inert`, capture-phase event blocking,
  and a pointer-events fallback, with a sticky in-frame `READ-ONLY PREVIEW - production actions disabled`
  notice. Source and runtime safety contracts went red first and now pass 6/6 across two files. The runtime case
  proves inline React, native target-listener, submit, and portal events cannot escape.
  A real-browser hostile pass then found that the global Header and Footer remained outside that boundary and
  could navigate away. The app layout now suppresses both chrome surfaces on `/design-previews/*`, with no
  header offset. The next browser pass found a mount-time analytics POST to `/api/dashboard/track-pageview`;
  a red-green route-rule contract now excludes all parked preview paths. The corrected Chromium pass proves
  direct and iframe roots are inert, zero links sit outside the boundary, click/submit/programmatic navigation
  stay blocked, and the recorder sees zero non-read requests.
  A delayed seven-preview matrix then found a narrower bypass: React's synthetic `onChangeCapture` did not
  cancel a programmatic native `change` from an imperatively inserted control. A RED runtime test reproduced
  the target-listener escape. The boundary now also installs native capture listeners for change, click, input,
  keydown, pointerdown, and submit. The repaired matrix passes every direct parked preview and the Studio iframe:
  click/input/change/keyboard/pointer/submit/programmatic navigation are cancelled; URLs remain stable through
  delayed observation; links stay inside the boundary; and the recorder sees zero writes and zero uncaught page
  errors. The sole network refusal is the expected local Socket.IO connection while the backend is intentionally
  absent.
  Fresh gates after all preview repairs: frontend 22 files / 83 tests, backend 3 files / 20 tests, TypeScript at
  12 GB, SwanLens, changed-module syntax checks, an 84-file secret scan, retired runtime-key grep, and the
  6,707-module Vite production build all pass.

The photography plan added during S5 is documentation only:
`docs/ai-workflow/AI-HANDOFF/SWAN-PHOTOGRAPHY-CANONICAL-ADDITIVE-PLAN-2026-07-21.md`.
It must remain queued behind SWA-30 and must not introduce photography runtime code into this release.

### Canonical components required after release

- Home -> `frontend/src/pages/HomePage/components/HomePage.V4`
- Store -> `frontend/src/pages/shop/StoreV3`
- About -> `frontend/src/pages/about/About.V4`
- Contact -> `frontend/src/pages/contactpage/ContactV3`
- Video -> `frontend/src/pages/VideoLibraryV3`
- Gallery and `/gallery/:slug` -> `frontend/src/pages/GalleryPage`
- Dashboards -> `frontend/src/components/DashBoard/UniversalDashboardLayout`
- Design Studio -> `/dashboard/admin/design-playground`

### Evidence to read first

Read these files in order:

1. `docs/receipts/de-gate-2026-07-21/S5-release-candidate-verification.md`
2. `docs/receipts/de-gate-2026-07-21/S0-route-and-flag-receipt.md`
3. `docs/receipts/de-gate-2026-07-21/S0-production-probe.md`
4. `docs/receipts/de-gate-2026-07-21/S1-degate-verification.md`
5. `docs/receipts/de-gate-2026-07-21/S2-design-studio-canonical-surface-receipt.md`
6. `docs/receipts/de-gate-2026-07-21/S2-design-studio-verification.md`
7. `docs/receipts/de-gate-2026-07-21/S3-admin-parity-and-whitelist.md`
8. `docs/receipts/de-gate-2026-07-21/S4-render-environment-owner-checklist.md`
9. `docs/ai-workflow/AI-HANDOFF/PARKED-VNEXT-INVENTORY-2026-07-21.md`
10. `docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-OVERHAUL-PROGRAM-TRACKER-2026-07-18.md`

Then inspect the real diff, not only the receipts:

```powershell
git status --short --branch
git log --oneline origin/main..HEAD
git diff --name-status origin/main
git diff --check origin/main
git diff origin/main -- frontend/src/routes/main-routes.tsx
git diff origin/main -- backend/services/launchControlResolve.mjs backend/services/launchControlService.mjs
git diff origin/main -- backend/routes/publicConfigRoutes.mjs backend/routes/adminFlagRoutes.mjs
git diff origin/main -- backend/migrations/20260721190000-degate-design-surfaces.cjs
git diff origin/main -- frontend/src/pages/DesignPlayground frontend/src/components/DashBoard frontend/src/config
git diff
```

### Hostile questions you must answer

#### A. Canonical routing and dormant-code closure

1. Prove each of the seven canonical original surfaces is mounted through real JSX, not merely imported.
2. Prove no design flag, Vite variable, local-storage override, query preview, Redux state, or wrapper gate can still
   switch a public route back to a rejected redesign.
3. Prove parked vNext modules are absent from canonical public entry closures and load only through Design Studio.
4. Check fallback imports and error boundaries for accidental vNext fallback behavior.
5. Decide whether deleting gate components/flag modules breaks any non-route consumer.

#### B. Design Studio authorization and safety

1. Prove dashboard and full-page preview routes are admin-only through the actual auth boundary.
2. Prove arbitrary preview IDs fail safely and cannot become an import/path traversal primitive.
3. Inspect the registry's dynamic imports for accidental eager loading or public bundle coupling.
4. Attack iframe isolation, nested navigation, focus recovery, keyboard behavior, reduced motion, mobile overflow,
   the persistent `PREVIEW - not live` warning, and the in-frame read-only warning.
5. Prove `PreviewReadOnlyRoot` blocks mouse, touch, keyboard, submit, input, and change paths on both the iframe
   and directly reachable preview route without relying only on CSS.
6. Enumerate mutation-capable controls in parked Contact, Store, Gallery, Home, and dashboard previews. Attack the
   boundary through React portals, native event listeners, programmatic submit/click, nested navigation, and any
   mount-time effect. Treat any path to contact, cart, checkout, vote, enhancement, donation, or crystallize writes
   as a blocker.
7. Confirm the synthetic QA intercepts every preview API call and cannot touch production.

#### C. Launch Control and migration integrity

1. Prove the whitelist is enforced at resolver, query, set, clear, service, route, and public-config boundaries.
2. Prove retired design keys are rejected before database lookup and cannot be re-created through an admin write.
3. Verify precedence and environment fallback semantics for the three retained feature controls.
4. Audit the migration up/down path, transactionality, FK/cascade effects, duplicate/partial state, and idempotence.
5. Prove `flag_audit` is never deleted or rewritten.
6. Challenge the known limitation: database overrides are fully consumed by `postSaveHandoff`; PRISM UI consumes
   its override but the POST route still reads `PRISM_CAPTURE_ENABLED`; dashboard finance is dormant and its
   controller reads `DASHBOARD_V2_FINANCE`. Decide whether this is acceptable retained behavior or a release
   blocker, and explain why.

#### D. Admin navigation parity

1. Recompute navigation IDs versus registered admin routes from the actual sources.
2. Prove all 34 entries are covered, including dynamic/redirect routes without normalizing away a real mismatch.
3. Look for declared routes with no nav entry, nav entries with no reachable route, and prefix collisions.
4. Do not claim production admin click truth from source parity; the authenticated post-deploy click-pass is a
   separate owner gate.

#### E. Regression, security, and release truth

1. Attack Store pricing/checkout, Gallery credits/VIP/referral/donation, auth, PRISM, workout handoff, and finance
   feature boundaries for collateral behavior changes.
2. Check that no secret, PII, private ID, environment value, token, or production data entered docs/tests/screens.
3. Inspect deletions for import breakage, stale docs, build graph drift, or service-worker/cache surprises.
4. Verify Render has two frontend build surfaces and the owner checklist removes retired variables from both.
5. Challenge rollback: code revert, migration down behavior, preserved audit history, and what happens if deploy
   succeeds but environment cleanup is incomplete.
6. Confirm the photography plan is additive documentation only and does not conflict with de-gating.

### Required verification

Run the smallest complete set that proves the verdict. At minimum:

- changed and regression-focused frontend tests;
- changed and regression-focused backend tests;
- `npm run lint:swan-lens`;
- frontend TypeScript using the documented 12 GB heap command if the normal script OOMs;
- frontend Vite production build;
- `node --check` for touched backend `.mjs` files;
- `git diff --check`;
- backend pre-push untracked and modified-uncommitted audits;
- exact changed-file secret scan;
- static grep proving all retired design keys and environment names have no runtime consumer;
- if local browser QA is available, anonymous redirect plus the seven Studio previews at mobile, desktop, QHD,
  and 4K widths with console/network capture.

Do not accept a receipt's claim when the current command contradicts it. Separate baseline failures from branch
regressions. If you change code, add or update the narrow regression test first and rerun the affected gate.

A SHIP verdict authorizes the builder's final repair/verification phase; it does not itself establish CLEAN x2.
After the last repair, the builder must complete two consecutive clean hostile rounds from different evidence
vantages before commit or push.

### Output contract

Return exactly these sections:

1. `VERDICT: SHIP | REVISE | REJECT`
2. `BLOCKERS` - `none` or numbered findings.
3. `FINDINGS` - each with severity, exact file:line, evidence, consequence, and smallest correct repair.
4. `FALSE OR STALE CLAIMS` - anything in the receipts/prompt disproved by current code.
5. `REQUIRED TESTS` - exact commands or missing regression cases.
6. `RELEASE SEQUENCE` - precise commit, push, Render, migration, environment cleanup, rollback, and live-probe order.
7. `RESIDUAL RISK` - what still requires Sean's authenticated production click-pass or owner action.
8. `FINAL DECIDER ATTESTATION` - state whether all mandatory gates were actually inspected and whether the branch
   is commit-gate approved.

Rules for the verdict:

- `SHIP` only if there is no uncorrected P0/P1/P2 finding and the evidence supports the release sequence.
- `REVISE` if a bounded correction or missing test is required; do not soften it into a suggestion.
- `REJECT` if the de-gating strategy itself is unsafe or cannot meet Sean's product decision.
- Label optional polish separately; optional polish does not block SHIP.
- Do not push or deploy. Sean will return your verdict to Codex, which will apply confirmed findings, run the
  two-consecutive-clean hostile loop, and only then proceed to the authorized Render release.

## END FABLE PROMPT
