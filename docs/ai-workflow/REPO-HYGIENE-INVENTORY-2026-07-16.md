# Repository Hygiene Inventory - 2026-07-16

## Status and scope

- Phase: 1, non-destructive inventory.
- Trigger: whole-site pre-launch audit and requested archive pass.
- Baseline: `origin/main` commit `62ce6207f98b304c88c2195914b35f3af3aa5b58`.
- Worktree: `C:/tmp/sspt-prelaunch-audit-20260716`.
- Branch: `codex/prelaunch-audit-20260716`.
- Runtime roots in scope: `frontend/`, `backend/`, `shared/`, root scripts/configuration, and the current route tree.
- Constraint: Fallow output is candidate-generation evidence, not authorization to move a file. Framework-loaded migrations, seeders, CLI scripts, test harnesses, generated references, and dynamically loaded modules can appear unreachable to a static graph.

No file was moved, renamed, deleted, or ignored while producing this inventory.

## Evidence commands

- Root inventory: `Get-ChildItem -Force`.
- Archive map: recursive file counts and byte totals for all five canonical archive roots.
- Static graph: Fallow `2.88.3`, production unused-file scan, 92 recognized entry points.
- Candidate trace: `fallow check --trace-file <path>` for each proposed source candidate.
- Reference checks: repo-wide `rg` excluding `node_modules/`, archives, and documentation snapshots.
- Route truth: `frontend/src/App.tsx:51,112,227` and `frontend/src/routes/main-routes.tsx`.
- Build/test baseline: frontend typecheck and production build passed; frontend test inventory passed through shard 250 plus a clean resumed tail of 101 files/532 tests; backend 901 files/6,558 tests passed after the isolated test-harness repair.
- Static debt baseline: production Fallow reports 1,612 unreachable-file candidates; strict frontend ESLint reports 2,132 errors/3,044 warnings; strict backend ESLint reports 12 errors/532 warnings.

## Section A - Root directory summary

The clean isolated worktree has 36 root entries: 19 directories and 17 files.

| Class | Paths | Classification | Disposition |
| --- | --- | --- | --- |
| Runtime | `frontend/`, `backend/`, `shared/` | active runtime code | Keep |
| Tooling | `scripts/`, `tools/`, `config/`, `.githooks/`, `.github/` | active runtime/tooling code | Keep; static reachability alone is insufficient for CLI entry points |
| Agent/workflow | `.agents/`, `.ai-workflow/`, `.claude/`, `.continue/`, `.cursor/`, `.swan/` | active reference/config | Keep |
| Operating docs | `ACTIVE-INDEX.md`, `AGENTS.md`, `CLAUDE.md`, `README.md` | active reference docs | Keep |
| Package/deploy config | package files, env examples, `render.yaml`, `.fallowrc.json`, `.mcp.json` | active build/deploy config | Keep |
| Archive/QA | `archive/`, `AI-Village-Documentation/` | archive-only historical records plus active QA references | Keep in established locations |

Root clutter counts are zero for PNG/JPG screenshots, logs, temp outputs, ad hoc source files, and empty directories. The single root YAML file is the active Render blueprint.

## Section B - Existing archive folders map

| Archive root | Files | Bytes | Classification |
| --- | ---: | ---: | --- |
| `archive/` | 799 | 9,058,947 | archive-only historical records and pending-deletion manifests |
| `docs/archive/` | 26 | 137,182 | archive-only historical documentation |
| `docs/ai-workflow/archive/` | 25 | 618,087 | archive-only workflow records |
| `docs/ai-workflow/AI-HANDOFF/debate-archive/` | 12 | 332,345 | archive-only debate records |
| `AI-Village-Documentation/validation-prompts/archive/` | 440 | 6,800,853 | archive-only validation packets |

The established relocation pattern preserves original relative paths under a dated `archive/pending-deletion/YYYY-MM-DD/` folder and includes a manifest.

## Section C - QA screenshots at repo root

Count: 0.

No root screenshot relocation is proposed. Existing `.gitignore:280-283` already prevents recurring root PNG/JPG/JPEG QA dumps.

## Section D - Planning/spec files at repo root

| File | Classification | Evidence |
| --- | --- | --- |
| `ACTIVE-INDEX.md` | active reference doc | required root index |
| `AGENTS.md` | active reference doc | Codex operating contract |
| `CLAUDE.md` | active reference doc | mirrored project source of truth |
| `README.md` | active reference doc | repository overview |
| `render.yaml` | active build/deploy config | Render blueprint |

