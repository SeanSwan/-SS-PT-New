---
decision: "Both GLM seats return MERGE WITH CONDITIONS. Three of the four verifiable conditions were checked against the code and closed; one (Render instance count) is console config and belongs to Sean. The merge commit itself remains blocked on a guard bypass that is Sean's to approve."
status: open
supersedes: none
---

# SYNTHESIS — merge decision, Swan Coach ownership

**Seats:** GLM 5.3 (10726 out, 8685 reasoning, 246.9s) · GLM 5.3 Flash (9807 out, 8014 reasoning, 202.5s).
**Cost:** $0.00 — subscription-billed, no spend gate.
**Both verdicts: MERGE WITH CONDITIONS.**

---

## READ THIS BEFORE WEIGHING THE AGREEMENT

**These two seats are the same lab.** GLM 5.3 and GLM 5.3 Flash are both Z.ai. Their convergence
is **one lab answering twice, not independent corroboration** — this is precisely the failure the
predecessor handoff records in §7.3, where Ox Alpha turned out to have been GLM-5.3 Flash all
along and months of "two seats independently agreed" collapsed into one prior sampled twice.

Count this as **one strong opinion, cross-checked against the code**, not as two. The
verification tally below is what carries weight here — not the fact that both said the same thing.

---

## Verdict table

| Q | GLM 5.3 | GLM 5.3 Flash | agree? |
|---|---|---|---|
| Q1 TOCTOU | Not a blocker; follow-up must fix both callers inside the row lock | Same; withdraws nothing | yes |
| Q2 flush | My reading correct on both halves; item #1 should be withdrawn | Same, plus a construction-level argument | yes |
| Q3 rollback | `git revert -m 1` on main; **refuse** the env-gated bypass outright | Same; kill switch is *irrelevant*, not merely incomplete | yes |
| Q4 sequencing | None of 1–8 is a pre-merge blocker; item 1 first post-merge, fold 8 in | Same; **withdraws its own ranking above the merge** | yes |
| Q5 guard | (a) bypass this commit with proof, then (c) exemption as its own PR | Same | yes |

---

## What was VERIFIED against the code (Rule 30 — findings are hypotheses until checked)

GLM 5.3 raised three mechanisms that could have partially resurrected the handoff's pre-deploy
item #1. All three were checked and **all three are closed**:

| mechanism | check | result |
|---|---|---|
| A shutdown/SIGTERM drain persists the Map | `grep -nE "SIGTERM\|SIGINT\|beforeExit\|process\.on\|drain\|persist\|writeFile"` on the module | **ABSENT.** Only hit is a comment about the cleanup timer's `unref()`. No handler, no persistence. |
| A second redemption path reaches HMAC verification with an id absent from the Map | repo-wide grep for `SIGNATURE TAMPERING DETECTED` | **IMPOSSIBLE.** Exactly ONE emission site, `destructiveOperations.mjs:170`, inside `verifyAndRetrieveOperation` — past the `!operation` guard at `:146`. |
| A durable artifact (email link, queued job) shares the HMAC payload constructor | repo-wide grep for `signOperation` / `verifySignature` + the module's export list | **NONE.** Both functions are module-private (absent from the six `export function` lines); only four call sites, all internal. The single external hit is a test asserting on the literal string. |

**Net: the Q2 conclusion is airtight** — the pending-operations flush is a no-op, the deploy is the
flush, and the predicted signature failures cannot fire from this cause.

**NOT verifiable by me — belongs to Sean:** the **Render instance count**. Both seats raised it
independently of each other's answers. It does not change the merge decision; it changes the
*character* of the residual risk. Single-instance → confirmations minted in the ≤120s before
restart are lost, identical to every restart today. Multi-instance without sticky routing → a
steady low rate of "Operation expired or not found" forever, because a confirm minted on instance
A can land on instance B. That is a pre-existing availability nuisance, not a hole, and not
introduced by this branch — but it is invisible to a single-machine test run.

---

## The one place the two seats DIFFER — and the synthesis is better than either

Both proposed the same guard-exemption predicate in substance, but anchored it differently:

- **Flash:** exempt iff the violating path's blob OID equals the blob OID for that path in
  **`origin/main`'s tree**. Explicitly argues this "eliminates parent-order games entirely."
