# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** .ai-workflow/fusion/panel5-extraction-decision.md
**Tokens (Ollama):** 2502 in / 1232 out | **Wall:** 13.8s | **done_reason:** stop

---
## VERDICT
REVISE — The cherry-pick strategy is operationally safer than merging, but the plan fails to address the critical "semantic drift" risk in the two heavily modified backend files and lacks a concrete verification strategy for the extracted code against the new base.

## BLOCKERS
1. **P1: Unverified Semantic Drift in `session.service.mjs`**
   - **Failure Scenario:** The branch was cut 2 months ago. `main` has 9 commits to `session.service.mjs` since the split. The branch has 471 commits. If `main` changed the *signature* or *return shape* of a helper function used by the cancellation logic (e.g., `getPackagePricing` now returns an object instead of a number, or adds a new required field), the cherry-picked code will compile but fail at runtime with `TypeError` or `undefined` values when calculating charges. The "green suite" on the old base does not prove compatibility with the new base's internal contracts.
   - **Evidence:** §3 table shows `backend/services/sessions/session.service.mjs` has **9** commits on `main` since split. §5 states "tests I have all ran against the OLD base."

2. **P1: Missing Verification Gate for New Base Compatibility**
   - **Failure Scenario:** The plan says "re-run all gates against that tree." It does not specify *which* gates. If the existing test suite mocks the `session.service.mjs` dependencies, the tests will pass even if the real service interface has changed. A "green" test run is insufficient evidence of correctness when the underlying dependency graph has shifted by 9 commits.
   - **Evidence:** §4.3 explicitly asks "How do I verify the extracted tree is correct, given the tests I have all ran against the OLD base?" The plan in §3 does not answer this; it only says "re-run all gates."

3. **P2: Cherry-pick Conflict Resolution Risk**
   - **Failure Scenario:** Cherry-picking 11 sequential commits that "repeatedly rewrite the same two files" (as noted in §4.1) will result in 11 separate conflict resolutions. Each resolution is a manual merge decision. If the developer resolves a conflict in commit #3 by taking the branch version, but commit #7 (which fixes commit #3) expects the main version to have been present, the final state will be logically inconsistent. This is a "semantic conflict" that `git` cannot detect.
   - **Evidence:** §4.1 states "cherry-picking 11 sequential commits that repeatedly rewrite the same two files means resolving conflicts 11 times, and several of those commits fix earlier commits in the same series."

## ATTACKS
- **Correctness:**
  - **Stale State:** The branch code assumes the `session.service.mjs` from 2026-06-28. If `main` added a new validation step (e.g., checking for `isCancelled` before allowing pricing) that the branch code bypasses, the extracted code will allow invalid state transitions.
  - **Unhandled Error Paths:** If `main` changed the error handling in `session.service.mjs` to throw specific error types (e.g., `SessionNotFoundError`) that the branch code does not catch, the cherry-picked code will crash with an unhandled promise rejection.

- **Security:**
  - **IDOR/Authorization:** The branch code was written against an older version of the authz checks. If `main` tightened `canAccessSessionRecord` (e.g., added a new `allowClient: false` default), the branch code might still pass `allowClient: true` in a way that is now considered insecure or violates the new policy. The plan does not mention re-verifying authz logic against the new base.

- **Data-truth / schema drift:**
  - **Model Column Drift:** If `main` added a new column to the `sessions` table (e.g., `cancellation_reason`) that is required by the new `session.service.mjs` logic, the branch code (which doesn't know about this column) will fail to insert/update correctly, or worse, silently ignore it, leading to data loss.

## HIGHEST RISK
**Semantic incompatibility between the branch's cancellation logic and the new `session.service.mjs` interface.** The cheapest way to de-risk this is to **not cherry-pick**. Instead, **create a fresh branch from `main`, manually copy the *final* state of the 6 touched files from the branch, and then run a full integration test suite that includes HTTP-level tests against a local instance of the production database schema (with mocked data).** This avoids the 11-step conflict resolution and ensures the code is written against the current `main` interfaces. If manual copying is too risky, then cherry-pick is acceptable, but **only if** you first run `git diff main...branch -- backend/services/sessions/session.service.mjs` to understand exactly what changed in those 9 commits, and then manually verify that the branch's code is compatible with those changes.

## CONFIDENCE
I could not verify the exact nature of the 9 commits to `session.service.mjs` on `main`. I assumed they might have changed function signatures or return types. If they were purely additive (e.g., new methods, no changes to existing ones), the risk is lower. I also could not verify if the test suite includes HTTP-level integration tests that would catch interface mismatches. The plan's claim that "re-running all gates" is sufficient is unverified. I am confident that cherry-picking 11 commits with repeated rewrites is a high-risk manual process, but I am less confident about the specific technical details of the drift.