There are no ad hoc root planning YAML files or superseded root Markdown notes in this baseline.

## Section E - Log/build artifacts at repo root

Count: 0 root log files and 0 root build artifacts.

Current protections already cover `*.log`, `logs/`, backend/frontend log folders, generated reports, and root screenshots. No new root artifact pattern is warranted.

## Section F - Temp/accidental files

| Path | Classification | Evidence | Phase 2 proposal |
| --- | --- | --- | --- |
| `frontend/build-temp/` | QA artifact / temp output | 3 tracked files; no package-script or source reference found | archive candidate after final path/reference check |
| `frontend/test-fixes/` | QA artifact / temp output | 2 tracked one-off validator scripts; no package-script or source reference found | archive candidate after final path/reference check |

The files remain in place in Phase 1.

## Section G - Ad hoc Markdown notes at repo root

None. All four root Markdown files are active reference docs listed in Section D.

## Section H - Orphaned source files outside the frontend runtime root

Vite is rooted in `frontend/`; these React files are under the backend or script tree, are reported `UNREACHABLE` by file-level Fallow trace, and have no importer in the repo-wide reference check.

| Path | Classification | Additional evidence | Phase 2 proposal |
| --- | --- | --- | --- |
| `backend/Message.tsx` | orphaned candidate | frontend messaging counterpart exists; backend file imports frontend-only hooks/libraries | archive with original path preserved |
| `backend/MessageInput.tsx` | orphaned candidate | frontend messaging counterpart exists; no importer | archive with original path preserved |
| `backend/SocketContext.tsx` | orphaned candidate | canonical socket context is under `frontend/src/context/`; no importer | archive with original path preserved |
| `backend/core/NewConversationModal.tsx` | orphaned candidate | frontend messaging counterparts exist; no importer | archive with original path preserved |
| `backend/routes/ClientActivityWidget.tsx` | orphaned candidate | imports impossible backend-relative frontend paths; no importer | archive with original path preserved |
| `backend/routes/HighRiskClientsWidget.tsx` | orphaned candidate | imports impossible backend-relative frontend paths; no importer | archive with original path preserved |
| `backend/routes/TopTrainersWidget.tsx` | orphaned candidate | imports impossible backend-relative frontend paths; no importer | archive with original path preserved |
| `scripts/utilities/VIDEO-REFERENCE-EXAMPLES.jsx` | orphaned candidate | standalone JSX example, no importer or launcher reference | archive as historical code example |
| `backend/services/analytics/BusinessIntelligenceService.mjs` | orphaned candidate | no runtime importer; the mounted business-intelligence endpoint is implemented directly by `adminEnterpriseRoutes.mjs`; a regression test rejects the legacy import | archive with original path preserved |

These were the highest-confidence initial archive candidates. The 1,612-file aggregate static list is not promoted wholesale because it contains framework and tooling false positives.

### Phase 2 outcome

Sean explicitly authorized archiving confirmed-unused files in the pre-launch audit request. After a second repo-wide reference/import/route/launcher check, all nine entries above were moved beneath `archive/pending-deletion/2026-07-16/` with their original paths preserved. The archive manifest records restoration and final-deletion gates.

No ambiguous candidate from Sections F, I, or J was moved.

## Section I - Empty/test folders

No root directory is empty.

| Path | Classification | Evidence |
| --- | --- | --- |
| `tests/` | active reference doc | contains the repository test-lane README |
| `backend/eval/` | active runtime/tooling code | package scripts `eval*` launch `eval/runEval.mjs` |
| `backend/eval/coachCommandCenterGoldenScenarios.mjs` | planned/unimplemented blueprint | recently added synthetic scenarios, no current importer |
| `frontend/TestApp.tsx` + `frontend/src/routes/test-routes.tsx` | dormant QA harness | Fallow traces a closed unreachable chain; production entry uses `App.tsx` |
| `frontend/test-fixes/` | QA artifact / temp output | no launcher reference |
| `frontend/build-temp/` | QA artifact / temp output | no launcher reference |

The dormant QA harness and the unconsumed golden-scenario file require a product-intent decision before relocation because their names describe deliberate test/eval work.

## Section J - Bug-class-specific dormant/legacy-route inventory

### Canonical route receipt for this hygiene pass