- **GLM 5.3:** require **`MERGE_HEAD` exists** (a true merge, not a squash) AND the blob equals
  **the second parent's** blob.

Each caught something the other missed. GLM 5.3's `MERGE_HEAD` requirement is necessary — Flash's
predicate as written would apply to a squash. Flash's `origin/main` anchor is safer — GLM 5.3's
second-parent anchor exempts content from *whatever* was merged in, which need not be `main`.

**Take the union, which neither stated alone:**

> Exempt a G1–G5 violation **iff** `MERGE_HEAD` exists **AND** the violating path's blob OID in the
> commit under test equals that path's blob OID in **`origin/main`'s tree**. Everything else
> hard-fails. Every exemption is logged with path + both blob OIDs.

Abuse analysis holds under the union: exempted content must already be byte-present on the default
branch, so a poison branch cannot launder anything not already deployed; modifying a file to
smuggle a violation necessarily changes its blob, which lands it in the checked set; and requiring
`MERGE_HEAD` blocks the squash path Flash's version left open.

---

## Conditions, consolidated and de-duplicated

**Blocking on Sean:**
1. **Approve or refuse the guard bypass** for the sync-merge commit. Both seats say approve, with
   the blob-SHA proof in the commit message and the secret scan run manually (already done, CLEAN
   on 242 files). The guard-exemption PR then lands **separately**, on its own merits — both seats
   were emphatic that changing a guard in the same motion as the merge it unblocks is how guards
   acquire holes.
2. **Confirm Render instance count** (console, ~2 min). Does not gate the merge; determines whether
   the residual is a deploy-time event or a per-request one.
3. **GLM 5.3's condition 4, which neither I nor Flash raised:** the gate has been observed by
   **one agent on one machine**, and merging *is* deploying. Either unblock Actions
   (github.com/settings/billing) or have a second operator re-run
   `node backend/scripts/test-baseline-gate.mjs` before merge. This is the condition I am least
   able to satisfy myself and the one most worth taking seriously.

**Pre-merge, mechanical:**
4. Pin the **exact literal deny string** the new gates emit — one grep at merge time; GLM 5.3
   explicitly says do not trust anyone's memory of it, *including its own*.
5. Pre-stage the rollback: `git revert -m 1 <merge-sha>` on `main`, name who has push rights, and
   confirm Render auto-deploys a revert push. Accept explicitly that reverting **reopens the five
   live holes** — which is why the trigger threshold matters.

**Rollback trigger (both seats, refined by GLM 5.3):** not one anecdote. Revert when a denial is
*confirmed false* — a Coach-lane ownership denial whose trainer has a live assignment row for that
client, i.e. the same trainer loads the same client over REST but is denied in Coach. Hand-check
the first ten denials against the assignments table; a clean cross-check means the gates fire true.

**Refused outright by both seats:** the env-gated bypass valve as a rollback mechanism (option b in
Q3). GLM 5.3: "you would be installing a worse defect class than the one you're rolling back," and
the same species of shortcut as open item #8's signed-but-unread `operation.endpoint`.

**Post-merge order (both seats agree):** item **1** (ownership-derivation registry) first, with
item **8** folded into the same registry pass so the signed-but-unread field is deleted before
anyone revives it → item **6** (no mint quota / rate limit — the only item with a cost curve) →
item **3** (TOCTOU, fixed once inside the lifecycle service's lock so both callers inherit it) →
item **4** → items **5**/**7** as scoped debt → item **2** (fixtures) whenever.

**Flash withdrew its own ranking of item 1 above the merge** — its stated reason: the inventory's
value accrues identically whether the merge lands first or not, the comparator is never "ship clean
vs ship dirty" but "five holes closed + unknown N vs five holes open + unknown N," and the audit is
strictly *worse* executed on a branch 87 commits behind `main`. Cut the audit branch from `main`
immediately after the merge.

**Handoff item #1 should be rewritten**, not deleted: from "flush the store" to "verify
single-instance; confirm no durable consumer of the new payload shape" — the second half of which
is now verified closed above.

**One inversion worth carrying to production:** per Flash's Q2 corollary — if
`SIGNATURE TAMPERING DETECTED` *does* fire in the first hour, it is **not** deploy noise. It cannot
be caused by this deploy. It would be a real and different problem.
