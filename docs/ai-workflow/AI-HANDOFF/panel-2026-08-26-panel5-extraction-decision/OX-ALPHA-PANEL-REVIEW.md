# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** .ai-workflow/fusion/panel5-extraction-decision.md
**Seed:** .ai-workflow/fusion/_src5.txt
**Tokens:** 4571 in / 6125 out · **Cost:** ~$0.0000 · **Wall:** 203.3s · **finish:** stop

---

## VERDICT
REVISE — Both code fixes are directionally correct but each has an incomplete edge (NaN passes the null guard; fallback contracts are internally inconsistent), and the deploy plan is right in its core instinct (do not merge) but wrong in its mechanism (11-way cherry-pick) and missing a mandatory pre-extraction step.

## BLOCKERS

1. **P1 — The forfeit fix excludes `null` but not `NaN`.** `hoursUntilSession !== null` is satisfied by `NaN`. If `sessionDate` parses to an invalid date (bad string, epoch-zero row, timezone garbage), the arithmetic upstream yields `NaN`, the guard passes, and forfeit hinges entirely on whatever `refundEligible` computed — which, per your own §1 note about the warning endpoint, is built on comparisons like `NaN < 24 → false`. That means the fix works *only if* `refundEligible` happens to be true on the NaN path — an accidental safety property, not a designed one. One malformed `sessionDate` shape that routes through a different `refundEligible` computation stamps `forfeited` again. Evidence: seed, forfeit predicate region (`hoursUntilSession !== null`). Fix is one token: `Number.isFinite(hoursUntilSession)`.