1. `frontend/src/App.tsx:51` imports `main-routes`.
2. `frontend/src/App.tsx:112` creates the browser router from `MainRoutes`.
3. `frontend/src/App.tsx:227` renders `<RouterProvider router={router} />`.
4. `frontend/src/routes/main-routes.tsx:738-753` mounts `UserDashboardV3` at `/user-dashboard` and `/user-dashboard/:tab`.
5. `frontend/src/routes/main-routes.tsx:873-878` mounts `UniversalDashboardLayout` at `/dashboard/*`.

### Surface classification table

| Surface | Path/file | Label | Evidence |
| --- | --- | --- | --- |
| Application router | `App.tsx` -> `main-routes.tsx` | canonical | `App.tsx:51,112,227` |
| Role dashboards | `/dashboard/*` | canonical | mounts `<UniversalDashboardLayout />` at `main-routes.tsx:873-878` |
| User home/social hub | `/user-dashboard[/ :tab]` | canonical | mounts `<UserDashboardV3 />` at `main-routes.tsx:738-753` |
| Store aliases | `/store`, `/swanstudios-store`, `/shop` | canonical aliases | all mount `<SwanStudiosStore />` at `main-routes.tsx:496-516` |
| Retired store URLs | `/store-original`, `/store-galaxy-api`, `/store-simple`, `/galaxy-store`, category aliases | active compatibility redirects | redirect to `/store` at `main-routes.tsx:522-549` |
| Retired dashboard URLs | `/client-dashboard*`, `/trainer-dashboard/*` | active compatibility redirects | redirect to unified dashboards at `main-routes.tsx:709-730` |
| Social aliases | `/social*` | active compatibility redirects | route to User Dashboard at `main-routes.tsx:794-807` |
| Alternate route component | `frontend/src/routes/DashboardRoutes.tsx` | legacy/orphaned under current route tree | Fallow trace reports unreachable/default export unused; no importer; not consumed by `App.tsx` |
| Test route tree | `frontend/src/TestApp.tsx` -> `routes/test-routes.tsx` | dormant | closed unreachable test chain; production entry consumes `App.tsx` |
| Dashboard export copies | `frontend/src/assets/user-dashboard/dashboard-export/` | QA artifact / screenshot / temp output | reference-pack copies, not the mounted route target |

No backend API path or ORM model is changed by this hygiene artifact, so the schema cross-check and API shadow walk are not applicable to Phase 1.

## Section K - Legacy/orphaned under current route tree

The following appear unreferenced based on current Fallow trace plus repo-wide grep, but remain in place pending the Phase 2 gate:

- `frontend/src/routes/DashboardRoutes.tsx`: legacy/orphaned under current route tree.
- `frontend/TestApp.tsx` and `frontend/src/routes/test-routes.tsx`: dormant QA route tree.
- The eight source files in Section H: orphaned candidates outside any production bundle/loader.
- `frontend/build-temp/` and `frontend/test-fixes/`: QA/temp candidates.

The store, social, and retired-dashboard redirects are active compatibility code and are not cleanup candidates.

## Section L - .gitignore proposals

- Keep existing root screenshot/log/report protections unchanged.
- If `frontend/build-temp/` is confirmed to be regenerated rather than intentionally versioned, propose `/frontend/build-temp/` in the Phase 2 `.gitignore` change.
- Do not ignore `frontend/test-fixes/` until the two scripts are classified as either a retained QA tool or an archived one-off artifact.


## Section M - Phase 2 dormant frontend archive

A fresh production-only Fallow graph after the initial archive pass classified each file below as unused. Repo-wide import checks found no runtime consumer.

| Former source | Classification evidence | Canonical replacement or disposition |
| --- | --- | --- |
| `frontend/src/components/DashBoard/Pages/admin-clients/AdminClientManagementView.tsx` | dormant V1; only source-contract tests referenced it | `/dashboard/admin/client-management` mounts `ClientsWorkspace` through `UniversalDashboardLayout.routes.tsx:108` and `routeComponents.tsx:93` |
| `frontend/src/components/DashBoard/Pages/admin-client-progress/admin-client-progress-view.tsx` | dormant V1; no importer | `/dashboard/admin/client-progress-tracking` mounts V2 through `UniversalDashboardLayout.routes.tsx:113` and `routeComponents.tsx:22` |
| `frontend/src/components/DialogD/dialog-description.component.jsx` | unused and incomplete; referenced undefined runtime identifiers | archive-only historical record |
| three `ImageSlider.component.jsx` copies | all three unused; two also referenced an undefined component | archive-only duplicate examples |
| `frontend/src/components/ObjectDetection/ObjectDetection.component.jsx` | unused experimental surface with an undefined runtime identifier | archive-only historical record |
| `frontend/src/components/common/ConstructionBanner.integration.tsx` | unused integration example with invalid standalone imports/identifiers | archive-only historical record; active `ConstructionBanner.tsx` remains untouched |

