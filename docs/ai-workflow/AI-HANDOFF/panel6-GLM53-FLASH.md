# GLM Consult

**Model:** glm-5.3-flash
**Document:** .ai-workflow/fusion/panel6-contract-and-extraction.md
**Tokens:** 1627 in / 10248 out (reasoning: 7466) | total 11875
**Wall:** 303.5s

---

# Hostile review: the gate is necessary, not sufficient. As specified, it would pass a port that reverts a proven-critical guard — because it has no assertion on that guard.

Verdict up front, then the five attacks.

---

## 1. Contract sufficiency: six named holes

Going area by area against your own table:

**M-1. No event-count/idempotency assertion (money authority).** "Already-cancelled refused" catches sequential double-cancellation, which is the *naive* double-grant. It does not catch: two concurrent cancels passing the TOCTOU check, or a refunded-but-balance-netted-correct sequence where deduction fired twice and refund compensated. Final-balance assertions pass; ledgers corrupt. Missing assertion: *"cancellation emits exactly one deduction event and one refund event; N concurrent cancels yield exactly one"*. This is literally the class of bug main just fixed, and the contract cannot see it.

**M-2. Zero coverage of the reschedule ownership guard.** The most dangerous fact in your own brief: a commit titled *"re-land the reschedule ownership guard — a proof step reverted it"* proves this specific guard is empirically the thing that gets lost during proof steps. The contract's "who may bill" area tests billing authorization only. Missing assertion: *"trainer not owning session cannot reschedule it → 403"*. Run this assertion today against a simulated revert of that commit and I predict 0 red. That prediction is the whole argument.

**M-3. Transaction-membership assertion is untestable as built.** You assert the lookup "runs inside the caller transaction." Against what? With no live DB and mocked models, mocks don't roll back. That assertion is either vaporware or rests on observing mock call order, which proves nothing about commit semantics. Say which.

**M-4. `'users'` vs `'Users'` alias drift sails through.** 21 models reference `model: 'users'` against 144 using `'Users'`. Association/alias drift throws — or silently mis-joins — only when real SQL executes. Your gate executes zero real SQL. Combined with "local dev resolves DATABASE_URL to production," the first real execution of this port's queries may be against production data. Every mocked assertion inherits this blindness; name it in the contract's threat model rather than letting readers assume otherwise.

**M-5. "No clamping" as an assertion locks the door behind you.** Disambiguate: does the contract forbid *silent mutation* of the operator figure (defensible), or require *passthrough of any figure* (then the gate affirmatively rejects any future sanity guard)? If a test feeds an implausible figure expecting it to survive unclamped, you've contractualized the absence of a ceiling. These are different assertions; the difference decides §3.

**M-6. Untested side-effect surface.** Cancellation almost certainly notifies someone (there are email flows; one had to be security-fixed). No assertion pins "cancel produces client-visible consequence" or even "audit log line contains `chargeAmountSource`." Given the owner's #1 priority is acquisition, silently dropping the cancellation notification is a churn generator no test notices. Also nothing pins HTTP status codes or error taxonomy — the email-oracle fix lived exactly at that boundary.

## 2. Positive controls: you proved the tests can fail, not that they detect

n=2, and both mutations were **selected by the contract's authors against assertions the contract explicitly makes** (the advisory figure; the forfeit window). That's white-box demonstration of wiring — "our targeted assertions fire" — not a measurement of sensitivity. The real failure mode of a port is loss of code the testers didn't anticipate targeting. Sampling that space requires mutating things the contract *doesn't* claim to own.

Demand three more simulations, each predicting the red count *before* running:

| Simulated mutant | Basis | Predicted red |
|---|---|---|
| Revert reschedule ownership guard | It has happened, verifiably, once | 0 |
| Drop already-cancelled guard / duplicate refund | The double-grant critical | 1–2 |
| Swap derived $175↔$110 | The wrong-order incident | ? |

Any zero is a pre-known hole instead of incident #2. Generalize: enumerate main's money/security commits from the two months, require each to map to ≥1 red on simulated revert, publish the kill list with the contract.

Second problem: your mutants flip only 1–2 of 16 tests. Either the other 14 are redundant decoration, or each is protecting narrow slivers — either way you should know. Third, cross-contamination: the repo ships **15 permanently red backend tests**, so "red" is ambient noise. The gate must be evaluated as an exact delta — contract file fully green standalone, whole-suite pass-set byte-identical pre/post port — or a port-induced red drowns in baseline.

## 3. The advisory design: reversal correct, current form incomplete, and the third option exists

The reversal was right, and the reasoning is better than "overrides caused defects": **the schema cannot answer "what product funded this session." When the ground truth is unanswerable, any acted-upon inference is a coin flip wearing authority.** Full stop.

But attack advisory honestly and it has a dirty secret: **it doesn't remove inference from the money path — it launders it.** A UI showing "$110 (suggested)" next to a free-text field on a busy trainer is an override delivered by nudge; the trainer rubber-stamps, the record says `chargeAmountSource: 'operator'`, and the label lies. Nobody chose $110; $110 was chosen and initialed. If you keep advisory, record suggestion-exposure (shown? accepted-without-edit?) — which collides with your known-open "logged, not persisted" item, so the honest statement is: the audit trail for nudged overrides doesn't exist yet.

On "free-typing money with no guardrail" — the panel's dichotomy (silent clamp ↔ no ceiling) is false, and the third option falls straight out of the business facts:

**Refuse-and-confirm.** In a two-rate business, the legitimate figure space is `{0, 110, 175}` plus rare authorized specials. Reject the transaction when the entry falls outside a sane envelope, returning *both* figures to the operator: "You entered $1,750. Nearest supported rate is $175. Re-enter, or record an intentional override with reason." Properties:

1. Never mutates the operator's figure — no silent clamp, ever.
2. Never substitutes server arithmetic — no inference reaches the ledger.
3. Adds friction exactly where the error base-rate is highest (decimal slips, rate confusion), zero friction where it isn't.

$17.50, $1,750, $17,500 — every historical catastrophe's magnitude would bounce off this. Two independent seats recommending reversal, plus $33,600 of scar tissue, bought you the knowledge that **decide vs. confirm** is the axis that mattered; both panels stayed on the wrong axis (who computes the number) when the right one is **who confirms the commit**.

Implementation notes: envelope constants, plain validation-layer rejection, no schema change — extends the validation area your contract already owns (add "implausible magnitude → refused with guidance" next to "non-positive rejected"). The durable override-reason wants a column, migrations are gated; interim compromise: structured log now, ticket the column, don't squat `cancellationReviewReason`. The *real* fix for suggestion quality — duration on `StorefrontItem`, FK `Session→OrderItem` — stays a schema-gated ticket, as you've scoped it. Don't relitigate it here.

## 4. The port procedure: three specific failure points

**The freshness problem.** "Zero main-side divergence" was verified against *some* SHA, some day. Main takes money-path hotfixes routinely (that's the premise). `git checkout <tip> -- <four files>` at extract time re-verifies nothing. Requirement: divergence re-check in CI, on pinned SHAs, gate fails if any appears. This is mechanically cheap and directly addresses how the reschedule guard got reverted last time.

**Transitive seam drift.** Divergence is file-scoped; behavior is in the transitive closure. The four "clean" files import helpers main has spent two months changing: options-object vs positional signatures with compatible types (tsc blind), async callbacks now expected to report failures, new side effects inside shared helpers, module-load-order/circular-init issues if the branch's files associate models main registers differently. None of this is caught by compiling or by a contract of 16 function-level tests. Requirement below (§5) closes this.

**Hand-port fidelity is unaudited.** Two months, 21 commits, human transcription, and a documented history of silent reversion — "specific functions hand-ported onto main's versions" with no specified verification is the weakest step in the chain. Requirements: (a) generate the exact hunks per function and `git apply -3`; conflicts become explicit artifacts, not judgment calls; (b) per-function AST diff of ported-source vs landed-code with justification per delta; (c) a **defense inventory**: every money/security fix from main's 9+12 commits listed, each marked kept/adapted/dropped, each mapped to its main-side test — then run the **full main suite (4,836 tests) on the extracted tree and demand delta = 0** against the 15-test baseline. That single requirement converts silent reversion from possible to impossible-except-via-suite-blindspots, which is exactly what a money path deserves. Signature-changed-underneath scenarios are caught by tsc-on-extracted-tree (production files only — see §5) plus the delta-zero run; the branch-added-helper-with-aliased-semantics scenario needs the boot-level test, hence §5.

(Separately: the legacy unmounted `/api` session router is dead weight accumulating future confusion. Ticket its deletion. Not this review's job. Noted once.)

## 5. Untested gaps, triaged

**Close first: boot-the-server-and-hit-HTTP on the extracted tree, against a containerized Postgres in CI.** Supertest or equivalent, spinning Express with the canonical mount walk. One gap closed, four failure modes caught simultaneously: mounting/shadowing reality (your canonical-surface section exists *because* nobody boots the router in tests), auth middleware presence (revert the reschedule guard or resurrect an unauthenticated route → immediate red, covering M-2), **real SQL executing** (catches alias drift, association breakage, and makes the "inside the caller transaction" assertion falsifiable), and 403-vs-leak error taxonomy. If the 24-hour boundary test is timestamp-precision sensitive, that alone dictates Postgres over sqlite in the harness.

**Close second: tsconfig coverage of tests.** Excluded-from-typecheck test files rot — mistyped expectations, dead assertions, `expect(x).toBe('175')` passing against number coercion noise. This threatens gate *durability* more than the port itself, but ports are exactly when the contract must be trustworthy. Pragmatics: a `tsconfig.test.json` scoped to new test files; don't boil the legacy ocean.

**Close last: browser E2E.** Flaky, expensive, and the port damage lives server-side. The correct substitute for a solo operator is a ten-minute manual smoke script pre-promote: on-time cancel at 23.9h/24.1h, late forfeit stamps, an absurd-figure entry behaves per the §3 policy, the operator figure survives untouched. Write it down; tribal memory is not a gate.

**Adjacent but urgent given your constraints:** "local dev resolves DATABASE_URL to production" plus "no staging" means the first real-SQL execution of this port (see M-4) could be prod. Cheapest available levers: hard-default dev to a local/docker URL with an explicit opt-in flag for prod URLs, and a Render preview environment with a fresh database as the soak step before promoting to the real deploy. Single-trainer scale excuses you from load infrastructure, not from pointing dev at the wrong database.

---

## What would change my verdict

Contract: keep it, add M-1 (event-count idempotency), M-2 (reschedule authz — non-negotiable given the commit history), M-5 disambiguation, and either implement or retract M-3. Controls: publish a kill-list keyed to main's actual money/security commits; require the reschedule-guard and double-refund mutants die. Design: adopt refuse-and-confirm; instrument suggestion exposure or admit the audit trail doesn't exist. Procedure: pinned-SHA divergence recheck, mechanized hunks, defense inventory, **full-suite delta-zero**. Testing: HTTP-boot harness on real Postgres, period.

As it stands, this gate proves the port preserved sixteen behaviors. It does not prove the port failed to destroy the seventeen through twenty-one — and the historical record of this repository says that's where it dies.
