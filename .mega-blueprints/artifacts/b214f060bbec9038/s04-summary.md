# S04 — library recovery UI + compact media: partial completion

**Slice:** `S04` (split into S04a / S04b to keep each increment independently verifiable)
**Contract:** `s04-architecture.md` (binding) · **Date:** 2026-09-13
**Checkout:** `tmp/worktrees/rolodex-luna-01a098de-20260913` @ `c0cbe538d`, branch `codex/rolodex-luna-01a098de`
**Status:** S04a **DONE** · S04b-1 logger **DONE** · S04b-2a plumbing **DONE** · S04b-2b Planner V1 +
Bootcamp **DONE** · S04b-2c Planner V2 **DONE** · S04b-4 S02 helper text **DONE** · S04b-5 browser
harness **DONE (11/11 PASS)**. **S04 is complete except the logger's own row thumbnails.**

Nothing committed, pushed, migrated or deployed.

---

## S04a — compact media thumbnail (H18 thumbnail portion): DONE

### Files

| File | Lines | SHA256 | Note |
|---|---|---|---|
| `frontend/src/components/WorkoutLogger/ExerciseMediaPreview.tsx` | 88 | `751e5926…c072` |  |
| `frontend/src/components/WorkoutLogger/ExerciseMediaPreview.styles.ts` | 93 | `6bc32191…da54` |  |
| `frontend/src/components/WorkoutLogger/ExerciseMediaPreview.test.tsx` | 70 | `e690d254…104f` |  |

### Behaviour

s04-architecture.md §"ExerciseMediaPreview thumbnail fallback must contain only the compact
`No demo` label, preserving accessible exercise identity and frame geometry."

- New `variant="thumbnail"` **no-media** branch renders exactly `No demo` through
  `FallbackCompactLabel`. The expanded `SwanStudios form preview` title and the
  `Demo media ready when uploaded` paragraph are **absent** from that variant.
- A `$compact` transient prop on `FallbackPreview` removes the 58×48 decorative swan
  pseudo-element, the grid gap and the 12px padding (4px instead). `MediaFrame` keeps
  `aspect-ratio: 16 / 9`, so rows cannot reflow between media states.
- Accessible identity is preserved and made *more* truthful:
  `aria-label="{name} — no demo media yet"` on `role="img"`.
- The interactive variant keeps its full guidance copy, `controls` and `playsInline`.
- No media URL changed, no demo invented, no autoplay, no photo-upload flow touched.

### RED → GREEN

**RED** (`s04a-red-media.log`, exit 1) — two genuine assertion failures against the pre-change
component:

```
× keeps the thumbnail fallback to the compact No demo label only
  TestingLibraryElementError: Unable to find an element with the text: No demo
× preserves accessible exercise identity on the compact thumbnail fallback
  Error: expect(element).toHaveAttribute("aria-label", StringMatching /no demo/i)
Test Files  1 failed (1) · Tests  2 failed | 5 passed (7)
```

**GREEN** (`s04a-green-media.log`, exit **0**) — `ExerciseMediaPreview.test.tsx` +
`NASMExerciseRolodex.mediaContract.test.ts` (the preserved media contract, which still requires
`controls`, `playsInline` and `styled.video`):

```
Test Files  2 passed (2) · Tests  12 passed (12)
```

**Consumer regression** (`s04a-green-consumers.log`, exit **0**) — `WorkoutLogger`,
`BootcampBuilder`, `Shared/SwanExercisePicker`:

```
Test Files  161 passed (161) · Tests  1030 passed (1030)
```

**Type check** (`s04a-typecheck.log`): `tsc --noEmit --pretty false` → exit **0**, no output.

### Honest gap in S04a

> **CORRECTED — see §S04b-2b "CORRECTION to an earlier S04a claim".** The compact thumbnail is
> already rendered by `WorkoutPlannerExerciseRow.tsx:113` and
> `WorkoutPlannerGuidedCandidatesPanel.tsx:89`, so H18 compact media IS user-visible on those two
> planner surfaces. What remains open is the *logger's* virtualized rows, and that requires a
> `ROW_HEIGHT` change in `NASMExerciseRolodex.helpers.ts` (currently 56, outside the declared S04
> scope) plus re-baselined react-window row tests.