All eight files were moved beneath `archive/pending-deletion/2026-07-16/` with original paths preserved. Two source-contract tests were narrowed to stop reading the archived V1 client file; no runtime assertion was weakened.

Surface rendering proof: `UniversalDashboardLayout.shellPieces.tsx:95-106` maps each registered route component into the mounted `<Route>` element. Therefore the V1 files above are not competing active surfaces.

No backend API path or ORM model changed in this archive slice, so API shadow and schema cross-check artifacts are not applicable.
Pre-flight for any future ignore rule: `git check-ignore -v`, tracked-file inventory, package-script grep, and repo-wide path/reference grep.

## Section N - Phase 2 legacy session UI archive

The production-only Fallow graph classified all files in `frontend/src/components/SessionDashboard/` and `frontend/src/components/SessionLogging/` as unused. Repo-wide search found that the two directories formed a closed dependency island with no importer from the mounted application.

The mounted admin replacement is `/dashboard/admin/admin-sessions` -> `EnhancedAdminSessionsView`, registered at `UniversalDashboardLayout.routes.tsx:125`, lazily imported at `UniversalDashboardLayout.routeComponents.tsx:20`, and rendered through `UniversalDashboardLayout.shellPieces.tsx:95-106`.

All eleven files, including the source-contract test that covered only the archived error boundary, were moved beneath `archive/pending-deletion/2026-07-16/`. The active session APIs, scheduler, workout logger, canonical admin session view, and their tests were not changed.

The shared branded-confirmation contract was narrowed by removing its two reads of the archived `SessionDashboard.tsx`; its assertions over mounted session, messaging, admin-special, moderation, NASM, and client-action surfaces remain intact.

No backend API path or ORM model changed in this archive slice, so API shadow and schema cross-check artifacts are not applicable.

## Section O - Phase 2 legacy admin-client archive

The canonical Client Hub is `ClientsWorkspace`, registered at `UniversalDashboardLayout.routes.tsx:108`, imported at `routeComponents.tsx:93`, and rendered through `shellPieces.tsx:95-106`. The fresh production Fallow graph classified the older V1 and enhanced admin-client views plus 38 supporting files as unused.

The archive pass moved 40 source files and 17 tests that covered only that dormant tree. Exact paths are recorded in `archive/pending-deletion/2026-07-16/legacy-admin-client-surface-manifest.md`.

Active sibling tests were narrowed as follows:

- `adminClientService.test.ts` no longer reads two archived legacy callers; its service behavior tests remain.
- `ExerciseAutocomplete.tokenContract.test.ts` no longer claims the archived modal is active; its token and file-cap checks remain.
- `imageUrl.siblingSweep.test.ts` no longer reads archived `CommunicationCenter.tsx`; all mounted sibling checks remain.
- `ConfirmActionDialog.windowConfirmContract.test.ts` no longer reads archived legacy client actions; mounted destructive-action checks remain.

No API route, request payload, ORM model, canonical Client Hub component, or active workout logger changed in this archive slice.

## Section P - Phase 2 readiness checklist

The current whole-site task explicitly authorizes archiving files that are confirmed unused. That authorization is bounded by these gates:

- Re-run file-level Fallow trace at the Phase 2 commit.
- Re-run repo-wide importer and path-string checks.
- Confirm no package script, build entry, migration loader, test config, or runtime glob consumes the path.
- Preserve original relative paths under `archive/pending-deletion/2026-07-16/`.
- Add an archive manifest with source path, evidence, and restoration path.
- Stage explicit paths only.
- Run typecheck, production build, backend tests, relevant frontend tests, strict scoped lint, and `git diff --check`.
- Hotspot-review the relocation diff before any release decision.

## Section Q - Phase 3 readiness checklist

Code-level cleanup beyond relocation requires:

- A canonical route or caller receipt for each runtime surface.
- Import/reference proof for every file or export removed.
- Regression tests where a behavior path changes.
- Backend route mount-order audit for any API removal.
- Sequelize schema cross-check for any model-related cleanup.
- Fresh sibling sweep for shared helpers/routes.
- Full verification gates after each bounded batch.

## Section R - Remaining limits

