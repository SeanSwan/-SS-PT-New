---
status: WAITING_FOR_MANUAL_FABLE_VERDICT
date: 2026-07-21
project: SwanStudios / SS-PT
branch: codex/degate-design-overhaul-20260721
worktree: C:/tmp/sspt-degate-design-20260721
baseline: eb4bbdd63794d0d842f5e5c107254f8013544367
committed_head: 42fb7f5754a9d2330b5e8549985bd969cd5e5012
production_mutated: false
linear_primary: SWA-30
linear_follow_on: SWA-31
---

# Master Continuation Handoff — Design De-gating S5 to Production

This is the zero-context continuation report and execution prompt for the next authorized AI agent. It is
written for defensive maintenance of a personal-training website. It contains no credentials, environment
values, production records, customer data, or instructions to bypass authentication. In this document,
“hostile review” means a defensive failure-mode review of code and authorized test surfaces.

## Plain-English Summary

Sean rejected the redesign-gating workflow, not the original SwanStudios website. The active branch removes
all design-surface flags so the original Home, Store, About, Contact, Video, Gallery, and dashboard surfaces
render directly again. The seven rejected redesigns remain available to an authorized administrator as
read-only previews inside Design Studio. Launch Control is permanently narrowed to three real feature controls.

S0 through S4 are committed locally. S5 contains verified repairs and release documentation but is intentionally
uncommitted. Nothing from this branch has been pushed or deployed, and Render configuration and production data
have not been changed.

The only current release blocker is Sean's manual Fable subscription verdict. The paste-ready Fable prompt is:

`docs/receipts/de-gate-2026-07-21/S5-final-decider-packet.md`

Do not substitute a new design opinion or a new architecture for that packet. After Sean returns Fable's full
verdict, validate every finding against the current worktree, repair confirmed defects test-first, and continue
the defensive review loop until two consecutive fresh rounds find nothing fixable. Only then may the approved
batch be committed, pushed to `main`, monitored through Render, and verified live.

Linear is part of the release record:

- `SWA-30` is High / In Progress and owns the de-gate release. It contains slice and hostile-repair evidence.
- `SWA-31` is High / Todo and is blocked by `SWA-30`. It owns the additive SwanStudios Photography work.
- Photography runtime work must not enter this release. Its plan is already reconciled and queued.

## Technical Summary

### 1. Controlling product decision

Follow this decision exactly:

1. Original public and dashboard surfaces mount directly from source control.
2. Design surfaces never gate through Launch Control, Render variables, Vite variables, local storage, query
   parameters, Redux, or any other runtime switch.
3. Rejected redesigns remain parked raw material inside the admin-only Design Studio.
4. Launch Control contains only `dashboardV2Finance`, `postSaveHandoff`, and `prismCapture`.
5. Admin navigation parity covers all 34 registered sidebar entries.
6. The seven retired design registry rows are removed through one migration. `flag_audit` is preserved.
7. Store, Gallery, auth, PRISM, workout handoff, and finance feature behavior must not be weakened.

The earlier assumption that production already showed the originals was disproved by the S0 read-only probe:
all seven design flags were enabled. This release is therefore a visible return to the original pages plus a
workflow correction. Do not repeat the stale “already dark in production” claim.

### 2. Authoritative repository state

- Repository: `C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT`
- Isolated worktree: `C:\tmp\sspt-degate-design-20260721`
- Branch: `codex/degate-design-overhaul-20260721`
- Baseline and current `origin/main`: `eb4bbdd63794d0d842f5e5c107254f8013544367`
- Committed branch head: `42fb7f5754a9d2330b5e8549985bd969cd5e5012`
- Branch state at handoff: four commits ahead, zero behind; additional S5 changes are uncommitted.
- Production state: unchanged by this branch.

Committed slices:

1. `5bb59ace1 refactor(design): remove runtime surface gates`
2. `3b4e948c3 feat(design-studio): restore admin preview workspace`
3. `1dd289c89 test(admin): enforce route and feature flag parity`
4. `42fb7f575 chore(design): retire render design variables`

Never work from the dirty shared checkout by mistake. Confirm the worktree and branch before every execution
phase. Follow `AGENTS.md`, Rule 67, and the shared coordination ledgers. Re-read `claude.lane.md` before editing,
claim exact paths in `codex.lane.md`, stage explicit paths only, and never use `git add -A`.

### 3. Completed slice ledger

#### S0 — discovery and live truth

- Read-only production route and flag probe completed.
- Corrected the stale “flags are dark” premise.
- Canonical route/flag receipt written.
- Non-destructive repository-hygiene inventory written.
- Authenticated 34-link production click-pass preserved as a post-deploy Sean gate; no blind 404 repair.

#### S1 — remove design gates

- Seven original surfaces mount directly.
- Retired runtime design keys and wrapper gates removed.
- One migration deletes the seven retired registry rows and relies on the existing override cascade.
- `flag_audit` is not deleted or rewritten.

#### S2 — restore Design Studio

- Admin Design Studio is always registered.
- Seven parked redesigns are listed by a manifest and loaded only through preview routes.
- Desktop, tablet, and mobile preview controls exist.
- Full-page preview routes remain admin-only.
- Parked previews are marked not live and mechanically read-only.

#### S3 — contracts and permanent policy

- Full admin sidebar-versus-route parity checks all 34 registered entries.
- Launch Control's exact allowlist is the three approved feature keys.
- Forbidden design keys are rejected at resolver, service, route, and public-config boundaries.
- The CI failure law is: `Design surfaces never gate (Sean's law, 2026-07-21). Use the Design Studio.`

#### S4 — Render owner checklist

- Retired environment key names are documented for removal without exposing values.
- Both frontend-building Render services are covered.
- Environment cleanup remains a post-deploy owner action; no Render mutation has occurred.

#### S5 — hostile repairs and release evidence

- Corrected Launch Control copy that falsely implied all controls were instant and no-redeploy.
- Removed four parked-preview raw mask colors through existing design-token bridges.
- Rejected retired keys before SQL on both set and clear override paths.
- Added direct-route read-only boundaries using `inert`, React capture, native capture, and a CSS fallback.
- Suppressed global Header/Footer on `/design-previews/*` so navigation cannot escape the boundary.
- Excluded preview routes from page-view analytics writes.
- Added a native capture layer for `change`, `click`, `input`, `keydown`, `pointerdown`, and `submit` after a
  real-browser matrix exposed a React synthetic `change` gap.
- Reconciled the photography attachment into a separate additive plan without changing Gallery runtime code.

### 4. Canonical mounted surfaces after this release

| URL or role | Required mounted surface |
|---|---|
| `/` | `frontend/src/pages/HomePage/components/HomePage.V4` |
| `/store` | `frontend/src/pages/shop/StoreV3` |
| `/about` | `frontend/src/pages/about/About.V4` |
| `/contact` | `frontend/src/pages/contactpage/ContactV3` |
| `/video-library` | `frontend/src/pages/VideoLibraryV3` |
| `/gallery`, `/gallery/:slug` | `frontend/src/pages/GalleryPage` |
| client/trainer/admin dashboards | `frontend/src/components/DashBoard/UniversalDashboardLayout` |
| `/dashboard/admin/design-playground` | admin Design Studio |
| `/design-previews/:id` | admin-only read-only parked preview |

Do not resurrect a public `gallery-vnext` route or merge the photography lane into Design Studio. The live
`GalleryPage` remains canonical; `gallery-vnext` remains parked.

### 5. Launch Control truth

The only approved keys are:

- `dashboardV2Finance`
- `postSaveHandoff`
- `prismCapture`

Known retained behavior that Fable must judge rather than silently “fix”:

- `postSaveHandoff` consumes database overrides end to end.
- PRISM UI consumes its override, while the PRISM POST route still reads `PRISM_CAPTURE_ENABLED`.
- Dashboard finance is dormant, and its controller still reads `DASHBOARD_V2_FINANCE`.

Do not claim universal override enforcement. Do not expand the board. A later feature may require a separately
reviewed enforcement repair, but design flags may never return.

### 6. Evidence package to read in order

1. `docs/receipts/de-gate-2026-07-21/S5-release-candidate-verification.md`
2. `docs/receipts/de-gate-2026-07-21/S5-final-decider-packet.md`
3. `docs/receipts/de-gate-2026-07-21/S0-route-and-flag-receipt.md`
4. `docs/receipts/de-gate-2026-07-21/S0-production-probe.md`
5. `docs/receipts/de-gate-2026-07-21/S1-degate-verification.md`
6. `docs/receipts/de-gate-2026-07-21/S2-design-studio-canonical-surface-receipt.md`
7. `docs/receipts/de-gate-2026-07-21/S2-design-studio-verification.md`
8. `docs/receipts/de-gate-2026-07-21/S3-admin-parity-and-whitelist.md`
9. `docs/receipts/de-gate-2026-07-21/S4-render-environment-owner-checklist.md`
10. `docs/ai-workflow/AI-HANDOFF/PARKED-VNEXT-INVENTORY-2026-07-21.md`
11. `docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-OVERHAUL-PROGRAM-TRACKER-2026-07-18.md`
12. `docs/ai-workflow/AI-HANDOFF/SWAN-PHOTOGRAPHY-CANONICAL-ADDITIVE-PLAN-2026-07-21.md`

Receipts are evidence leads, not substitutes for the current diff. Re-run their important commands before any
release claim.

### 7. Latest local verification evidence

Fresh evidence after the native-capture repair:

- Frontend focused release suite: 22 files, 83/83 tests passed.
- Design Studio source/runtime safety subset: 2 files, 6/6 tests passed.
- Backend de-gate suite: 3 files, 20/20 tests passed.
- TypeScript compiler with 12 GB heap: exit 0.
- Vite production build: exit 0; 6,707 modules transformed.
- SwanLens: 94 files free of the retired palette; 93 consumers with zero raw hex findings.
- Changed backend `.mjs` syntax checks: exit 0.
- `git diff --check origin/main`: exit 0; Windows line-ending notices only.
- Retired runtime design-key grep: zero runtime hits.
- Current changed-file secret scan including this handoff artifact: 84 files, zero findings.
- Delayed Chromium matrix: all seven direct previews plus the Studio iframe remained inert; click, input,
  change, keyboard, pointer, submit, and programmatic navigation were cancelled; URLs stayed stable; no links
  existed outside the boundary; zero write requests and zero uncaught page errors were recorded.
- The only browser request refusal was local Socket.IO at `localhost:10000` because the backend was intentionally
  not started. It is a local harness condition, not production proof.

These are local results. They do not prove Render deployment, live assets, authenticated admin navigation, or
production migration state.

### 8. Exact remaining release sequence

#### Gate A — receive and validate Fable

1. Sean pastes `S5-final-decider-packet.md` into his Fable subscription.
2. Sean returns Fable's complete, unedited verdict.
3. Do not use the Fable API, OpenRouter, or AI Village for this gate.
4. Parse every Fable finding into confirmed, disproved, or optional.
5. Verify file and line evidence against the current worktree. Fable output is review input, not automatic truth.
6. If the verdict is `REVISE`, write a failing regression first for every confirmed defect, make the smallest
   correct repair, and rerun the affected gate.
7. If the verdict is `REJECT`, stop the release and report the verified blocking reason.
8. A `SHIP` verdict authorizes final verification; it is not itself dry-loop completion.

#### Gate B — defensive dry loop

After the last repair, run two consecutive fresh hostile rounds from different vantages. A round that finds and
repairs an issue does not count as clean. Existing pre-Fable passes do not satisfy the required post-Fable
`CLEAN x2`.

