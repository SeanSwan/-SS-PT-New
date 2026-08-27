# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-VIDEO-POSTER-REVIEW-PACKET-2026-08-27.md
**Tokens (Ollama):** 9978 in / 1324 out | **Wall:** 28.2s | **done_reason:** stop

---
## VERDICT
APPROVE — The core logic is sound, the "one rule" abstraction is superior to branching, and the identified edge cases (mixed pages, missing signers) are handled with appropriate telemetry and degradation.

## BLOCKERS
1. **P1: `node:test` isolation creates a silent failure blind spot.**
   - **Scenario:** A regression occurs in `swanLawFilter` or `forgeEndToEnd` (188 tests). The primary CI command (`vitest`) reports `0 failed` because it cannot parse `node:test` files, listing them as "No test suite found" (which is often ignored or miscounted as environment noise). The build passes, but the core Atelier logic is broken.
   - **Evidence:** §12, Round 2 Finding 5: "188 passing tests that appear in no number anyone has reported... A test that cannot be seen to fail is the §7b class at the level of the harness."
   - **Impact:** This violates the "Data-truth" principle of the review. The verification signal is false-positive. While not a runtime crash, it is a P1 engineering blocker because it defeats the purpose of the test suite.

## ATTACKS
- **Correctness:**
  - *Mixed Page Signer Failure:* The logic `failed === attempted` correctly identifies a broken signer even if some rows have no key (since they don't increment `attempted`). The fix in Round 2 (gating the *claim* of misconfiguration on `attempted >= 2` while keeping the flag loud) is correct. It prevents false alarms on single-row pages without silencing genuine total failures.
  - *`previewKeyFor` Logic:* The rule `if (row.posterR2Key) return row.posterR2Key; return row.kind === 'image' ? (row.r2Key || null) : null;` is robust. It correctly handles the "poster wins" case and the "image fallback" case. It correctly returns `null` for video/audio without posters, preventing the MP4-in-`<img>` bug.
  - *Race Conditions:* `Promise.all` is used for signing. If `readUrl` is async, this is fine. The `attempted` and `failed` counters are modified inside the `map` callback. In JS, `map` callbacks are synchronous with respect to the array iteration, but the *return value* is a Promise. The counters `attempted` and `failed` are incremented *before* the promise is returned (for `attempted`) or in the `.catch` handler (for `failed`).
    - *Wait:* `attempted += 1` happens synchronously in the map callback. `failed += 1` happens in the `.catch` handler. Since `Promise.all` waits for all promises to settle, the final value of `failed` is correct by the time `signPreviews` resolves. This is safe.

- **Security:**
  - *IDOR/Tenant Scope:* `buildAssetQuery` throws `E_BAD_OWNER` if `userId` is falsy and sets `where: { ownerUserId: req.userId }`. This is correct. The `readUrl` function is injected from the server context, so it signs URLs for the specific user's assets. No cross-tenant leak.
  - *SSRF/Injection:* `previewKeyFor` returns a key from the database. It is passed to `readUrl` (server-side signing). No user input is concatenated into the URL directly in the frontend. The frontend receives a signed URL. Safe.

- **Data-truth / Schema Drift:**
  - *`posterR2Key` vs `kind`:* The code assumes `posterR2Key` exists on `MediaAsset`. The defect description confirms `videoRenderJobService` writes it. The `assetView` function passes `kind` through. The frontend uses `a.kind` for the marker. Consistent.
  - *`null` vs `undefined`:* `previewKeyFor` handles `null` and `undefined` (via `|| null` and truthiness checks). `signPreviews` checks `if (!previewKey)`. Consistent.

## HIGHEST RISK
The **`node:test` isolation** (Blocker 1). The highest risk is not in the code logic, which is sound, but in the **verification harness**. The 188 tests in `node:test` files are currently invisible to the primary test runner. If one of these tests fails, the CI pipeline will likely report a "clean" run (or a confusing "collection error" that is ignored), allowing a broken `swanLawFilter` or `forgeEndToEnd` to ship. This is a critical integrity failure of the development process.

**Cheapest de-risk:** Add a CI step that runs `node --test` on the `node:test` files *in addition to* Vitest, and fails the build if either runner reports failures. This does not require moving files, only adding a command.

## CONFIDENCE
I am confident in the code logic for `previewKeyFor` and `signPreviews`. The "one rule" abstraction is well-reasoned and tested. The Round 2 fixes for the signer failure signal and the missing `readUrl` telemetry are correct.

My uncertainty lies in the **production environment's handling of `console.warn/error`**. The code relies on `console.warn` for per-row failures and `console.error` for total signer failure. If the production logging infrastructure strips or ignores `console` output (common in some serverless or high-throughput environments), the "telemetry" rationale for the `previewsUnavailable` flag is weakened. However, the flag itself is returned to the client, so the UI can still react. The risk is that the *operator* does not see the log. This is a minor operational risk, not a code defect.

I also cannot verify the `npm ls jose sanitize-html` issue from the document alone, but the Round 2 finding that these are "declared dep, absent from shared node_modules" is a plausible infrastructure issue that explains the "collection errors." This does not affect the code logic but does affect the test reliability.