- Physical moves were limited to files recorded in the archive manifests; ambiguous candidates remain in place.
- It did not edit `.gitignore`.
- It did not remove redirects or compatibility aliases.
- It did not treat migrations, seeders, scripts, generated references, or static-graph output as automatic cleanup truth.
- It did not modify production data, Render configuration, or secrets.
- It did not push, merge, deploy, or append a continuity closeout.

## Section S - Open questions for Sean

No question blocks the high-confidence Section H archive batch because the current task explicitly requests archiving confirmed unused files.

Separate product-intent decisions remain for:

- Retaining or archiving the dormant `TestApp.tsx` route harness.
- Wiring or archiving `backend/eval/coachCommandCenterGoldenScenarios.mjs`.
- Retaining `frontend/components.json` plus `frontend/app/globals.css` as a future component-generator blueprint.
- Whether backward-compatible public redirects should receive an eventual sunset date; they remain active until that decision is explicit.


## Section T - Phase 2 dormant dashboard islands archive

A bounded reference walk classified 29 additional files as closed, production-graph-unused islands. Exact paths and restoration instructions are recorded in `archive/pending-deletion/2026-07-16/dormant-dashboard-islands-manifest.md`.

The archive includes the unmounted exercise command center and its three source-contract tests, the unused Dashboard barrel, a closed six-file legacy dashboard island, two superseded session modals, and three unused shell helpers. `themeSync.contract.test.ts` was narrowed only by removing assertions against the archived `AdminLayout.styles.ts`; its canonical Universal Dashboard and active surface theme assertions remain.

Canonical replacements were verified before relocation:

- Workout planning: `/dashboard/{admin|trainer}/workout-planner` -> `WorkoutPlannerPage` (`routes.tsx:144,174`; `routeComponents.tsx:64`).
- Admin sessions: `/dashboard/admin/admin-sessions` -> `EnhancedAdminSessionsView` (`routes.tsx:125`; `routeComponents.tsx:20`) -> `AdminSessionsDialogStack` -> the active new/edit dialogs.
- Admin home: `RevolutionaryAdminDashboard` is imported from `Pages/admin-dashboard/admin-dashboard-view`; the archived top-level `dashboard-view.tsx` had no importer.

Two Fallow candidates were explicitly retained after the reference walk disproved their dead-code classification: `WorkspaceContainer.tsx` is consumed by six active workspace modules, and `berryAdminConfig.ts` is consumed by `adminIntegrationHelpers.ts`.

## Section U - Disabled hooks recovery archive

`frontend/src/utils/hooksRecovery.js` was moved to the pending-deletion archive after the production graph, repo-wide reference walk, and entry-point inspection confirmed it was not imported. Its only application reference was a commented-out line in `main.jsx`; its only executable reader was a source-contract test for the dead file.

The archived script explicitly returned before an `if (false)` block that contained historical localStorage admin-bypass behavior. Archiving removes that dormant security-sensitive code from the runtime tree. The active `/emergency-admin` contract remains protected by the two surviving assertions in `emergencyAdminGate.contract.test.ts`.

This slice also rewrote the mounted Sprint Planner SSE reader from `while (true)` to the behaviorally equivalent `for (;;)`. The stream still exits only when `reader.read()` returns `done`, and the mounted route remains `/dashboard/{admin|trainer}/sprint-planner` through `UniversalDashboardLayout.routes.tsx:152,184` and `routeComponents.tsx:85`.

## Section V - Dormant frontend one-off script archive

Four root-level frontend diagnostic/fix scripts were archived after exact filename searches, package-script inspection, config/README/docs searches, and the production Fallow graph found no importer or launcher:

- `frontend/stripe-diagnostic.js`
- `frontend/test-build-fix.js`
- `frontend/test-fixes/alchemist-validation.js`
- `frontend/test-fixes/validate-runtime-fixes.js`

The active `WorkoutDayDrilldown.test.tsx` CommonJS test-local requires were replaced with static `node:fs` and `node:path` imports. No runtime component changed in this slice.

## Section W - Legacy Advanced Gamification island archive

The production graph and exact path-import sweep proved a closed 29-source-file legacy gamification island. Its one source-only determinism test was archived with it, for a 30-file batch. Exact paths appear in `archive/pending-deletion/2026-07-16/legacy-advanced-gamification-manifest.md`.

Canonical replacements are `AdvancedGamificationPage` for `/gamification` and `AdminGamificationView` for `/dashboard/admin/gamification`. The mounted Aegis HUD, Companion Pet, Ghost Mode, Job Class Selector, and safe gamification path helper were not moved. Staged Vault Decryption code was also retained because active hardening tests still import and exercise it.