Suggested vantages:

- Round N: current source closure, route/auth/allowlist/migration audit, plus focused automated gates.
- Round N+1: clean-process browser matrix across direct preview and iframe routes, roles, unusual input events,
  mobile, desktop, QHD, and 4K.

Each round must inspect security, auth, route ownership, write prevention, regressions, responsive layout,
keyboard/focus, build graph, rollback, and evidence accuracy. Record findings and repairs in the S5 receipt.

#### Gate C — drift and commit

1. Fetch `origin/main`.
2. If it moved, inspect and integrate without force. Re-run the complete gate after integration.
3. Re-read the other agent's lane and confirm no file collision.
4. Update the secret-scan/file-count evidence to include this continuation artifact.
5. Stage explicit paths only. Never use `git add -A`.
6. Commit S5 using `type(scope): description` only after Fable approval and `CLEAN x2`.
7. Before any backend push, both audits must be empty after the commit:

```powershell
git ls-files --others --exclude-standard backend/
git diff --name-only HEAD backend/
```

#### Gate D — push and Render

Sean's standing goal authorizes the final approved batch to `main` only after all preceding gates are green.

1. Use a non-force push. Never rewrite `main` history.
2. Confirm the exact pushed commit on `origin/main`.
3. Monitor `swanstudios-main` and `swanstudios-frontend` until the intended commit finishes deploying.
4. Inspect backend boot and migration logs for the exact deploy.
5. If deployment partially fails, stop environment cleanup, preserve evidence, and use a normal revert commit.

#### Gate E — owner environment checklist

Run `S4-render-environment-owner-checklist.md` after the code deploy. Remove retired variable names from both
frontend-building Render services. Never copy, reveal, log, or place environment values into a prompt. Do not
manually edit `flag_overrides` or `flag_audit`.

#### Gate F — live verification

Verify with authorized, non-destructive access:

1. `/api/health` is healthy.
2. `/api/config/public-flags` exposes exactly the three feature controls.
3. Six public URLs mount the selected original pages; Gallery list/event routes remain functional.
4. Anonymous access to Design Studio and preview routes redirects through normal auth.
5. An authorized admin sees Design Studio with exactly seven parked previews.
6. Launch Control shows exactly three controls.
7. The authenticated admin sidebar click-pass covers all 34 entries and records any route failure precisely.
8. Store, Gallery delivery/commerce, login, PRISM, workout handoff, and dashboard access smoke paths remain intact.
9. Render logs show no boot, migration, missing-import, or flag-registry error.

Do not perform offensive probing, credential testing, authentication bypass, production fuzzing, destructive
requests, or production-data mutation. Browser QA uses synthetic local accounts and intercepted APIs; production
checks use Sean's authorized session and normal product behavior only.

#### Gate G — Linear and goal closeout

1. Add the Fable verdict and repair evidence to `SWA-30`.
2. Add both clean-round ledgers, final commit, pushed ref, Render deploy state, health result, route matrix, admin
   click-pass result, and residual owner actions to `SWA-30`.
3. Keep `SWA-30` In Progress until production verification is complete.
4. Close `SWA-30` only when the intended commit is live and every mandatory live gate has evidence.
5. `SWA-31` then becomes eligible to start; do not auto-start it inside this release.
6. Begin photography only from a fresh worktree based on the approved de-gate commit and follow P0-P6 in its
   plan of record.
7. Mark the persistent Codex goal complete only after all release, live, Linear, and closeout requirements are met.

### 9. Exact verification commands

Run from `C:\tmp\sspt-degate-design-20260721` unless a command changes directory.

Frontend release suite:

```powershell
Set-Location frontend
npx vitest run src/config/previewFlags.test.ts src/routes/designSurfaceDegating.contract.test.ts src/components/WorkoutLogger/handoff/postSaveHandoffFlag.test.ts src/components/WorkoutLogger/handoff/usePostSaveHandoffFlag.test.ts src/components/WorkoutLogger/handoff/PostSaveHandoff.test.tsx src/components/WorkoutLogger/handoff/PostSaveHandoff.convergence.test.tsx src/components/marketing/PrismCapture/prismGateParity.test.ts src/pages/shop/StoreV3.pricingTrust.contract.test.tsx src/pages/shop/StoreV3.fallbackTruth.test.tsx src/pages/DesignPlayground/PreviewReadOnlyBoundary.runtime.test.tsx src/pages/DesignPlayground/DesignStudio.contract.test.ts src/pages/gallery/VIPConversionModal.authPersistence.test.ts src/pages/gallery/GallerySupportActions.truth.test.ts src/pages/gallery/GalleryReferralModal.truth.test.ts src/pages/gallery/GalleryPageVipCta.truth.test.ts src/pages/gallery/GalleryCreditCheckout.truth.test.ts src/pages/gallery/GalleryCheckoutReturnFeedback.truth.test.ts src/components/DashBoard/sidebarRouteParity.contract.test.ts src/components/DashBoard/LaunchControlPolicy.contract.test.ts src/components/DashBoard/Pages/admin-dashboard/AdminStellarSidebar.workoutFirst.test.ts src/components/DashBoard/Pages/admin-dashboard/AdminStellarSidebar.mobileNav.contract.test.ts src/utils/pageViewTrackerRules.test.ts --reporter verbose
```

Backend de-gate suite:

```powershell
Set-Location backend
npx vitest run tests/unit/degateDesignSurfacesMigration.test.mjs tests/unit/launchControlResolve.test.mjs tests/unit/launchControlServiceWhitelist.test.mjs --reporter verbose
```

TypeScript and build:

```powershell
Set-Location frontend
$env:NODE_OPTIONS='--max-old-space-size=12288'
npx tsc --noEmit --pretty false
npm run build
```

Root lint and diff checks:

```powershell
Set-Location C:\tmp\sspt-degate-design-20260721
npm run lint:swan-lens
git diff --check origin/main
git status --short --branch
git log --oneline origin/main..HEAD
```

Exact changed-file secret scan:

```powershell
$changed = @(git diff --name-only origin/main) + @(git ls-files --others --exclude-standard)
$changed = $changed | Sort-Object -Unique
bash scripts/scan-secrets.sh @changed
```

Retired runtime-key scan must return no source hits. Exit code 1 from `rg` is expected when no match exists:

```powershell
rg -n --glob '!docs/**' --glob '!backend/migrations/20260721190000-degate-design-surfaces.cjs' --glob '!**/*.test.*' 'HOME_VNEXT_ENABLED|STORE_VNEXT_ENABLED|ABOUT_VNEXT_ENABLED|CONTACT_VNEXT_ENABLED|VIDEO_VNEXT_ENABLED|GALLERY_VNEXT_ENABLED|DASHBOARD_VNEXT_ENABLED|VITE_HOME_VNEXT_ENABLED|VITE_STORE_VNEXT_ENABLED|VITE_ABOUT_VNEXT_ENABLED|VITE_CONTACT_VNEXT_ENABLED|VITE_VIDEO_VNEXT_ENABLED|VITE_GALLERY_VNEXT_ENABLED|VITE_DASHBOARD_VNEXT_ENABLED|VITE_DESIGN_PLAYGROUND|VITE_ENABLE_NEW_DASHBOARD' backend frontend scripts render.yaml package.json
```

Run `node --check` over every changed backend `.mjs` file before release. Do not narrow this to only the two
files named in an older receipt if the current diff contains more.

### 10. Rollback contract

- Do not restore the retired environment keys as a normal rollback mechanism.
- Roll code back through a reviewed revert commit; never force-push `main`.
- Migration `down` restores only registry metadata and does not invent old overrides.
- `flag_audit` remains preserved in both directions.
- If code deploy succeeds while owner environment cleanup is incomplete, stop, document the exact split state,
  and decide whether to finish cleanup or revert. Do not improvise database edits.
