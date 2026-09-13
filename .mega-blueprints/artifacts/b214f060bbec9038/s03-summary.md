# S03 — exercise search engine (R-H13 engine portion): evidence and standing

**Slice:** `S03-exercise-search-engine` · **Checkout:** `tmp/worktrees/rolodex-luna-01a098de-20260913`
**Branch:** `codex/rolodex-luna-01a098de` · **Baseline HEAD:** `c0cbe538d8ed2ca519bb494cdf3282bf43b76699`
**Date:** 2026-09-13 · **Status:** IMPLEMENTATION VERIFIED (local, uncommitted, undeployed)

> Local/tested/deployed are kept separate. Nothing here is committed, pushed, migrated or deployed.

## 1. Executor disclosure (identity truth)

The preserved task contract (`state-relocated.json` → `authorization.builder`) names
`gpt-5.6-luna` @ `xhigh` as the build actor, and the installed controller's
`validateBuild` (`workflow-override-evidence.mjs:111-112`) accepts ONLY that actor string in a
`build.json` receipt. This session's executing agent is **not** `gpt-5.6-luna` and not
`gpt-6-astra`.

No `build.json` with a fabricated `actor` was written. The controller state remains preserved and
paused at its handoff hash `93a9e7be…f26`; `freeze`/`advance` for S03 were deliberately **not**
invoked. See `CONTINUATION-STATUS-20260913.md` §Governance for the decision Sean needs to make.
The engineering evidence below is real and independently reproducible.

## 2. What changed

| File | Lines | SHA256 | Change |
|---|---|---|---|
| `frontend/src/components/WorkoutLogger/exerciseSearchCore.ts` | 166 | `4ed77aaf…95a7` | NEW — the single pure scorer + revision/sequence worker state |
| `frontend/src/components/WorkoutLogger/exerciseSearchCatalog.ts` | 142 | `887df1b2…0897` | NEW — extracted payload normalization (was inline in the hook) |
| `frontend/src/components/WorkoutLogger/exerciseSearch.worker.ts` | 40 | `16aca9f6…6a58` | NEW — Vite module-worker entry |
| `frontend/src/components/WorkoutLogger/exerciseSearchWorker.ts` | 99 | `29d183fd…236c` | Blob-string worker removed; constructs the module worker; sync fallback delegates to the core |
| `frontend/src/components/WorkoutLogger/useExerciseSearch.ts` | 242 | `11aad712…dcb` | Repaired lifecycle (below) |
| `frontend/src/components/WorkoutLogger/useExerciseSearch.test.tsx` | 266 | `115cfdbf…8a80` | NEW tests (12) |
| `frontend/src/components/WorkoutLogger/exerciseSearchCore.test.ts` | 103 | `aa535b1e…e27e` | NEW tests (9) |
| `frontend/src/components/WorkoutLogger/exerciseSearchWorker.test.ts` | 76 | `f9b1fb36…cfcb` | NEW tests (7) |
| `frontend/src/components/WorkoutLogger/NASMExerciseRolodex.mediaContract.test.ts` | 74 | `bd80450f…2c4d` | Pointer moved to the extraction target; assertions preserved **and strengthened** |

Every file is inside the slice's declared `allowedFiles`, except
`NASMExerciseRolodex.mediaContract.test.ts`, which was **added** to the slice scope and is
disclosed here. Rationale in §6.

### Behaviour repaired

1. **One fetch per consumer.** Baseline `fetchExercises` had `query` in its `useCallback` deps, so
   every keystroke re-fetched the library. Fetch now owns only the catalog; typing never fetches.
2. **Current-query results only.** `catalogRevision` + `searchSequence` are stamped on every
   `SEARCH` and echoed on `RESULTS`; a reply settles state only when **both** still match. A
   mismatch (old query, old category, old catalog) is dropped and never clears busy state.