No API route, request payload, backend model, or mounted gamification component changed in this slice.

## Section X - Dormant Content Studio panels archive

`SocialDistributionPanel.tsx` and `ContentStudioSettings.tsx` were archived after the canonical `ContentStudioHub.creationBoundary.test.ts` proved the mounted hub intentionally excludes both panels. The hub remains mounted at `/dashboard/admin/content` through `UniversalDashboardLayout.routes.tsx:138` and `routeComponents.tsx:62`.

The obsolete social panel referenced two frontend API paths with no backend route match. Current hub copy routes publishing and distribution work to Marketing Command Center. The settings panel's API-key endpoint still exists, but no canonical Content Studio JSX mounts the panel.

No mounted component, backend route, or model changed in this slice.

## Section Y - Dormant homepage QA harness archive

Six files were archived as a closed, unlaunched blank-page diagnostic chain: `TestApp.tsx`, `test-routes.tsx`, `test-layout.tsx`, two legacy homepage roots, and their Instagram feed dependency. No package script or frontend entry imports `TestApp.tsx`.

The canonical `/` route continues to load `HomePage.V4` with `HomePage.V3` as the explicit lazy-load fallback (`main-routes.tsx:58-61,323`). Neither canonical homepage file was moved.

No API route, model, or production route behavior changed in this slice.

## Section Z - Dormant badge gallery and skeleton copies archive

The standalone `BadgeArtGallery.tsx` had no route, importer, or dynamic-import consumer and was archived. The canonical admin badge workflow remains `/dashboard/admin/badge-creator` -> `BadgeCreatorPage` (`UniversalDashboardLayout.routes.tsx:156`; `routeComponents.tsx:89`).

Four unconsumed files under `components/SkeletonLoaders/` were also archived. The directly imported `SkeletonLoaders/ChartSkeleton.tsx`, its `CrystallineShimmer.tsx` dependency, and the separate active `components/Skeletons/` system remain in place.

No mounted component, API route, or model changed in this slice.

## Section AA - Legacy About V1 island archive

The production route mounts `About.V4` and names `About.V3` as its explicit lazy-load fallback (`main-routes.tsx:88-91,371`). Neither canonical file was moved.

A repo-wide importer and path sweep found no consumer for `About.jsx`. Its four-file dependency chain plus three orphaned sibling files formed an unmounted legacy island, so all eight files were preserved under the pending-deletion archive with their original paths.

No API route, model, or canonical About component changed in this slice.

## Section AB - Dormant FitnessStats island archive

Five unconsumed files were archived from `components/FitnessStats/`: the legacy `FitnessStats.tsx` homepage section, two sync widgets, and two unused charts. Exact path and symbol searches found no importer.

The canonical `/` surface mounts `HomePage.V4`, which renders its own `StatsSection` (`main-routes.tsx:59,310`; `HomePage.V4.tsx:28,96`). `ProgressAreaChart.tsx` was explicitly retained because `GoalProgressTrackerGoalDetails.tsx` imports it for trainer progress analytics.

No API route, model, mounted homepage component, or active trainer chart changed in this slice.

## Section AC - Dormant Chart Gallery island archive

The unmounted `ChartGallery.tsx` and `BadgeGallery.tsx` roots plus 53 showcase-only chart files/tests formed a closed 55-file island. A resolved-import graph found no incoming consumer from outside the island other than the two source-only tests archived with their components.

Active chart consumers were explicitly retained: Social profile charts, Nutrition Workspace charts, canonical progress charts, marketing chart tokens, `SafeChart`, `chartTheme`, `lensChartPalette`, `ExerciseHistoryChart`, `WorkoutHeatmapCalendar`, `GoalProgressBullet`, `MacroDonut`, and `NutritionBalanceRadar`. Exact archived paths are in `legacy-chart-gallery-manifest.md`.

No API route, model, mounted chart consumer, or retained chart dependency changed in this slice.

## Section AD - Superseded public roots and dashboard menu archive

Twelve files were archived after route receipts and exact importer searches proved they were superseded or closed: original waiver, video-library, contact, store, and homepage roots; the legacy waiver source-only test; the unused contact barrel; and the four-file `DashBoard/MenuList` island. Exact paths are in `legacy-public-roots-manifest.md`.

The canonical V2/V3/V4 route targets remain unchanged. `contactApiBase.test.ts` was narrowed only from three variants to the two variants actually named by the mounted contact route.