2. **P1 — The extraction plan can silently revert main-side money-path changes, and nothing in the gate list catches it.** Main took 9 commits on `session.service.mjs` and 12 on `sessions.mjs` since the split. If any of those touched the cancellation function (you say "the cancellation function is the one both sides touched" — that's confirmation, not suspicion), porting the branch's version over them reverts main's changes *semantically*: it compiles, `tsc` exits 0, and a test suite written against the old base stays green. This is the classic long-branch semantic conflict and it lands directly on the charge-stamping path. The plan as written ("cherry-pick, resolve conflicts, re-run gates") has no step that inventories what main did to those regions. Blocker until a diff inventory exists (see HIGHEST RISK).

3. **P1 — "Re-run all gates against that tree" is a production-write hazard until G0 is physically done.** Local dev resolves `DATABASE_URL` to **production**, there is no staging, and the verification loop for the extracted tree involves running 4,819 backend tests plus a prod smoke. Any test or smoke that exercises cancellation writes (`session.save({ transaction })`, charge recording) against a misconfigured env mutates real money records. G0 is listed as gate zero but nothing in the plan states it is *complete*. It must be a hard precondition — verified by attempting a deliberate write in dev and confirming failure — before the first test run on the extracted tree.

## ATTACKS

**Correctness**
- `rateOf` retains the `sessions === 0 → parseFloat(price)` branch (seed, `getClientPackagePricing`). Currently dead — both call sites pre-filter `sessions > 0` — but it is the exact line that produced the $33,600 defect, left armed inside the same file. Delete it; dead money-path code gets resurrected by the next refactor.
- No finiteness guard at the source: `parseFloat(sessionPackage.price) / sessionPackage.sessions` returns `NaN` without complaint if `price` is ever non-numeric, and the payload ships `isFallback: false, pricePerSession: NaN`. The cancellation consumer happens to defend (`Number.isFinite(sessionRate)`), but the frontend pricing-sheet consumer does not — a NaN rate renders as `$NaN` on the prospect-facing acquisition sheet, the owner's #1 priority surface.
- Intent question, not necessarily a bug: a client whose *newest* completed order contains only one-time items but who holds valid session packs in older orders (within the 12-order window) gets `isFallback: true` via the `!sessionPackage` branch, even though the ambiguity population proves they own packages. Deliberate per the comment ("resolved rate comes from the newest order"), but confirm this is intended UX for the pricing sheet, because it downgrades paying clients to fallback silently.
- The ambiguity guard is blind past `limit: 12` orders — documented and accepted, but it means the guard's guarantee degrades for your best customers (most orders). Fine for now; write it down.

**Security**
- The catch block returns `error: error.message` in the payload (seed, final catch). If this payload reaches any API response, internal error text (table names, driver messages) leaks to the client. Strip it; log it instead.
- `applyServerDerivedChargeAmount` mutates `billingOptions` in place with no visible idempotency anchor. If the cancellation flow retries after a transient failure post-`save` but pre-commit, is `chargeAmount` re-derived cleanly, or does a partially-mutated `billingOptions` (with `chargeAmountSubmitted` already set) get re-clamped? Cannot tell from the excerpt — the `sessionDeducted`/`sessionCreditRestored` flags suggest protection exists, but diffs cannot show unchanged retry logic. Verify explicitly.
- `cancel-warning` authz is settled (§2) — not re-reporting. No new authn/authz surface introduced by these two functions themselves; `getClientPackagePricing` trusts its `clientId` argument, so every caller is a trust boundary I cannot see.

**Data-truth / schema drift**
- New response fields (`packageId`, `totalSessions`, `packagePrice`, `chargeAmountSubmitted`, `chargeAmountSource`) are landing on a `main` that moved 2,272 commits. Your `tsc` exit 0 and `vite build` exit 0 were measured on the **old base** (§5 says so implicitly: "nothing deployed," gates not yet re-run). Response-shape drift between the ported producer and main's current frontend consumers is exactly the class of failure a green old-base suite cannot see.
- `StorefrontItem.price` is passed through `parseFloat` everywhere — consistent with a DECIMAL-as-string dialect behavior — but `item.sessions` is compared numerically with no coercion. If `sessions` ever arrives as string `"12"` from the include, `"12" > 0` is true but `/ "12"` still works; low risk, worth one assertion in the characterization tests.

House rules: no violation found. The document shows no UI code, so styled-components/Victory/palette/touch-target rules are not exercisable here; no PII appears in any payload or log line shown (client IDs only); language and credential phrasing are clean.

## HIGHEST RISK
**The silent semantic revert in `session.service.mjs` (Blocker 2)** — it produces wrong-money behavior that passes every gate you currently have. Cheapest de-risk, before writing a single line of the extraction:

1. Run `git log -p <merge-base>..origin/main -- backend/services/sessions/session.service.mjs backend/routes/sessions.mjs` and enumerate every hunk touching the cancellation/pricing regions as **preserved / reverted / intentionally superseded** in the PR description. One hour of work; converts an invisible failure mode into a reviewable checklist.
2. Write characterization tests against the **branch tip first** (known-good fixed behavior): program-only client → fallback+review; mixed-rate history → fallback; null and NaN `sessionDate` → no forfeit; normal client → exact rate. Then require those same tests green on the extracted tree. Now a green suite actually means something (answers your Q3 honestly: it currently does not).
3. After extraction, the two function bodies must be **byte-identical** to the branch tip modulo imports/adaptation — enforce with a plain diff, not eyeballing.

On your explicit questions, since you asked me to pick: **(Q1)** Neither 11 cherry-picks nor a naive squash. For the four files with 0 main-side divergence, `git checkout <branch-tip> -- <file>` is provably identical and conflict-free. For the two divergent backend files, hand-port the final fixed functions onto main's current versions in a **single commit**. The 11-commit history has near-zero review value here — several commits fix earlier ones in the same series, so the intermediates are known-wrong states; reviewability for a money path comes from the PR diff plus characterization tests, not archaeology. **(Q4)** Ordering stands with one insertion: G0 (physically verified, not assumed) → **G1.5: diff inventory + characterization tests (new, made necessary by extraction)** → G2 → G3–G6. G5 (browser run) becomes *more* important, not less — the pricing sheet now lands on a frontend that moved 2,272 commits. **(Q5)** I agree with GLM, plainly. Three of the defects found share one root cause: server authority overriding a human's money decision based on inference. Make the derived rate advisory — compute it, log it, store it as `suggestedAmount`, surface the flag — and never mutate `billingOptions.chargeAmount`. For a single-trainer business where the operator is the owner, the override's expected value is negative: it has produced every catastrophic scenario in this saga and its only benefit is saving the owner one keystroke. The override is not worth keeping.

## CONFIDENCE
What I could not verify from the document alone, and what would settle it:

- **How `hoursUntilSession` and `refundEligible` are computed.** My Blocker 1 is conditional on the NaN path being reachable. Evidence: the actual derivation code (timezone handling included) and every consumer of `refundEligible`. If `refundEligible` is provably true whenever hours is NaN, downgrade to P2 defense-in-depth.
- **Whether `session.userId` is the client ID** in `applyServerDerivedChargeAmount`. If sessions key trainers or owners through `userId` in any role, the pricing lookup queries the wrong person's orders. Settle with the Session model definition and one integration test.
- **What main's 9 commits actually did to the cancellation function.** I am inferring danger from your own sentence "the cancellation function is the one both sides touched." The diff itself settles it — possibly in my favor (maybe main's changes are trivial).
- **Test coverage of these two functions.** 4,819 passing tests is meaningless for these paths if none target them. `grep -r "getClientPackagePricing\|applyServerDerivedChargeAmount" backend/tests/` settles it in seconds.
- **The §2 measurements** (zero pending migrations, empty migration diff, safe-migrate behavior) I take on trust as stated measurements, not verifiable claims — consistent with the instruction not to re-report them.
- Whether `FALLBACK_PRICES.STANDARD_60_MIN` matches the $175 flat rate — assumed, not shown; if it drifted, every fallback path quotes a wrong list price on the public sheet.

I am most confident about the deploy-plan critique (structural, verifiable from the numbers given) and least confident about Blocker 1's severity — I have flagged it at P1 because the cost of being wrong is another stamped forfeit, and the fix is one token regardless.