The thumbnail variant is **implemented and unit-verified**. The only `ExerciseMediaPreview` call
site inside `WorkoutLogger/` is `NASMExerciseRolodexPreview.tsx:30`, which uses the default
interactive variant — so the logger's own rows still have no compact thumbnail.

---

## S04b — library recovery states

### S04b-1 — NASM logger (WorkoutLogger): DONE

| File | Lines | SHA256 | Note |
|---|---|---|---|
| `frontend/src/components/WorkoutLogger/NASMExerciseRolodex.states.tsx` | 254 | `d16cdfb6…afee` | **NEW** |
| `frontend/src/components/WorkoutLogger/NASMExerciseRolodex.list.tsx` | 119 | `908ed498…66fc` | **NEW** |
| `frontend/src/components/WorkoutLogger/NASMExerciseRolodex.tsx` | 292 | `db3b4a9e…429a` | modified |
| `frontend/src/components/WorkoutLogger/NASMExerciseRolodex.recovery.test.tsx` | 222 | `49e057c5…e562` | **NEW** |

All seven states from s04-architecture.md now render honestly, and `resolveLibraryState` is a pure,
separately testable decision function:

| State | Logger behaviour | Test | Note |
|---|---|---|---|
| `loading` | skeleton + "Loading exercise library…"; **no** no-results claim | ✓ |  |
| `error` | `role="alert"`, "Exercise library unavailable" + real error + Try again | ✓ |  |
| `empty-catalog` | "No exercises available yet" + Retry (not the filter copy) | ✓ |  |
| `filter-empty` | "No exercises match current filters" + **Clear filters**, no retry | ✓ |  |
| `refreshing` | cached rows preserved, **no** notice, no skeleton | ✓ |  |
| `stale` | cached rows preserved **and** "Library may be out of date" + Try again | ✓ |  |
| `ready` | no notice at all | ✓ |  |
| search pending | `aria-busy`, "searching…", earlier count withheld | ✓ |  |

Also tested: retry is **disabled** while a fetch is in flight; clearing filters calls only
`setQuery('')`/`setCategory(null)` and **never** `refresh` (no mutation on retry); a hook boundary
fixture that predates the S03 `loadState` field still renders correctly.

**A real defect was caught during implementation, not after.** The first cut rendered the stale
notice *inside* the `filteredResults.length === 0` branch — so a failed refresh was hidden exactly
when it mattered, because rows existed. The recovery test failed with
`Unable to find an element with the text: Library may be out of date`, and the notice was moved
above the split view. This is the s04-architecture.md line *"error not hidden just because rows
exist"* failing in practice.

**A real line-cap contract was also caught.** `NASMExerciseRolodex.touchTarget.test.ts:24` measures
`source.split(/\r?\n/).length`; the component was **325** against the 300 cap (`Get-Content |
Measure-Object -Line` under-reported at 296 and would have shipped the violation). Two modules were
extracted — `NASMExerciseRolodex.states.tsx` (state resolution + notice/status UI) and
`NASMExerciseRolodex.list.tsx` (virtualized row + keyboard navigation) — bringing the component to
**292**. The row deliberately still closes over results instead of moving them into react-window
`rowProps`, because the preserved test doubles call `rowComponent({ index, style })` with no props
and that refactor would have broken them.

### RED → GREEN (S04b-1)

- **RED (implied by the defect above):** `s04b-red-logger.log` — 1 failed / 8 passed, the stale
  notice unreachable. Fixed, then re-run.
- **GREEN:** `s04b-green-logger-final.log` exit **0** — 14/14 across the recovery suite and the
  line-cap/touch-target contract.
- **Consumer regression:** `s04b-green-consumers3.log` exit **0** — 249 files / **1488 tests**.
- **Types:** `s04b-typecheck3.log` — `tsc --noEmit` exit **0**.
- **Build:** `s04b-build.log` exit **0**; the worker asset is still emitted at
  `dist/assets/exerciseSearch.worker-Cb3M7ffx.js` (identical hash `ffe4111c…e488` — the build is
  deterministic across both sessions).

### Scope disclosure (second added file)

`NASMExerciseRolodex.states.tsx` and `NASMExerciseRolodex.list.tsx` are **new files outside** the
declared S04 source scope. They exist because a preserved contract test enforces the 300-line cap on
the component, and the S04 recovery UI cannot fit inside the remaining budget. Both were created
rather than violating the cap. `NASMExerciseRolodex.states.tsx` also holds the shared library copy
constants so the recovery tests assert against them instead of duplicating strings.

