# LANE 1 — WORKOUT CORE (B-PACK P0 ITEMS 1–2) — AUDIT RECORD — 2026-07-13

## 1. Phase header
- **Phase:** Lane 1 first batch — SUPER-PROMPT v2.0 §4 B-pack P0 items 1–2 (Workout Logger conversion, Workout Planner conversion, canonical naming streamline, Build-Plans audit) per §9 step 2.
- **Scope dates:** 2026-07-13 (single goal-loop session, Fable).
- **Reviewed by:** Fable in-session hostile reviews per slice + a FINAL 8-angle whole-diff review (line-scan / removed-behavior / cross-file / reuse / simplification / efficiency / altitude / conventions finder agents → verify → fix). Codex mutual hostile review REQ posted post-ship (Rule 67 R7).
- **Verdict:** SHIPPED (goal loop: slice → hostile review → recursive fix → final review → one push).

## 2. Files involved (by commit)
- `9069a3d8c` **naming registry + Build Plan route truth** — 42 files. NEW: `frontend/src/config/canonical-surface-names.ts` (99 lines, machine-readable one-name-per-surface registry) + test. Rewired: WORKSPACE_CONFIG, trainer/client sidebars, `UniversalDashboardLayout.routes.tsx` (NEW trainer `/build-plan` route), coach labels (routeContext/CommandRouteAction/commandTitle/Page/OpsLaunchpad/ConsoleDock), 7 teach-me refiner files, planner in-page titles, forge docstring + ~20 test files.
- `e275411cf` **logger conversion** — 24 files. NEW: `core/style-lens-os/v2/capability-manifest.schema.ts` (+test), `adapters/style-lens-swan/v2/{surfaceManifests,recipeResolution,surfaceRepresentationStyles}.ts` (+test), `WorkoutLogger/{WorkoutLoggerLensFrame,ExerciseSetRowComponent,ExerciseSetRowControls.styles}` (+tests). Modified: `LensPlanFrame.tsx` (optional manifest/representationStyles), `StyleLensProvider.tsx` (optional hook), `ExerciseSetRow.styles.ts` (law grid), `ExerciseCardComponent(+styles)`, `WorkoutLogger(+styles)`, header/footer hooks, `useExerciseSearch` + `NASMExerciseRolodex` (honest error state), `QuickLogMode.styles`.
- `0cf8fa05f` **planner conversion** — 8 files. NEW: `admin-workout-planner/WorkoutPlannerLensFrame.tsx` (+test). Hooks into PageLayout/CommandPanel/BuilderPanel.sections/SavedPlansSection/SavedPlanCard(+styles).
- `cf63a1bb8` **final hostile-review batch** — 41 files, 13 correctness fixes + hardening (see §11). NEW: `adapters/style-lens-swan/v2/SurfaceLensGate.tsx`, `TrainerBuildPlanRedirect`.
- `ac9942a53` merge of parallel origin/main (8 commits, ZERO file overlap, verified pre-merge).

## 3. Architecture & runtime flow
- **Naming:** `CANONICAL_SURFACES` (config) → consumed by sidebars, route registry, coach labels, teach-me refiners (labels + routes DERIVED). Registry test resolves every registry route against `roleConfigurations` (kills dead-nav-target class) + a source-tree tripwire scan fails CI on retired names ('Plan Library' outside Client Hub, 'Swan Studios Workout Planner' anywhere).
- **Build Plan:** trainer sidebar `/dashboard/trainer/build-plan` → registered route → `TrainerWorkoutForgePage`; `/workout-forge` → `TrainerBuildPlanRedirect` (search-preserving Navigate) — single live URL.
- **Lens rollout:** committed appearance profile → `useOptionalStyleLensAppearance` → `resolveRecipeForStyleLens` (v2 ids only; every production v1 id → null) → `SurfaceLensGate` (validates manifest at runtime, fail-closed) → `LensPlanFrame` (recipe **nullable** — frame stays mounted, so lens switches never remount the surface) → inline `--world-*` vars + `data-lens2-*` attrs → `surfaceRepresentationStyles` (card-level only) + token seams (radii/accent) with host-value fallbacks. Logger + planner publish `SurfaceCapabilityManifest`s sharing one slot/template vocabulary (Golden Pair compiles on both; chart slot degrades).
- **Logger writes unchanged:** all four mounts → shared `WorkoutLogger` → `POST /api/workout-forms` (shared-write-path law verified, receipts in the slice plan doc).

