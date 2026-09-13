# S03 architecture: current-query exercise search

This bounded repair implements R-H13 search-engine behavior from canonical document14 section6 / FE09. R-H13 consumer error/retry/stale presentation and H18 compact media remain the following UI slice. Do not label H13 complete after engine-only tests.

Keep useExerciseSearch and ExerciseSlim exports compatible. Keep the existing /api/exercises/library endpoint, authenticated ApiService, per-consumer memory cache and five-minute staleness policy. No cross-account singleton, provider call, API redesign or persistent cache.

## State and execution contract

Fetch and query have separate ownership. One initial request per mounted consumer; typing or changing category never refetches. Explicit refresh supersedes the previous fetch using a fetch sequence and AbortController when supported by ApiService. Unmount invalidates fetch/worker callbacks before cleanup. A successful empty catalog is a valid cached result; do not use array length as proof that a catalog has never loaded.

Every accepted catalog receives a monotonically increasing catalogRevision. Every requested query/category receives searchSequence; public setters update the current-query refs and invalidate previous searches synchronously. CACHE, SEARCH and RESULTS messages carry catalogRevision; SEARCH and RESULTS also carry searchSequence. Accept only the current pair. Results from an old catalog, query, category or terminated worker never settle the current busy state. The latest fetch alone may update catalog, load status and refresh errors.

Search the current query/category when catalog loads or refreshes. Do not put all unfiltered rows into results merely because a stale callback captured an empty query. Preserve user query/category on success, failure and retry. A successful empty catalog settles searching; an initial error settles both busy flags. Refresh with an existing catalog keeps current filtered results, marks them stale on failure, and exposes a retryable refreshError.

Return additive loadState = loading | ready | empty | error | stale and refreshError while retaining loadError compatibility for failed initial load. isLoading describes network fetch; isSearching describes active query computation. Track successful cache presence separately so a previously loaded empty catalog can become stale. Clear an old error on accepted successful retry, not because a different stale request finished.

Worker construction, postMessage, onerror and onmessageerror failures terminate the owned worker and synchronously replay the latest query/category against the current cache, settling searching. No discarded worker callback may later overwrite fallback results. Cleanup releases the worker. Avoid leaking Blob URLs.

## One scoring implementation

Add exerciseSearchCore.ts with the existing worker's matching rules as the shared pure implementation: normalized category, name score, then weighted type, then weighted primary-muscle score, stable catalog order on ties and the existing 100-result cap for nonblank query. Blank query preserves all category rows in existing catalog order. Do not silently claim alphabetical sorting. Shared fallback and worker call exactly the same pure implementation; do not duplicate a stringified second scorer.

Use a Vite module worker entry exerciseSearch.worker.ts loaded through new Worker(new URL('./exerciseSearch.worker.ts', import.meta.url), { type: 'module' }). Keep createExerciseSearchWorker/searchExercisesSync and ExerciseSlim exported from existing exerciseSearchWorker.ts for callers. New worker entry imports the pure core. A type-only import of ExerciseSlim is permitted without moving global types. Constructor/CSP failure keeps synchronous fallback. Production build plus synthetic browser smoke must prove the emitted worker asset later; unit tests alone do not prove bundling.

## Validation and tests

Preserve existing catalog/media normalization. Filter malformed array members to supported strings and ignore non-object exercise records; never call lowerCase on arbitrary payload values. Do not invent new metadata defaults or global type changes in this slice. A malformed top-level library response is a failure, not a successful empty list.

Write persistent tests against the current hook/exports before implementation and record intended RED failures. At minimum: query/category chosen before initial load; one fetch despite typing; refresh preserves filter; earlier/later fetch inversion; old worker query/category reply rejected; old catalog reply rejected; worker crash settles latest results and terminates; throwing postMessage falls back; initial error/retry; stale cache refresh error; successful empty catalog; unmount with late callbacks. Use actual shared scorer/worker handler behavior for parity across type/muscle fuzzy matches and category aliases, rather than mocking both to the same answer. No test should claim worker bundling from fake Worker alone.

Existing RED harness at tmp/rolodex-audit-evidence/red/rolodex-planner-acceptance.red.test.tsx remains preserved. Its old synthetic worker replies lack the new required IDs, so add protocol-aware tracked regression tests; do not weaken ID checks to satisfy obsolete replies. API mocks may accept the new AbortSignal config. Record the preserved baseline RED plus tracked RED/GREEN evidence.

Owned files: useExerciseSearch.ts; exerciseSearchWorker.ts; new exerciseSearchCore.ts; new exerciseSearch.worker.ts; new exerciseSearchCatalog.ts; new useExerciseSearch.test.tsx, exerciseSearchCore.test.ts, exerciseSearchWorker.test.ts, all in frontend/src/components/WorkoutLogger. Extract only the existing catalog normalization into exerciseSearchCatalog.ts to keep the repaired lifecycle hook within the repository maintainability cap. No UI, planner state, equipment or backend edits in S03.

Run focused hook/core/worker tests, existing NASM Rolodex selection/recent/deeplink tests and relevant planner search-consumer regressions. Typecheck shared exported types. Final frontend build and browser worker smoke follow the combined UI slice. All fixtures synthetic; rollback is the exact owned source diff. No storage migration or data rollback applies.