---

### S04b-2b — Planner V1 + Bootcamp rendering: DONE

| File | Lines | SHA256 | Note |
|---|---|---|---|
| `…/admin-workout-planner/WorkoutPlannerRolodexPanel.tsx` | 275 | `96a8577a…a4f9` |  |
| `…/admin-workout-planner/WorkoutPlannerPageLayout.tsx` | 299 | `05457227…9338` |  |
| `…/admin-workout-planner/WorkoutPlannerRolodex.recovery.test.tsx` | 180 | `3c704ebf…3355` | **NEW** |
| `frontend/src/components/BootcampBuilder/ExerciseRolodexPanel.tsx` | 288 | `833a2a07…a81e` |  |
| `frontend/src/components/BootcampBuilder/ExerciseRolodexList.tsx` | 212 | `b2ec9734…08f0` |  |
| `frontend/src/components/BootcampBuilder/ExerciseRolodexPanel.filters.tsx` | 86 | `c54a65f0…3e` | **NEW** |
| `frontend/src/components/BootcampBuilder/ExerciseRolodexList.recovery.test.tsx` | 145 | `ed7a8e63…a192` | **NEW** |

Planner V1 and the Bootcamp library now distinguish all seven states through the same shared
`resolveLibraryState`. Two real defects were fixed, both of which the old code got wrong:

1. **Bootcamp claimed "No exercises match your filters." for every empty case** — including a failed
   library load and a genuinely empty catalog. It now separates `filter-empty` (filters are the
   cause, offer Clear filters) from `error` (`role="alert"` + Try again) and `empty-catalog`
   (Try again), and the retry path never calls `onAddExercise`.
2. **Both surfaces replaced cached rows with skeletons whenever a refetch was in flight.**
   `exercisesLoading`/`isLoading` now only produces skeletons when there is no catalog; a cached
   refresh keeps the rows on screen.

A third defect was caught by the new test itself: Planner V1 rendered **two identically-labelled
"Clear filters" buttons** at once (status rail + filter-empty notice). The failure was
`Found multiple elements with the role "button" and name "Clear Exercise Rolodex filters"`. The rail
button is now suppressed while the filter-empty notice owns that action.

Two line-cap extractions were forced by preserved contract tests, not by preference:
`WorkoutPlannerRolodexPanel.tsx` reached 314 and `ExerciseRolodexPanel.tsx` reached 314; the
Bootcamp filter section moved to `ExerciseRolodexPanel.filters.tsx` (86 lines) and the planner panel
was rewritten to fit, landing at 275 and 288.

`ExerciseRolodexList.tsx` was **admitted** to scope, as s04-architecture.md allows only when source
changes are genuinely necessary. They were: the panel had no line-cap headroom and the child owns
loading/empty rendering. Its recovery test is named `ExerciseRolodexList.recovery.test.tsx` rather
than the architecture's suggested `ExerciseRolodexPanel.recovery.test.tsx`, because that is where
the contract is actually rendered; the panel's composition and line-cap contract remains locked by
the preserved `ExerciseRolodexPanel.composition.test.ts`.

### RED → GREEN (S04b-2b)

- `s04b2b-green-v1.log` → `s04b2b-green-v1c.log`: 1 failed / 8 passed (the duplicate Clear-filters
  button), then **9/9 exit 0**.
- `s04b2b-green-bootcamp.log`: **9/9 exit 0**, first run.
- `s04b2b-green-final.log` exit **0** — 251 files / **1506 tests**.
- `s04b2b-typecheck-final.log` — `tsc --noEmit` exit **0**.
- `s04b2b-build.log` exit **0**, ~22.6s; worker asset unchanged at `ffe4111c…e488`.

### CORRECTION to an earlier S04a claim

The S04a section below and the S04b-1 section both said the compact thumbnail was "rendered
nowhere". **That was wrong**, and it was wrong for a specific reason: the sibling sweep was scoped
to `WorkoutLogger/` only, so it missed two live call sites in the planner.