No API route, model, mounted public route target, or active dashboard navigation component changed in this slice.

## Section AE - Legacy social roots and orphan-island archive

The two explicitly unmounted social page roots, their source-only Coach entry contract, and eighteen unreachable Social feature files were archived. A resolved import closure retained every candidate dependency reachable from the mounted `DashboardFeedTab` roots. Exact paths are in `legacy-social-islands-manifest.md`.

The stale route comment that said the unmounted roots must stay was updated to record the completed import-closure audit. Compatibility redirects and the mounted User Dashboard route are unchanged.

No API route, model, mounted Dashboard Feed component, or retained Social dependency changed in this slice.

## Section AF - Retired full Social Feed island archive

Hotspot review found the previously retained `DashboardFeedTab` was itself explicitly unmounted by Workstream O. Its 32-source dependency closure and nine source-only tests therefore formed a second closed 42-file Social island, recorded in `retired-social-feed-island-manifest.md`.

Shared Social primitives consumed by mounted User Dashboard Home, group feeds, galleries, and current community components were excluded from the archive. The main-route comment now accurately states that Home owns live community content.

No API route, model, current User Dashboard tab, Home community component, or shared Social hook changed in this slice.

## Section AG - Dormant Homepage Design Lab archive

The unmounted `HomepageDesignLab.tsx` root and its complete 22-file cinematic prototype tree were archived after exact import, route, dashboard-tab, and launcher searches found no consumer. Exact paths are in `homepage-design-lab-manifest.md`.

Canonical `HomePage.V4`/`HomePage.V3` and the separately mounted Workout Design Lab remain unchanged.

No API route, model, mounted homepage, or mounted admin design surface changed in this slice.

## Section AH - Orphaned frontend roots and pseudo-integration components archive

Eleven unimported files were archived: two pseudo-integration UI components, three closed dashboard-root files plus their two-file wrapper, a superseded Design Playground root, two unused route helpers/fallbacks, and two unused UI primitives. Exact paths are in `orphaned-frontend-roots-manifest.md`.

The live dashboard-tabs comment was refreshed to cite the actual `main-routes.tsx` mount and `UniversalDashboardLayout.shellPieces.tsx` catch-alls instead of the archived legacy router. Active Breadcrumbs and Progress primitives were explicitly retained after their real imports were found.

No API route, model, mounted route, active dashboard shell, or consumed UI primitive changed in this slice.

## Section AI - Retired palette hotspot cleanup

Four live guard tests still embedded the exact retired Galaxy-Swan hex literals they were designed to reject, which caused the repository lint rule to flag the tests themselves. The assertions now construct the same forbidden strings from safe fragments, preserving their behavior without reintroducing full retired tokens.

The unconsumed `SwanGalaxyLuxuryButton.tsx` was archived and its dormant barrel export removed. Current Crystalline Swan buttons and the `GlowButton` barrel exports remain unchanged.

No mounted UI, API route, or model changed in this slice.

## Section AJ - Legacy nested Workout Planner archive

The production `/workout/:userId` route mounts `WorkoutDashboard.tsx`, which imports the top-level `components/WorkoutPlanner.tsx`. A second `components/WorkoutPlanner/` directory, its three old state hooks, and their source-reading contract test had no runtime consumer and were preserved under the pending-deletion archive.

The active route-mounted planner and its logic, styles, and tests were explicitly retained. Exact archived planner paths appear in `legacy-nested-workout-planner-manifest.md`.

A later mounted-provider audit proved `store/slices/workoutSlice.ts` and its sole consumer `hooks/useWorkoutProgress.ts` were unreachable: neither active reducer registry exposes `state.workout`, and the hook has zero consumers. Both files are preserved under the pending-deletion archive with exact evidence in `dormant-workout-state-island-manifest.md`.

No API route, model, mounted workout component, or canonical Redux provider changed in either slice.

## Section AK - Legacy Messaging island archive

The role dashboards mount `MessagingPage` at their `/messages` child route. `MessagingPage` renders the `components/Social/Messaging/MessagingView.tsx` implementation. The separate seven-file `components/Messaging/` tree had no runtime consumer and was preserved under the pending-deletion archive.

Two source-reading test lists were narrowed to stop reading the archived legacy conversation list. The canonical Social Messaging view and its focused tests remain active. Exact archived paths appear in `legacy-messaging-island-manifest.md`.

No API route, model, mounted messaging component, or active Social Messaging dependency changed in this slice.

## Section AL - Orphaned frontend utilities and modal prototypes archive

