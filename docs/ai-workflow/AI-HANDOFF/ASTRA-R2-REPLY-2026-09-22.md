# Astra Reply — subscription transport — 2026-09-23T02:25:33.253Z

**Provider:** openai-codex
**Billing:** chatgpt-subscription
**Authentication:** chatgpt_subscription
**Transport:** codex-cli
**Requested model:** gpt-6-astra
**Served model:** NOT OBSERVABLE on codex-cli (see SERVED_MODEL_UNVERIFIABLE_NOTE)
**Reasoning effort:** xhigh
**Tokens:** in=44973 out=9989 reasoning=7971
**Packet:** `docs/ai-workflow/AI-HANDOFF/ASTRA-R2-PACKET-2026-09-22.md`
**Wall:** 307.9s
**Mega Blueprint:** not armed

> Marginal cost $0 — this leg rides the ChatGPT subscription, not OpenRouter.

---
A2 can pass without proving the watcher overlapped active publication, and its success log omits the publisher failures it says it reports. A3 also checks for the retry call and unlink separately, so it does not prove the retry wraps the deletion. I’m separating those false-pass paths from E7’s completion limit.

[VERIFIED] **DEFECTS-FOUND / REVISE.** The quoted gates still admit false passes. E7 warrants preserving a failure signal, not silently weakening the completion contract.

1. **E7 — CONFIRMED narrowly; the inferred duration and completion count are OVERSTATED.**

   [VERIFIED] The supplied trace reports an exhausted rename failure at `paths.mjs:173,198`. It does **not** establish that the destination was continuously held for more than 92 ms: repeated collisions and scheduling delays also fit that evidence. A2’s `done` also excludes any successful publications made by children that subsequently died, because its parse-failure result contains no `ok` count (`atomic-rename-reader-watch.test.mjs:108–110,181–182`). Thus **240 reported completions is not proof of exactly 240 publications**.

   [UNKNOWN] The recurrence rate and production incidence are not established by this packet.

   **Fix/adjudication:** Keep `failed === 0` if successful completion of this specified workload remains the requirement (`atomic-rename-contention.test.mjs:199–207`). An intermittent failure exposing a real availability limit is not automatically a defective test.

   - **(a)** Longer backoff/jitter is a mitigation requiring measurement, not a guarantee.
   - **(b)** Waiting before renaming cannot guarantee the subsequent rename succeeds; contention handling must still surround the actual operation.
   - **(c)** A tolerated failure rate changes the acceptance contract and still fluctuates with load. It is unsuitable as an unexplained replacement for zero failures.
   - **Fourth option:** Separate deterministic tests of `retryTransientSync`—including eventual success and explicit exhaustion—from the contention stress gate. Give the stress gate a defined execution environment and report its failures separately. If that environment must support four concurrent publishers, the engine needs to meet that requirement.

2. **A2 — CONFIRMED: its control can pass while the subject observation misses active publication.**

   [VERIFIED] The control proves detection of a deliberately widened, parent-controlled gap (`atomic-rename-reader-watch.test.mjs:152–162`). The subject requires only some observations and one complete record (`:187–196`). Those predicates also accept a watcher that observes `INIT`, misses the entire publishing interval, and then observes the final complete record before child-close handling finishes.

   **Concrete failure:** A subject publisher could expose transient holes while running; the watcher misses them, sees its final record, and passes.

   **Fix:** Coordinate `runRacer` with `watcher` so observations are acknowledged during publication, including across multiple completed publications. Run the deliberately broken control through the same child-process observation arrangement. Keep the control, but describe its result as demonstrated sensitivity to that exercised gap—not proof that every shorter gap is observable.

3. **A2 — CONFIRMED: publisher failures are accepted too broadly and are not reported as claimed.**

   [VERIFIED] The close handler shown discards exit status; parse failure produces `raw` and truncated `stderr` (`atomic-rename-reader-watch.test.mjs:108–110`). The subsequent assertion accepts **every dead publisher with empty stderr**, or any stderr containing one of three substrings (`:181–185`). Meanwhile, the success log prints neither `done`, `dead`, nor the captured error (`:208–209`).

   **Concrete failure:** One publisher produces a complete record; others terminate without stderr. The test can pass and print only clean reader counters.

   **Fix:** Make `runRacer` preserve abnormal termination, validate its report, and distinguish specifically identified rename exhaustion from other failures. Print `done`, `dead`, and the captured cause. Report reader safety and publisher completion separately.

   Tolerating an identified exhaustion is defensible for a **reader-safety-only** test; silently accepting unidentified deaths is not. Also distinguish `ENOENT` from other read failures: `missing` currently counts both (`:134–137`), so its failure message can incorrectly assert that the destination disappeared.