`WorkoutPlannerExerciseRow.tsx:113` and `WorkoutPlannerGuidedCandidatesPanel.tsx:89` already render
`<ExerciseMediaPreview … variant="thumbnail" />` — inside `PlannerMediaThumb`, a
`clamp(72px, 24%, 96px)` media column. So S04a's change made H18 compact media **live on two
planner surfaces immediately**: those slots now show a single `No demo` label instead of the
3-element branded fallback with the 58×48 pseudo-element swan glyph and the two-line paragraph,
which was never going to fit a 72px column. **H18 media IS user-visible.** The remaining gap is only
that the *logger's* virtualized rows still have no thumbnail column.

---

### S04b-2c — Planner V2 recovery: DONE

| File | Lines | SHA256 | Note |
|---|---|---|---|
| `…/admin-workout-planner/WorkoutPlannerRolodexPanelV2.tsx` | 261 | `00d2cb97…b9d8` |  |
| `…/admin-workout-planner/WorkoutPlannerRolodexPanelV2.styles.ts` | 81 | `35112059…c60b` | **NEW** |
| `…/admin-workout-planner/WorkoutPlannerRolodexPanelV2.recovery.test.tsx` | 196 | `75ede0e7…dfd9` | **NEW** |

V2 reuses the shared `PlannerError` / `PlannerEmpty` / `PlannerSkeleton` exactly as
s04-architecture.md requires. Its 62 lines of local styled-components moved to
`WorkoutPlannerRolodexPanelV2.styles.ts` to make room inside the 300-line cap (278 → 261).

**A real inversion bug was caught by the new test.** The first cut rendered
`libraryState === 'stale' ? null : <List/>` — i.e. it *hid the cached rows* precisely in the state
whose whole purpose is to keep them. The test failed with
`Unable to find an element by: [data-testid="planner-rolodex-v2-list"]`. `stale` now deliberately
falls through to the list, with the notice rendered above it.

**Disclosed deviation:** `PlannerStateViews` has no disabled variant for its action button, so V2
withholds `onAction` entirely while a fetch is in flight rather than rendering a disabled control.
That satisfies the "retry must not double-fire" requirement without editing a file outside S04
scope, and is asserted by a test.

### S04b-4 — S02 intensity helper text presentation: DONE

| File | Lines | SHA256 | Note |
|---|---|---|---|
| `…/admin-workout-planner/WorkoutPlannerBuilderPanel.exerciseRows.tsx` | 260 | `9f3e28a7…9436` |  |
| `…/admin-workout-planner/WorkoutPlannerPage.styles.ts` | 254 | `909e646f…be0eb` |  |
| `…/admin-workout-planner/WorkoutPlannerBuilderPanel.prescription.test.tsx` | 157 | `bc8f3679…6195` |  |

- `ParamField` gained `min-width: 0`; a new `ParamFieldWide` claims the **full row** in the
  four-column mobile grid, so the fifth (Intensity) field no longer wraps into a half-width orphan.
- A new `ParamHelper` gives the saved prescription text **its own line** with
  `overflow-wrap: anywhere` / `word-break: break-word`, and the input is now associated with it via
  `aria-describedby` (id `intensity-help-<rowId>`), which it previously was not.
- The saved text is rendered verbatim. Asserted with a long unsupported value
  (`70-80% 1RM for the first three sets, then RPE 8 with a 3-1-1 tempo on the final set`), an ordinary
  range, the blank case and a deliberate numeric value — and the input stops being described once a
  number replaces the text.
- The four preserved prescription tests still pass unchanged, so the codec and numeric-edit
  semantics are untouched. All styling lives in `WorkoutPlannerPage.styles.ts`; no inline style.

### S04b-5 — synthetic browser acceptance harness: DONE — 11/11 PASS

| File | Lines | SHA256 | Note |
|---|---|---|---|
| `frontend/rolodex-repair.playwright.config.ts` | 45 | `ec4e88c4…a88d8` | **NEW** |
| `frontend/tests/audit/rolodex-repair.html` | 35 | `4b02065d…9e88` | **NEW** |
| `frontend/tests/audit/rolodex-repair.harness.tsx` | 181 | `85f1a311…5709` | **NEW** |
| `frontend/tests/audit/rolodex-repair.spec.ts` | 255 | `23e1ccb3…2d9b` | **NEW** |

**This discharges S03's open browser obligation.** The suite asserts the real Vite module Worker was
*requested by the browser* (`request.url().includes('exerciseSearch.worker')`) and that typed
queries actually narrow the rendered rows through it — the asset-emission proof in `s03-summary.md`
is no longer the only worker evidence.