3. **Worker failure recovery.** `onerror` / `onmessageerror` / a throwing `postMessage` terminate
   the owned worker and **synchronously** replay the latest query/category through the shared
   scorer, so busy state cannot strand.
4. **Honest load state.** Additive `loadState = loading | ready | empty | error | stale` plus
   `refreshError`. A loaded-but-empty catalog is a real `empty` result, not "never loaded". A
   failed refresh keeps the existing filtered rows and reports `stale`. `loadError` is retained for
   failed **initial** load compatibility.
5. **Malformed payload containment.** Non-object array members are dropped (no invented
   "Unknown Exercise" row) and string-array fields keep only strings, so `m.toLowerCase()` can no
   longer throw on a numeric entry. A malformed top-level body is a failure, not an empty library.
6. **One scorer.** The fuzzy rules previously existed twice (a stringified Blob worker copy and a
   different main-thread copy that ranked `exerciseType` at 300 and muscles at 200). Both now call
   `exerciseSearchCore.searchExercises`. A test asserts the worker entry and the fallback contain no
   second `fuzzyScore`.
7. **Blank query is catalog order**, not alphabetical. The baseline worker comment claimed
   alphabetical; nothing implemented it. The contract now says what the code does.

## 3. RED → GREEN

**RED** (`s03-red-behavioral.log`) — the three new test files executed against the **restored
baseline** implementation (the two modified files were `git checkout`-restored; the three new
modules are additive and do not repair the hook):

```
Test Files  3 failed (3)
     Tests  16 failed | 12 passed (28)
```

All 16 were genuine assertion failures, not setup/import errors. Representative:

- `expected "vi.fn()" to be called 1 times, but got 2 times` — the duplicate-fetch defect
- `TypeError: m.toLowerCase is not a fun…` — numeric muscle entry crashes the baseline scorer
- `expected undefined to be 'empty'` / `'error'` / `'stale'` — `loadState` did not exist
- `expected "vi.fn()" to not be called at all, but actually been called 1 times` — Blob URL still created

**GREEN** (`s03-green-focused-exitcheck.log`, exit code **0**):

```
Test Files  4 passed (4)
     Tests  33 passed (33)
```

**Consumer regression** (`s03-green-consumers.log`, exit code **0**) — `WorkoutLogger`,
`BootcampBuilder`, `Shared/SwanExercisePicker`, `workout-design-lab`, `CoachDock`,
`admin-workout-planner`:

```
Test Files  257 passed (257)
     Tests  1546 passed (1546)
```

**Type check:** `tsc --noEmit --pretty false` → exit **0**, no output.
**Production build:** `vite build` → exit **0**, `✓ built in 20.09s`.

### Emitted worker asset proof (unit tests cannot prove bundling)

`dist/assets/exerciseSearch.worker-Cb3M7ffx.js` — 1578 bytes, SHA256
`ffe4111cde523d07f299bd962c0201e8259888c5eb21cfd30fce868cdbd3e488`, contains the shared scorer.
`dist/v3/reactWindowStyleProps.D2cCetMR.js` references it as:

```js
new Worker(new URL("/assets/exerciseSearch.worker-Cb3M7ffx.js", import.meta.url), { type: "module" })
```

## 4. Draft-patch inspection findings (the preserved `s03-red.patch` was a draft)

`s03-red.patch` (`e07d5c8b…2794`) was inspected, not applied verbatim. Four defects were found and
corrected; each correction **strengthens** the assertion it touches.