4. **A3 test 1 — CONFIRMED: it does not establish the wiring it claims to pin.**

   [VERIFIED] The assertions independently require a `retryTransientSync` call and an `unlinkSync` call (`lock-release-wiring.test.mjs:86–92`). They do not require the deletion to occur inside the retry callback. This replacement satisfies both source predicates while removing retry protection:

   ```js
   retryTransientSync(() => true);
   unlinkSync(lockPath(r));
   ```

   The import checks do not close that gap (`:94–101`).

   **Fix:** Assert the actual call structure: `unlinkSync(lockPath(r))` must execute inside the callback passed to the imported `retryTransientSync`. Account for comments and executable structure rather than independent text occurrences. Keep this explicitly classified as structural coverage.

   [VERIFIED] **“No natural injection exists” is OVERSTATED.** The header documents two unsuccessful mechanisms, not an exhaustive impossibility proof (`:20–37`).

   [HYPOTHESIS] A separate process holding a native Windows handle with delete sharing disabled is a third mechanism to investigate. Test-local substitution of `unlinkSync` is another avenue. [UNKNOWN] Their feasibility in this harness cannot be established from the omitted imports and setup; an engine-side seam has not been proved necessary.

5. **A3 test 2 / E4 — CONFIRMED: the test encodes the defect as the required passing condition.**

   [VERIFIED] `released = true` precedes deletion, and subsequent calls return immediately (`lock.mjs:167–180`). The test explicitly requires that ordering (`lock-release-wiring.test.mjs:104–120`). Its comment reverses test semantics: asserting the corrected ordering today would produce a genuine **RED**, not a false green.

   Intentional characterization can document current behavior, but this test cannot count as an E4 correctness gate.

   **Fix:** Replace it with a pending desired-behavior regression: exhaust deletion retries, verify that `release()` returns false, clear the contention, and verify a subsequent `release()` can delete the still-owned lock. The engine correction must defer `released = true` until successful deletion. Until implemented, keep E4 unresolved rather than requiring the defective ordering to remain green.

6. **E5 — CONFIRMED and still open; `syncPass` does not establish fresh rendering.**

   [VERIFIED] `drawn` is captured after warm-up (`frame-bench.mjs:151–156`). Later `readPixels` calls contribute only elapsed time (`:182–187`), while final acceptance reuses the original `drawn` (`:214–235`).

   **Minimal mutation:** Suppress only `renderer.render(...)` after the three warm-up frames while preserving the rest of `scene.frame()`. [VERIFIED] No quoted output predicate requires a subsequent render. [UNKNOWN] The actual mutation result has not been executed here.

   **Fix:** Require a known post-warm-up visible change through `scene.update(NODES)`, verify the expected changed `px` after `readPixels`, and include that check in `guards`/`pass`. Merely asserting that later pixels remain nonzero still accepts a frozen warm-up image. Keep the output probe distinct from the timing workload.

7. **E6 — CONFIRMED: stale exit evidence is a separate provenance defect.**

   [VERIFIED] The section asserts a remeasured PASS and presents a verbatim result with scalar `frames` and the earlier method (`19-s5-exit-evidence.md:95,118–136`). Current code emits structured `frames`, `syncMedianMs`, and additional guards (`frame-bench.mjs:221–235`). That older receipt cannot establish the current guards passed.

   An open slice permits evidence to be pending; it does not make an old PASS current.

   **Fix:** Preserve the old result as explicitly historical, mark current verification pending, then capture the current benchmark result and applicable mutations with their source/build identity. Do not manually transform the old JSON into the new shape.

8. **A1 — global empty-run hole fixed; per-racer completion remains OVERSTATED.**

   [VERIFIED] The aggregate assertion rejects four empty reports, but does not enforce each racer’s share (`atomic-rename-contention.test.mjs:189–201`). Reports containing `ok` values `[600, 0, 0, 0]`, empty `fail` objects, and no `raw` pass both total and failure assertions.

   **Fix:** Require each `r.ok === N`, require `r.raw === undefined`, and validate `r.fail` counts before aggregation. Retain the aggregate assertions as cross-checks. This pins the stated “every racer” requirement without changing the engine.

9. **E3 — CONFIRMED still unresolved in the supplied current code.**

   [VERIFIED] Reclaim still renames whatever presently occupies `lockPath(r)` before attempting acquisition (`lock.mjs:147–157`); no quoted change makes that operation conditional on the previously observed lock.

   **Concrete bounded fix:** Disable that automatic reclaim path in `acquireLock` and return a failed acquisition with the current `holder` until reclaim can be coordinated safely with replacement. Another token reread alone does not make the rename conditional.