Result (`s04b5-harness-run3.log`, exit **0**): **11 passed (13.2s)**, Chromium, fresh unauthenticated
context, loopback-only Vite dev server on port 5317, no production-auth fixtures or global setup.

| # | Acceptance | Standing | Note |
|---|---|---|---|
| 1 | real module Worker loads and drives search | PASS |  |
| 2 | initial transport failure → retry → ready | PASS |  |
| 3 | empty catalog is not reported as "no matches" | PASS |  |
| 4 | ready catalog + unmatched query → empty FILTERS, no refetch offered | PASS |  |
| 5 | failed refresh keeps the cache and discloses itself (`stale`, not an alert) | PASS |  |
| 6 | compact `No demo`, no expanded guidance | PASS |  |
| 7 | full saved intensity text rendered unclipped | PASS |  |
| 8–10 | no horizontal overflow and every visible button ≥44px at 360 / 768 / 1440 | PASS |  |
| 11 | keyboard focus visible on the recovery control | PASS |  |

Two defects were found by the harness itself, and both were real:
1. **The harness did not render at all.** `WorkoutPlannerExerciseRow` is a *named* export; the
   harness used a default import, and Vite failed at runtime with
   `does not provide an export named 'default'`. Root cause found by probing the real browser, not
   by re-reading the code.
2. **The harness's own chrome violated the audit it hosts** — the `Toggle rolodex` scaffolding button
   measured **21px** against the 44px standard. The harness CSS now floors scaffolding controls at
   44px too.

Also asserted: the harness does **not** enter the production build (`dist` contains **0**
`rolodex-repair` files after a clean `vite build`, exit 0).

**Not proven here (not claimed):** authentication, role gating, selected client, equipment profile,
persistence, generation, PDF, any deployed route, and Planner V2 specifically (V2 is unit-covered on
its real contexts but is not mounted in the harness — recorded as a gap, not papered over).

### RED → GREEN (S04b-2c/4/5)

- `s04b2c-green-v2.log` → `s04b2c-green-v2b.log`: 1 failed / 8 passed (the inverted stale branch),
  then **9/9 exit 0**.
- `s04b4-green-prescription2.log`: **9/9 exit 0** (4 preserved + 5 new).
- `s04b5-harness-run1.log` exit 1 (harness dead) → `run2.log` exit 1 (6 failed: harness chrome 21px
  + expected-503 noise) → `s04b5-harness-run3.log` exit **0, 11 passed**.
- `s04b5-green-consumers.log` exit **0** — 252 files / **1520 tests**.
- `s04b5-typecheck.log` — `tsc --noEmit` exit **0**.
- `s04b5-build.log` exit **0** (14.60s).

---

## S04b — REMAINING (exact scope, not started)

### S04b-2a — Planner data plumbing: DONE (rendering still open)

| File | Lines | SHA256 | Note |
|---|---|---|---|
| `frontend/src/components/WorkoutLogger/exerciseSearchLibraryState.ts` | 89 | `ddc2399c…3e57` | **NEW** |
| `frontend/src/components/WorkoutLogger/NASMExerciseRolodex.states.tsx` | 206 | `350c49ff…3765` | refactored to consume the shared module |
| `…/admin-workout-planner/useWorkoutPlannerRolodexState.tsx` | 293 | `f9b253ef…3293` | threaded |

`resolveLibraryState` + `LIBRARY_COPY` were extracted into `exerciseSearchLibraryState.ts` so the
logger, Planner V1/V2 and Bootcamp all read **one** decision function instead of four copies. The
logger states module now re-exports them, so its existing test import path and `RolodexLibraryState`
alias keep working unchanged.

`useWorkoutPlannerRolodexState` now exposes, without any second fetch or new context:
`exercisesSearching`, `exercisesLoadState`, `exercisesLoadError`, `exercisesRefreshError`,
`exerciseCatalogCount`, `refreshExercises`. Existing query/filter/add/swap behaviour is untouched.

**Verified after the refactor:** logger recovery + line-cap tests 14/14 exit 0; `tsc --noEmit` exit 0;
consumer regression 249 files / **1488 tests** exit 0 (`s04b-green-refactor.log`,
`s04b-typecheck4.log`, `s04b-green-consumers4.log`).