- If a live route fails, identify its deployed asset/handler and exact commit before changing code.

### 11. Explicit do-not-do list

- Do not redesign the original pages in this release.
- Do not implement or promote Kimi/Fable parked vNext concepts.
- Do not add a design flag, preview query switch, or hidden environment fallback.
- Do not begin photography runtime work before `SWA-30` is live-verified and closed.
- Do not copy stale gallery WIP, upgrade Archiver from stale instructions, or overwrite current route/nav files.
- Do not use Fable API, OpenRouter, or AI Village for the manual subscription gate.
- Do not use the production database for synthetic browser QA.
- Do not request or expose credentials, tokens, environment values, PII, or production records.
- Do not bypass auth or conduct aggressive security testing against production.
- Do not delete or move cleanup candidates; that requires a separate approved pass.
- Do not use `git add -A`, force push, or push before all gates are satisfied.
- Do not claim a local pass proves production behavior.

## BEGIN NEXT-AGENT EXECUTION PROMPT

You are continuing SwanStudios goal `SWA-30` from S5. Follow this master handoff as the execution contract. Do
not create a replacement design plan and do not reinterpret Fable or Kimi's parked design work into a new public
surface. Preserve Sean's controlling decision: original pages mount directly, design surfaces never gate, and
parked redesigns remain read-only inside the admin Design Studio.

Start in `C:\tmp\sspt-degate-design-20260721` on branch
`codex/degate-design-overhaul-20260721`. Confirm the baseline, current head, dirty S5 files, `origin/main` drift,
and coordination lanes before editing. Read the twelve evidence files listed above, then inspect the actual diff.

The release is blocked until Sean supplies the complete manual Fable subscription verdict generated from
`docs/receipts/de-gate-2026-07-21/S5-final-decider-packet.md`. Do not call a Fable API and do not run AI Village.
While waiting, read-only verification is permitted; commit, push, deploy, Render changes, database changes, and
photography implementation are not.

When the verdict arrives, independently validate every finding. For each confirmed defect, add a narrow failing
regression first, apply the smallest repair, and rerun the affected gates. Reject stale or incorrect findings
with file-and-command evidence. After the last repair, run defensive hostile reviews from new vantages until two
consecutive rounds are clean. Record the full round ledger; do not count a repair round as clean.

Then rerun the exact frontend, backend, TypeScript, build, lint, syntax, diff, retired-key, secret, and browser
gates. Fetch `origin/main`; integrate safely if it moved. Stage explicit files only. Commit S5 only after Fable
returns `SHIP` and the post-verdict ledger ends in `CLEAN x2`. Confirm both mandatory backend pre-push audits are
empty. Push the approved batch to `main` without force, monitor both Render services to the exact commit, complete
the owner environment checklist, and run the live route/auth/flags/admin-navigation checks.

Maintain Linear throughout. `SWA-30` stays In Progress until the intended commit is live and verified. Post the
Fable verdict, repairs, two clean rounds, commit, deploy, health, route matrix, click-pass, and remaining owner
actions. Close `SWA-30` only after production proof. Keep `SWA-31` blocked and do not begin photography runtime
work in this release.

Use only defensive, authorized testing. Never expose sensitive values or customer information. End the final
report with blockers first, then a Plain-English Summary and Technical Summary containing exact branch, commit,
push, Render, health, route, test, Linear, rollback, residual-risk, and hygiene evidence. Do not mark the goal
complete until every release and live-verification requirement is actually satisfied.

## END NEXT-AGENT EXECUTION PROMPT

## Current handoff status

`BLOCKED — manual Fable verdict not yet returned.`

No commit, push, deploy, environment cleanup, production mutation, or photography implementation is authorized
before that gate and the required post-verdict dry loop.