Twenty-three callerless files were archived from legacy admin-video, food-entry, profile-upload, wearable, progress-card, AI-modal, animation, image-resize, report-helper, and dormant toast trees. Exact symbol, import, route, barrel, and package-script searches found no runtime consumer.

Canonical nutrition, video, profile, messaging, and workout-progress surfaces remain mounted separately. The MCP retirement contract now asserts the three archived AI modal paths stay outside active source, and the live image URL sweep no longer reads the archived report preview. Exact paths appear in `orphaned-frontend-utilities-manifest.md`.

No API route, model, mounted product surface, or active shared dependency changed in this slice.

## Section AM - Dormant diagnostic and emergency scripts archive

Five tracked frontend scripts were archived after exact filename, package-script, source-import, route, config, and documentation searches found no launcher or consumer.

The two proxy scripts were duplicate browser-console diagnostics for historical host routing. The auth-reset script generated mock credentials in console instructions. The admin emergency script referenced stale endpoints and read the browser token directly. The alternate toast hook was never imported and had no mounted container.

These files remain recoverable under `archive/pending-deletion/2026-07-16/frontend/`; the global archive manifest records every original and archived path.

No package script, active route, production proxy configuration, canonical auth flow, or mounted toast provider changed in this slice.

## Section AN - Fallow-proven unreachable diagnostic and backup modules

Fallow classified three tracked modules as `UNREACHABLE`: `useCalendarData-SAFE-BACKUP.ts`, `stripeDiagnostic.ts`, and `debugHelpers.ts`. Their complete export sets were unused.

Exact filename, exported-symbol, entrypoint, package-script, route, and source-import searches found no consumer. The active `useCalendarData.ts`, Stripe checkout surfaces, API monitoring, and mounted DevTools remain unchanged.

All three files were moved to matching recoverable paths under `archive/pending-deletion/2026-07-16/frontend/`.

No package script, active calendar hook, Stripe integration, API route, model, or mounted developer tool changed in this slice.

## Section AO - Fallow-proven unreachable schedule sub-island

Fallow and resolved-import tracing classified a 23-file Universal Master Schedule analytics, hooks, fallback, bulk-creation, and alternate-integration island as unreachable. Its runtime modules were connected only to dead barrels or to one another; the source-only tests were archived with the island.

The reachable `UniversalMasterSchedule.tsx` still imports `hooks/useCalendarData.ts`, and that hook, its focused tests, schedule services, session-detail billing flow, and emergency admin schedule integration remain active. Two retained source-reading contracts were narrowed so they now inspect only canonical runtime files.

All 23 files were moved to matching recoverable paths under `archive/pending-deletion/2026-07-16/frontend/`; exact paths and classifications are in `legacy-schedule-extras-manifest.md`.

No active route, model, backend handler, canonical calendar hook, billing rule, or mounted schedule surface changed in this slice.

## Section AP - Legacy checkout-success leftovers and forgot-password hotspot

Route tracing proved that `/checkout/success` renders `components/NewCheckout/SuccessPage.tsx`. The standalone `CheckoutSuccessAnimation.jsx`, unmounted `pages/checkout/CheckoutSuccess.tsx`, and its source-only test had no runtime caller and were moved to the recoverable pending-deletion archive.

The mounted `/forgot-password` page was repaired separately: inline JSX styles and retired palette variables were replaced by a scoped Crystalline Swan style module; close and submit controls now meet the 44px floor; fields, dialog semantics, status announcements, Escape dismissal, and reduced-motion handling are explicit. The enumeration-resistant API behavior is unchanged.

Exact archived paths are in `legacy-checkout-success-manifest.md`. The canonical Genesis checkout success page, checkout API flow, auth route, password-reset handler, and User model were not modified.

No backend route, model, payment behavior, or password-reset request semantics changed in this slice.

## Section AQ - Menu-state Fast Refresh boundary and duplicate archive

Fallow classified `frontend/src/context/MenuStateContext.tsx` as unreachable with all six exports unused. The active provider was proven through `App.tsx`, and the active hooks were proven through `MainLayout.tsx`. The duplicate context was moved to its matching recoverable archive path.

The canonical hooks implementation was split into `MenuStateProvider.tsx`, `menuStateContext.ts`, and `useMenuState.ts`. App now imports the component-only provider, while existing MainLayout hook imports remain stable through the new non-JSX hook module.

No route, backend API, model, menu-state defaults, provider nesting, or consumer behavior changed in this slice.