**NOT DONE:** no Planner or Bootcamp component renders these fields yet. The plumbing is inert until
V1/V2 and the Bootcamp panel consume it.

### Source (11 files, per s04-architecture.md §"Source scope")

**Planner**
1. `frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerRolodexState.tsx`
   — thread `loadState`, `loadError`, `refreshError`, catalog count, `isSearching`, `refresh` out of
   `useExerciseSearch()`. These names already exist on the S03 hook; only the pass-through is missing.
2. `…/WorkoutPlannerRolodexPanel.tsx` (V1) — ~~recovery UI~~ **DONE (S04b-2b).**
3. `…/WorkoutPlannerRolodexPanelV2.tsx` — reuse `PlannerError` / `PlannerEmpty` / `PlannerSkeleton`.
   **STILL NOT STARTED.**
4. `…/WorkoutPlannerPageLayout.tsx` — ~~explicit prop pass-through~~ **DONE (S04b-2b).**
5. `…/WorkoutPlannerBuilderPanel.exerciseRows.tsx` — S02 intensity helper text: `min-width: 0`,
   `overflow-wrap`, helper on its own line, `aria-describedby`.
6. `…/WorkoutPlannerPage.styles.ts` — the field/help-text styles (styled-components, world tokens,
   **no inline style**).

**Bootcamp**

7. `frontend/src/components/BootcampBuilder/ExerciseRolodexPanel.tsx` — parent owns
   network/error/cached status.
8. `frontend/src/components/BootcampBuilder/ExerciseRolodexPanel.styles.ts`.
   > `ExerciseRolodexList.tsx` currently owns loading/empty rendering. Only admit that child file if
   > source changes are genuinely necessary — do not expand scope because it is a dependency.

**Logger**

9. ~~`NASMExerciseRolodex.tsx` — recovery states~~ **DONE (S04b-1).**
10. ~~`ExerciseMediaPreview.tsx`~~ **DONE (S04a).**
11. ~~`ExerciseMediaPreview.styles.ts`~~ **DONE (S04a).**

**Still open in the logger:** the compact `variant="thumbnail"` is implemented, tested, and live on
two planner surfaces (see the correction in §S04b-2b), but is still not rendered by the logger's own
virtualized rows. Wiring it there requires changing `ROW_HEIGHT` in
`NASMExerciseRolodex.helpers.ts` (currently 56, outside the declared S04 scope) and re-baselining
the react-window row tests. **The logger's rows have no thumbnails yet.**

### The five consumer states every surface must distinguish

| State | Visible result and action |
|---|---|
| Initial loading | Existing skeleton/spinner + "Loading exercise library"; never a no-results claim |
| Initial error | "Exercise library unavailable" + readable error + keyboard-accessible **Try again**; never clears filters or the draft |
| Successful empty catalog | "No exercises available yet" + Retry; no suggestion that typing creates content |
| Ready, filters empty | "No exercises match current filters" + existing clear-filter/search action |
| Ready with matches | Existing virtualized rows, count, add/detail |
| Refreshing cached catalog | Preserve visible filtered rows and current query; "Updating library" |
| Refresh failed with cache | Preserve rows + "Library may be out of date" + Try again; not hidden because rows exist |
| Search pending | "Searching" status / `aria-busy`; an earlier count must not be announced as final |

Retry disabled during an active fetch. No mutation or auto-add on retry. Polite live region; an
initial actionable failure may use `alert` once, not per keystroke. 44px targets, visible focus,
wrapping, dark world tokens.

### Tests (5 files)

- `…/admin-workout-planner/WorkoutPlannerRolodex.recovery.test.tsx` (new)
- `…/admin-workout-planner/useWorkoutPlannerRolodexState.recovery.test.tsx` (new)
- `frontend/src/components/BootcampBuilder/ExerciseRolodexPanel.recovery.test.tsx` (new)
- `frontend/src/components/WorkoutLogger/NASMExerciseRolodex.recovery.test.tsx` (new)
- `frontend/src/components/WorkoutLogger/ExerciseMediaPreview.test.tsx` (update only if the row
  wiring changes its visible contract)

V2 fixtures use `PlannerDataContext.Provider` + `PlannerActionsContext.Provider` in
`plannerContexts` with minimal typed rolodex/local/pageActions data. Bootcamp fixtures use the real
panel callbacks with mocked search/equipment boundaries. NASM can reuse
`selectionBehavior`'s react-window/search fixtures.