## 4. Security logic & posture
- **No auth/billing/PII surface touched.** Rule 42 backend audit: both checks EMPTY every commit. Secret scan: 0 hits over the full 3,489-line final diff.
- **Fail-closed lens chain (3 layers):** unknown styleLensId → null; invalid manifest → null (runtime `validateSurfaceCapabilityManifest`, forbids layout fields / raw colors / free-form versions, shares recipeV2's bounded NAME/VERSION patterns so the two validators can never disagree); recipe compile failure → visible receipt + host defaults. WHAT it blocks: a hand-edited manifest or hostile recipe restyling critical UI. HOW it breaks if implemented wrong: adding lens2 class hooks to law-grid/critical-action elements — the set-row law grid is deliberately NOT class-hooked and the grid-law test asserts `--world-row-columns` never enters the logger styles.
- **Write-path invariants:** no new write endpoints, no changed authz. Per-set "Log" check is UI-local (rest-timer trigger), never persisted.

## 5. Best practices applied
Rules 4 (all new files ≤300; two ratchet tests enforced it during review), 5/14 (blueprint headers), 6 (var(--token,#fallback); invented tokens caught+fixed to the real `--accent-primary-deep` idiom), 2 (44px+ on every new control incl. 48px Log check, 44px retry/toggle), 15/26/27/29-31 (plan doc with receipts + classification), 17/61 (per-slice hostile reviews), 20 (sibling sweeps — QuickLogMode glow-law fix), 25 (no new animation; transitions only; reduced-motion untouched), 43 (css helper on representation fragments), 46-as-amended (Fable decider; Codex REQ posted), 51 (verdicts tagged), 53/54 (wording sweeps + enumerated greps), 56 (baseline disclosures below), 58 (no DB-shape changes), 62 (workout-core-first), Dual-Button Glow law (Log check Blue→Purple; Add Exercise Purple→Cyan; QuickLog sibling fixed).

## 6. Known limitations / non-goals
- `WorkoutLogger.tsx` remains 1268 lines (ratchet <1270) — the ≤120-line B-pack budget is a deliberate deferral (full decomposition = highest-risk rewrite of the #1 client surface); this batch extracted the set-row + controls layers only.
- v2 styles are NOT yet user-selectable: production lens ids all resolve to host defaults (zero visual delta) until the catalog/A-pack exposes v2 recipe ids. This is the designed "ship behind the appearance profile" posture.
- §2b Sean-gated residuals NOT built: redemption honor-vs-refund, serve-photo signed URLs (SUPER-PROMPT §11 #1-2 still open).
- Client Hub in-page "Build Plan"/"Plan Library" chips intentionally keep their names (client-scoped sections, allowlisted in the tripwire).
- 'Plan Next Workout' action pairs left literal (action phrasing, not a surface name).
- Latent: logged-mark keys fall back to `set-{setNumber}` for sets without `loggerSetId`; all current ingress paths assign ids (verified) — flagged for the B-pack refactor.

## 7. Performance & UX
- Phone Full-Mode set rows: 8 stacked labeled cells → law grid `32px|1fr|1fr|48px` (Set#|Weight|Reps|Log), 56px row floor, secondary fields + Remove behind ONE logger-level disclosure (copy advertises everything it hides). Tap receipt: mark-set-done + rest-timer = 1 tap (was unavailable in Full Mode); detail mode = 1 toggle for ALL cards (was going to be per-card until the altitude review lifted it).
- Hot-path renders: per-keystroke card/row re-render storm eliminated (3 identity leaks fixed) — O(1) row updates.
- Honest states: failed/successless exercise-library load now shows a real error + 44px retry; narrow-desktop set table scrolls instead of clipping.
- **[UNVERIFIED at pixel level]:** no browser screenshots at 414/1440 pre-push — logger routes require authentication this session had no credentials for (Rule 47). Verified via jsdom computed-signature tests, source-contract grid locks, and 320px arithmetic. Post-deploy authenticated viewport sweep (tools/viewport-sweep + sweep-auth.json) is the follow-up QA hook.

## 8. Test coverage summary
NEW suites: `canonical-surface-names.test.ts` (registry integrity + route resolution + misroute regression lock + retired-name tripwire), `capability-manifest.schema.test.ts` (5), `surfaceManifests.test.ts` (4 — second-host compile + ≥5-axis divergence + resolution gate), `WorkoutLoggerLensFrame.test.tsx` + `WorkoutPlannerLensFrame.test.tsx` (mounted-gate + computed signatures), `ExerciseSetRowComponent.test.tsx` (log-check behavior incl. single-fire, disclosure a11y, spinbutton modes, law-grid + glow-law source contracts). Final gates: targeted battery 2,232/2,234 → all green after ratchet fixes; folder suites logger+lens 570/571 (1 = Lab 25-world interaction timeout under parallel load, passes 4/4 isolated — pre-existing flake class); planner 224/224; coach+Shared 908/908 after fixes; tsc 0 ×6; vite build ✓ ×2 (final 16.32s). Baseline disclosure (Rule 56): main carries 10 pre-existing gamification test fails (§2b.5, untouched by this batch) + the Lab parallel-flake; slice-clean verified, full-repo baseline otherwise UNVERIFIED this session.
NOT tested: live-browser auth flows (see §7), StrictMode double-render in CI (fix is by-construction; test harness renders without StrictMode).

## 9. Rollback plan
Docs-plus-frontend batch, no migrations, no env flags. Rollback = `git revert ac9942a53 cf63a1bb8 0cf8fa05f e275411cf 9069a3d8c` (or revert the merge commit range on main) + push → Render auto-deploys the revert. No DB/state cleanup needed (per-set Log state is client-local). The lens machinery is inert in production (null resolution), so reverting only the lens commits is also safe standalone.

## 10. Future review hooks
1. Run an AUTHENTICATED viewport sweep (P1-P12) over `/dashboard/client/log-workout` Full Mode — verify the law grid at 320/375/414 and the 1181-1320 scroll band on real devices.
2. When the catalog exposes v2 recipe ids (A-pack), re-verify: profile validation accepts v2 ids, SurfaceLensGate wears them, and NO remount occurs on commit (React DevTools profiler on the logger mid-workout).
3. Re-examine the retired-name tripwire allowlist when Client Hub training sections get renamed — the allowlist is directory-scoped (`workspaces/clients-team/`).
4. Verify the `exercisesRef` sync effect ordering if WorkoutLogger ever moves set state into a reducer (handleSetLogged reads the ref).
5. The `/api/workout/sessions` mount is still shadowed by `/api/workout` (routes.mjs:355-356, legacy `/workout` surface) — untouched here; needs its own arc.
6. `WorkoutLogger.tsx` decomposition toward the ≤120-line B-pack budget (extraction map: plan-load/AI-events/submit clusters).
7. `useWorkoutSession.ts` (sole-API-caller law) does not exist yet — required by the §4 architecture laws for the full conversion.
8. Confirm SurfaceLensGate's runtime manifest validation stays in place when new surfaces bind (a clone that skips validation reintroduces the fail-open gap).

## 11. Review log (chronological)
- Slice 1 self-hostile: caught 5 case-sensitive rename gaps in test regexes + 3 unenumerated coach test files + `AdminWorkoutPlansRedirect` title + `CoachConsoleDock` default fork → fixed, 166/166.
- Slice 2 self-hostile: caught 2 tsc errors (interface + cast), jsdom display:none query, `withAlpha`-glow mismatch, Rule-4 breach (311 lines → extraction), rolodex honest-state gap → fixed.
- Slice 3 self-hostile: planner folder 224/224 + tsc 0 first pass.
- FINAL 8-angle review: 40+ candidates → deduped → 13 correctness fixes + structural hardening applied in `cf63a1bb8` (findings + outcomes filed via the typed findings report; 1 candidate REFUTED on premise — display:contents single-child; 1 deferred latent documented in §6). Post-fix: 2 line-cap ratchets caught my own fixes → trimmed/relocated → all green.
- Codex mutual hostile review: REQ posted to `.ai-workflow/coordination/review-queue.md` post-ship (defense-in-depth).

## 12. Sign-off
- Shipped by the goal loop Sean initiated 2026-07-13 ("we will not move on to the next slice until all hostile reviews are fixed... only then... push"). Commits `9069a3d8c`, `e275411cf`, `0cf8fa05f`, `cf63a1bb8`, merge `ac9942a53` (+ this record) → main. Deploy verification appended to the review queue after Render flip.
- **Next action:** Lane 1 continues — B-pack P0 item 3 (Exercise/Workout Rolodex conversion) or the two §11 Sean decisions (redemption boundary, serve-photo) if answered first.

---

## 13. BATCH 2 ADDENDUM — Lane 1 P0 items 3-7 + §7b promoted (SHIPPED 2026-07-13, main `bf4ed031d..51938cc82`)

**Phase:** Lane 1 Batch 2 (same goal loop, Sean's /loop "next slices nonstop"). Verdict: SHIPPED + deploy-verified. Reviewed by: per-slice self-hostile passes + FINAL 3-agent combined-angle review (correctness/removed-behavior/cross-file + reuse/simplification/efficiency + altitude/conventions), Fable arbitrating. Codex post-ship REQ in the review queue (defense-in-depth).

### 13.1 Commits (8)
- `3225fd5f2` **Rolodex conversion (P0 #3)** — lens token seams (panel radius, highlight accent) on logger + planner rolodexes; seam locks in source-contract tests.
- `ebc1e170b` **Universal Master Schedule (P0 #4)** — ScheduleLensFrame + day-strip collection/row seams. `Views/WeekView*` deliberately UNTOUCHED (parallel GHOST-SLOTS unpushed WIP — Rule 67 lock honored).
- `aad061bc5` **Clients & Team conversion (P0 #5)** — ClientsWorkspaceLensFrame, card-grid/card-shell seams, radius token with Swan fallback.
- `abf686a43` **Onboarding ruling (§7b #1)** — receipts-first audit: opt-in wizard structure stands; the "gate holds" claim CORRECTED to "holds once the liability waiver is linked"; wizard field-culling deferred to a grill-me (Sean-taste decision, not built blind).
- `dfcffae42` **Bootcamp Creator conversion (P0 #7)** — frame composed at the error-boundary line; panel/station/title seams.
- `563ec50c9` **Victory chart bridge (P0 #6)** — `LensChartPalette` + `resolveLensChartPalette` (getComputedStyle from a host INSIDE the frame; CSS `var()` strings are unsafe in SVG presentation attrs) + `buildSeamedVictoryProps` (5 seamed groups; static exports = Swan build by construction) + `LensChartPaletteProvider`/`useSeamedVictoryProps`; sets/reps stay DATA-ONLY palette.
- `140cb404d` **FTC 2-tap cancel (§7b #2)** — ClientMembershipCard arm→confirm (8s disarm), `cancel_at_period_end` semantics, honest failure alert with retry.
- `51938cc82` **Final-review fix batch** — 11 findings fixed (see 13.3).

### 13.2 Security & data-truth posture (delta)
- **Billing surface touched (first time this lane):** `backend/routes/subscriptionRoutes.mjs` status payload adds `cancelledAt` (real model column, `models/Subscription.mjs:116` — Rule 58 checked). Read-only field exposure; no new write endpoint, no authz change. WHAT it enables: cancellation truth survives remounts (no phantom "renews" on a cancelled sub). HOW it breaks if misused: a consumer treating `cancelledAt` presence as "inactive NOW" would cut access early — the UI reads it only as "will not renew".
- **Cancel affordance scope:** `active/trial/past_due/paused` only; staff synthetic entitlements (`isAdmin`) render nothing — a fake card with a live cancel button against a non-existent Stripe sub was killed in review.
- **Fail-closed lens chain unchanged**, now spanning 6 surfaces via ONE `makeLensFrame` factory (a clone that skips runtime manifest validation can no longer drift in — hook §10.8 satisfied for this batch).
- Rule 42 both checks clean at every commit; secret scans 0 (Grep pattern sweep on the exported diff + pre-commit hook CLEAN).

### 13.3 Final-review scoreboard (11 fixed, 1 accepted residual)
Fixed: dead roster error banner (legacy fetcher swallowed → NEW `fetchClientHubClientsStrict` + `useClientHubRoster`; legacy preserved for `CoachOnboardingWorkbench.tsx:245` .then-no-catch) · missing `cancelledAt` remount truth (backend) · past_due/paused escape hatch · Victory secondary de-seamed from `--world-action` (button token, 1.3:1 hazard under Prism — secondary is Swan-FIXED by design) · palette identity bail-out (double-render kill) · isAdmin synthetic card · manifest test 2/6 → ALL `*_MANIFEST` exports + Golden Pair chart.progress lock · 6 frame clones → factory · 3 error one-offs → shared `ui/ErrorNote` (role=alert, 44px retry) · line-cap gaming → honest `useClientHubRoster` extraction (workspace 288 lines) · plan-doc waiver-gate claim honesty. Accepted residual: BootcampBuilder line-9 import cram (file pre-crams at line 24; queued for the decomposition slice).

### 13.4 Gates at ship
tsc 0 (×3 incl. post-fix) · vite build ✓ (14.51s final) · batch folders (workspaces, client-dashboard, adapters, BootcampBuilder, UniversalMasterSchedule, ui) **1245/1246** — sole fail = `NutritionTodayPanel.reviewRepeat.test.tsx`, PRE-EXISTING on merged main (parallel comms lane, zero file overlap — flagged to owner in review-queue). Baseline disclosure (Rule 56): slice-clean verified; full-repo baseline additionally carries the §8 pre-existing gamification fails, untouched.
Test-harness lessons locked into the suites: jsdom does not resolve inline custom props via getComputedStyle (resolver test stubs it); a hook effect keyed on a stable callback does not re-run on rerender (retry tests click an in-harness button on the SAME instance).

### 13.5 Deploy verification (Render, post-flip)
- `UniversalMasterSchedule.CVF2HyMc.js` live: contains batch-unique "Schedule may be out of date" (1 hit).
- `ClientProfilePage.DvjOr3QU.js` live: contains "Tap again to confirm cancel" + "cancelled and will not renew" (1 hit each).
- Backend `/health` 200 post-deploy (no boot crash from the subscriptionRoutes change; frontend chunk flip proves the same deploy cycle carried it).

### 13.6 Rollback (batch 2 only)
No migrations, no env flags. `git revert 51938cc82 140cb404d 563ec50c9 dfcffae42 abf686a43 aad061bc5 ebc1e170b 3225fd5f2` + push. The `cancelledAt` payload field is additive — reverting the frontend alone is also safe. Lens machinery remains inert in production (null resolution).

### 13.7 Future review hooks (batch-2 additions)
1. When ANY consumer starts treating `cancelledAt` as an access gate, re-audit against Stripe's `cancel_at_period_end` semantics (access runs to period end).
2. Re-challenge the Swan-fixed chart secondary when a lens legitimately wants to restyle series 2 — the fix would be a NEW dedicated chart token (`--world-chart-secondary`), never `--world-action`.
3. Migrate remaining `fetchClientHubClients` (swallowing) consumers to the strict variant once `CoachOnboardingWorkbench` gains a catch path; then delete the legacy fetcher.
4. `/progress/detailed` (NASM 14-chart page) is still un-bridged hard-coded rgba — separate slice.
5. WorkoutLogger (1268 lines) + BootcampBuilder page decompositions remain the standing structural debt.

### 13.8 Sign-off
Shipped under Sean's /loop directive 2026-07-13 ("do next slices nonstop... then we push to render"). Push `bf4ed031d..51938cc82`, deploy live-verified above. Sean-gated items NOT built (SUPER-PROMPT §11 unanswered): redemption honor-vs-refund, serve-photo signed URLs. **Next action:** Sean's §11 answers, Lane 1 P1 items, or the waiver-flow streamlining — batch 3 starts on his word.