| # | Draft defect | Correction |
|---|---|---|
| 1 | Every patch header was a **relative** path — the exact write-location incident the handoff documents | All eight files written by absolute path; hashes re-read after writing |
| 2 | `RESULTS` messages carried **no** `catalogRevision`/`searchSequence`, so the draft could not test the revision contract at all. It also contradicted s03-architecture.md §"Accept only the current pair" | Tests now read the ids off the real posted `SEARCH` message and echo them; added a dedicated superseded-`catalogRevision` rejection test |
| 3 | Refresh test expected `results` to equal a row named `"Incline Bench"` for query `"press"` — the scorer cannot match that, so the draft could never pass on a correct implementation | Fixture renamed to `"Incline Bench Press"`; test now also asserts the refresh re-ran the **current** filter (`query:"press"`, `category:"Chest"`) rather than a stale empty query |
| 4 | Type/muscle fixture gave **both** rows `primaryMuscles: ['Hamstring']` by default, so `'ham'` produced a 700/700 tie and stable order returned `['type','muscle']`, never `['muscle']` | Muscle-isolating fixture (`['Quadriceps']` vs `['Hamstring']`) |

Additionally the draft stubbed the global `URL` with an object lacking a constructor. That is
incompatible with the **architecturally mandated** `new Worker(new URL(...), {type:'module'})`; the
stub was removed (the new implementation creates no Blob URL, so there is nothing to revoke, and a
test now asserts that).

## 5. Preserved existing contracts

| Contract | Requirement | Standing |
|---|---|---|
| `WorkoutDesignLab.contract.test.ts:134` | hook source contains `api.get('/api/exercises/library')` **exactly** (single argument) | PASS — the call was deliberately left single-argument |
| `WorkoutLogger.clientRoute.test.ts:306-307` | library endpoint present, `/api/exercises/all` absent (comments stripped) | PASS |
| `WorkoutLogger.clientRoute.test.ts:310-330` | backend `/library` stays `protect`-only; `/all` keeps `trainerOrAdminOnly` | PASS (untouched) |
| `NASMExerciseRolodex.mediaContract.test.ts` | all 14 media/logging fields carried end to end | PASS (pointer moved, see §6) |
| `useWorkoutPlannerRolodexState.extraction.test.ts` | planner page has no direct `useExerciseSearch`; the hook does | PASS |
| `ExerciseRolodexPanel.composition.test.ts` | ≤300 lines | PASS |
| Rule 4 (300-line cap) | every touched source file | PASS — max is `useExerciseSearch.ts` at 242 |

### Deliberate non-adoption: `AbortSignal`

`ApiService.get<T>(url, config?)` **does** accept an axios config, so an `AbortController` is
technically available. It was **not** wired because `WorkoutDesignLab.contract.test.ts:134` pins the
exact single-argument call string, and supersession is already enforced exactly by the monotonic
fetch sequence (a superseded response is discarded before it can touch state). Adding the config
would have broken a preserved contract to gain nothing the sequence does not already provide.

## 6. Scope disclosure — one added file

`NASMExerciseRolodex.mediaContract.test.ts` was not in the slice's declared `allowedFiles`.
s03-architecture.md §"Owned files" mandates extracting catalog normalization into
`exerciseSearchCatalog.ts` to keep the lifecycle hook under the 300-line cap. That extraction
necessarily moves the 14 media/logging field assignments out of `useExerciseSearch.ts`, which is
what the old test read.

The test was updated to read the new normalization module and **an assertion was added** that the
hook actually consumes it (`normalizeExerciseCatalog(`) and does not re-inline the mapping
(`not.toContain('Unknown Exercise')`). Net assertion count went **up**; nothing was weakened or
deleted. The alternative — leaving the mapping in the hook — would have put the file at ~315 lines
and violated Rule 4.

## 7. Not covered by this slice (honest gaps)

- **No mounted-browser journey.** The module worker is proven to *bundle*; it is not yet proven to
  *run* against a real library response in a browser. s03-architecture.md assigns that smoke to the
  combined UI slice (S04). **NOT RUN.**
- **No authenticated production orchestration.** All 12 hook tests mock `ApiService`.
- **No API-boundary test.** `/api/exercises/library` itself is unchanged and untested here.
- **No commit, push, migration or deploy.** Rollback is the exact owned source diff.
- **S04–S08 and the remaining H01–H30 register are not started or unchanged.** H13 is *not*
  complete: this slice is engine-only.