### Browser harness (4 files, per s04-architecture.md §"Synthetic browser acceptance harness")

- `frontend/tests/audit/rolodex-repair.html`
- `frontend/tests/audit/rolodex-repair.harness.tsx`
- `frontend/tests/audit/rolodex-repair.spec.ts`
- `frontend/tests/audit/rolodex-repair.playwright.config.ts`

Loopback-only Vite dev server on an unused port; not a production route and not in the production
build entry. Separate bounded Playwright config (no production-auth fixtures or global setup).
Fresh browser context, no saved auth, synthetic catalog intercepted, all other API destinations
blocked. Capture 360/768/1440 plus canonical H18 widths. Measure horizontal overflow, retry/clear/
add reachability, long intensity-text wrapping, 44px targets and visible focus. Record console/page/
network errors.

> **S03's open browser obligation is discharged here.** s03-architecture.md requires the *mounted*
> worker journey; S03 only proved the asset is emitted. The harness must exercise the real hook and
> the emitted worker, then a controlled transport failure and recovery.


---

## Round 166 update - the last S04 remainder is now scoped to two named files

The header says "S04 is complete except the logger's own row thumbnails", and section S04b-2b already records the correction that produced it: the compact thumbnail is "implemented and unit-verified", but its only caller sat inside `PlannerMediaThumb`, so the LOGGER's virtualized rows still have no thumbnail column. This note narrows that sentence to the files it actually means, so the next slice does not have to rediscover them.

**The variant exists and is tested.** `src/components/WorkoutLogger/ExerciseMediaPreview.tsx` (98 lines) with `src/components/WorkoutLogger/ExerciseMediaPreview.test.tsx` (87 lines). It is worth noting WHERE it lives: inside the WorkoutLogger directory, while the logger's own rows do not use it.

**Current callers**, found by searching every `.tsx` under `src/`: `BootcampBuilder/ExerciseRolodexList.tsx`, `admin-workout-planner/WorkoutPlannerExerciseRow.tsx`, `admin-workout-planner/WorkoutPlannerGuidedCandidatesPanel.tsx`, `Shared/SwanExercisePicker/SwanExercisePickerList.tsx`, `Shared/SwanExercisePicker/SwanExercisePickerPreview.tsx`, and `WorkoutLogger/NASMExerciseRolodexPreview.tsx`. The last is a PREVIEW panel, not a row - which is exactly why the rows still lack the column while the component looks well adopted.

**The two rows that need it:** `src/components/WorkoutLogger/RolodexRecentRow.tsx` (41 lines) and `src/components/WorkoutLogger/NASMExerciseRolodex.list.tsx` (128 lines).

**NOT IMPLEMENTED, and deliberately not attempted at the end of a session.** Adding a column to a virtualized row is a layout change in a list that is already 299 lines at its parent (`NASMExerciseRolodex.tsx`), and it needs its own behavioural test plus the real frontend gates - the explicit `node --max-old-space-size=16384 ./node_modules/typescript/bin/tsc --noEmit` path, because the plain invocation heap-OOMs in this repo, and the rule-4 cap at 300 lines. Landing a UI change without running those would be the half-verified work this packet keeps catching in others.

---

## Round 168 correction - the target is ONE file, and my round-166 note named the wrong second one

Round 166's note said "the two rows that need it: `RolodexRecentRow.tsx` (41 lines) and `NASMExerciseRolodex.list.tsx` (128 lines)". Reading both files rather than inferring from their names shows the first is not a row with a media slot at all.

`RolodexRecentRow.tsx` renders a CHIP STRIP - `MiniChipRow` containing `MiniChip` buttons whose entire content is `{exercise.name}` (`:26-36`), shown only when the search box is empty. It has no media column to fill, and its chips are compact text controls; putting a thumbnail inside one would change what a chip IS rather than add a column to a row. Nothing in the S04 wording asks for that.

`NASMExerciseRolodex.list.tsx` is the actual target. Its virtualized row renders

    <ExerciseRow ...>
      <ExName>{exercise.name}</ExName>
      <ExMeta>
        <TypeBadge>{exercise.exerciseType || 'exercise'}</TypeBadge>
        {(exercise.primaryMuscles || []).slice(0, 3).join(', ')}
      </ExMeta>
    </ExerciseRow>

(`:42-57`) - a name plus a meta line, with NO media element. That is precisely the column the compact thumbnail is for, and `ExerciseMediaPreview` already lives in the same directory with a `variant?: 'interactive' | 'thumbnail'` prop (`ExerciseMediaPreview.tsx:23`), so this is an additive JSX change in one component rather than new media machinery.

So the S04 remainder is ONE file, not two. The correction is recorded because a scope note that names the wrong file costs the next slice a wrong start, and this packet has already paid that price more than once.

---

## Round 170 - the thumbnail was wired, worked, and was REVERTED because it moves three pinned assertions

The change is two lines: import `ExerciseMediaPreview` from the file beside it, and render
`<ExerciseMediaPreview exercise={exercise} variant="thumbnail" />` as the first child of `<ExerciseRow>`, before `<ExName>`. It applies cleanly, the file goes 128 to 133 lines, and the explicit type-check gate stays **exit 0 / zero errors** against the clean baseline established in round 169 (`hg450-frontend-tsc-thumbnail.log`).

It also breaks three existing tests:
`expected 'No demo' to be 'Bravo Row'`, `expected 'No demo' to be 'Charlie Squat'`, `expected 'No demo' to be 'Bravo Row'` - 3 failed, 837 passed, in `src/components/WorkoutLogger`.

**The mechanism is clear and is the thing to decide next.** `ExerciseMediaPreview`'s thumbnail variant falls back to the compact label `No demo` when an exercise has no media (`ExerciseMediaPreview.tsx:74`), and that text becomes part of the ROW's content. Three assertions expect the row's text to be the exercise name, and now the first thing the row contributes is `No demo`. So the question is not how to make the tests pass - it is whether the row's accessible text SHOULD include a decorative placeholder. My reading is that it should not: the row's name is the exercise name, and a thumbnail that carries no information without media is decoration. But that is a design call with two defensible answers (mark the thumbnail decorative for assistive tech, or suppress the fallback label in row context), it touches a component shared by six other callers, and it deserves its own test rather than a rushed one.

**Reverted exactly, and proven so rather than asserted:** `git diff --numstat HEAD -- frontend/src/components/WorkoutLogger/NASMExerciseRolodex.list.tsx` is EMPTY, the file is back to 128 lines, and the directory is **840 passed / 124 files** again. No source differs from HEAD, so the round-169 tsc baseline and every gate log remain valid on the unchanged bytes.

This is the same discipline as round 144 (H19 clause 1) and round 150 (clause 3): a working change that moves a pinned expectation is reverted and understood rather than landed and explained away.

---

## Round 177 - the three failing assertions are LOCATED, and the design answer follows from them

Round 176 said the next step was to read the failures' file and line out of the suite output rather than guess. Done. The three failures are in **`src/components/WorkoutLogger/NASMExerciseRolodex.previewHighlightSync.test.tsx`**, in the test *"preview may suggest; only a CHOICE may be committed (F7) > agrees once a row is explicitly chosen"*, failing with `expected 'No demo' to be 'Bravo Row'`.

**What that tells us:** the assertions compare the ROW's whole text against the exercise name. They are a proxy for "the highlighted/chosen row is the one I think it is", and the row now legitimately contains a media element whose no-media placeholder is `No demo`, so the first text the row contributes is no longer the name.

**The design answer, from that:** the right repair is TWO things, not one.

1. **Mark the thumbnail decorative in row context** (`aria-hidden="true"` on it). The row carries `role="option"`, and its accessible name should be the exercise name - not "No demo Bravo Row ...". A screen reader announcing a placeholder label before every exercise is a real defect, so this half is a genuine improvement rather than a test convenience.
2. **Scope the three assertions to the name element** rather than the whole row. The row's textContent now includes a placeholder by design, so the assertions are measuring something they never meant to measure. Scoping them to `ExName` keeps exactly the behaviour they were written to verify - that choosing a row selects THAT exercise - without weakening it.

This is worth stating as a principle because the alternative (editing the assertions alone, or suppressing the whole fallback in row context) would each leave one of the two problems standing: the first ships a worse accessible name, the second hides a placeholder a sighted user still needs to see.

**The change is reverted and the tree is clean** - `git diff --numstat HEAD` on the file is EMPTY after the attempt. Nothing is left red.