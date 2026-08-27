# BRIEF — merge-and-deploy decision, Swan Coach ownership authorization

**You have already reviewed this code for seven rounds and returned DRY. This is not another
code review. Do not re-audit the diff.** Every question below is a *ship/no-ship* question that
a code read cannot answer. If your answer to a question is "I already covered this", say so and
move on — do not manufacture a finding to fill space.

---

## The decision on the table

Branch `claude/coach-endpoint-truth-v2-20260824`, 49 commits ahead of `origin/main`, 87 behind.
Sean wants to merge to `main` and go live. **In this repo `main` auto-deploys to Render, so
merging IS deploying to production.** There is no staging step between the merge and real users.

The change closes five live cross-tenant authorization defects in the Swan Coach natural-language
command lane — a lane where commands never travel over HTTP routes, so no route middleware runs
and every protection a REST route gets for free must be performed by the lane itself.

## What is proven

- Backend suite **9757 passed**; 25 known-failing tests across 23 files matching a per-test
  baseline exactly (gate exit 0). The gate compares tests and normalized failure reasons, not
  file names — it was rewritten this arc after it was found to be comparing file names only.
- **46/46 mutations fire.** Every one of 46 deliberate breakages is caught by the tests; every
  file restored byte-identical by sha256.
- `node --check` clean, registry import smoke 139 commands, no import cycle, secret scan clean.
- Zero frontend files changed.

## What is NOT proven — do not let silence imply coverage

- **No CI has ever run any of it.** GitHub Actions is billing-blocked at the account level. 9757
  passing tests have been observed on exactly one machine, by one agent.
- **Dispatcher self-gating.** Handlers are mocked throughout. No handler is shown to refuse on
  its own if reached by another path.
- **Real SQL.** The test fake mirrors the resolver's predicates; PostgreSQL is never consulted.
- **A role changing DURING dispatch.** Only mint-to-redemption is closed.
- **TOCTOU on plan archive** — the access check sits outside the lifecycle service's row lock.

---

## Q1 — Is the TOCTOU window shippable?

The access check on workout-plan archive sits outside the lifecycle service's row lock. The
already-live REST route to that same service (`verifyClientAccessByPlanId`) has the **identical**
structure, so this window is *shared with production today* rather than introduced by this branch.
Fixing only the new caller would recreate the asymmetry this whole arc removed.

Both of you saw this and left it accepted. **Confirm or withdraw that:** does it block the merge,
or is it correctly a follow-up that must fix both callers together? If it blocks, say what the
exploit path looks like at this repo's actual scale.

## Q2 — The pending-operations flush. I believe the prior handoff is wrong; check me.

The previous handoff lists as pre-deploy item #1: *"Flush the pending-operations store during
deploy. Adding clientId to the HMAC payload invalidates the signature of every in-flight
operation, and the new denials consume the single-use operation... it will generate signature
failures in the first hour if not flushed."*

I read the file and believe **both halves of that are wrong**:

1. `pendingOps` is a module-level in-memory `Map` in `backend/services/ai/destructiveOperations.mjs`
   (line 17). There is no Redis code path in the file at all — the only mention of Redis is a
   comment. A deploy restarts the process, so the Map starts empty. **The deploy is the flush.**
   There is nothing to flush and no script to write.
2. An unknown operation id returns `'Operation expired or not found. Please re-issue the command.'`
   at the `if (!operation)` guard, *before* any HMAC verification is reached. So the predicted
   "signature failures" — and the `SIGNATURE TAMPERING DETECTED` error-level log — **cannot fire
   from this cause.**

My conclusion: the real residual risk is that any confirmation minted in the ≤120s before the
restart is lost and the user re-issues it, which is identical to the behaviour of every restart
today and is unchanged by this branch.

**Is that reading correct?** If I have missed a persistence path, a multi-instance concern, or a
caller that reaches signature verification with an id that is absent from the Map, say so
concretely with the mechanism. This is the item I am most likely to be wrong about, because I am
the one who wants it to be simple.

## Q3 — Rollback plan if a denial path misfires in production

The failure mode that worries me is not a hole; it is the opposite — a *legitimate* trainer or
admin denied access to their own client because a new gate is too strict. Blast radius: the Coach
command lane only.

Known lever: `AI_COMMAND_WRITES_ENABLED=false` pauses writes but **not reads** — and defect #1 was
a read (`view_xp_streaks`). So the kill switch does not cover the whole change.

**What is the correct rollback?** Options as I see them: (a) revert the merge commit and let
Render redeploy, (b) an env-gated bypass added before merge — which means new unreviewed code,
(c) accept forward-fix only. Which, and what is the detection signal that should trigger it? Name
the specific log line or metric someone should watch in the first hour.

## Q4 — Sequencing: which open items must precede go-live?

Ranked backlog from the handoff. Tell me which of these are **pre-merge blockers** and which are
correctly post-merge:

1. **Ownership-derivation registry field** — a required per-command declaration
   (`from_record` / `from_client_ref` / `n/a`) plus an enumeration contract. Its failing list *is*
   the residual-risk inventory: it answers whether a second live cross-tenant hole exists among the
   138 handlers nobody has read. (This was GLM Flash's idea and is ranked #1.)
2. ~56 under-specified assignment stubs returning `{id: 1}` across ten suites — fixture migration,
   no production behaviour change.
3. TOCTOU (Q1).
4. Dispatcher self-gating — defence in depth behind three now-proven gates.
5. Admin name resolution breaks past 50 clients (`LIMIT 50` fuzzy path) — pre-existing, real at
   gym scale.
6. No rate limit or mint quota on a lane that runs a classifier per request.
7. `allowedRoles` untrustworthy for 54% of registry rows — inherited, unclear what depends on it.
8. `operation.endpoint` is signed and never read — latent invitation to revive a shortcut.

**The specific tension I want you to resolve:** item 1 is ranked above merging by the agent who
wrote the handoff, on the grounds that it answers whether a *second* live hole exists. The
counter-argument is that five holes are closed today and shipping that is strictly better than
the status quo while item 1 is built. Which ordering is right, and why?

## Q5 — A guard now blocks the merge mechanically. Which way out?

Merging `origin/main` into the branch auto-merged with **zero conflicts**, but the pre-commit
frontend guard refused the merge commit: 17 `G4 hardcoded-hex` (Rule 6) violations, **all 17 in
one file**, `AiConsentScreen.tsx`, which the merge takes from `main` verbatim — the staged blob
SHA is byte-identical to `origin/main`'s blob for that path. Those violations are already on
`main` and already deployed. This merge authored none of them.

`frontend-guards.mjs` has **no merge-commit exemption**, so `git merge origin/main` is blocked
for *any* branch whenever `main` carries a G1–G5 violation. The guard already encodes the
pre-existing-debt principle for G6 (its own comment cites Rule 34) but not for G4.

Three ways out, none obviously right:

- **(a)** Bypass the hook for the merge commit only, with the blob-identity proof recorded. The
  guard's own text says "fix the line, do not bypass". The secret scan would be run manually so
  it is not lost.
- **(b)** Fix the 17 hexes in `AiConsentScreen.tsx`. It is `main`'s file, likely owned by another
  lane, and this adds unreviewed frontend churn to a branch reviewed to DRY.
- **(c)** Add a merge-commit exemption to the guard — correct long-term, but it is a change to a
  safety mechanism made under pressure to get a merge through, which is the worst reason to
  change a guard.

Which, and why? If (c), what is the exemption's exact predicate so it cannot be abused to launder
real violations through a merge commit?

---

## Answer format

For each of Q1–Q5: a direct verdict sentence first, then the reasoning. Finish with a single
line: **MERGE / MERGE WITH CONDITIONS (list them) / DO NOT MERGE (state the blocker)**.

Treat your own prior findings as settled. If you have nothing to add to a question, the useful
answer is "nothing to add" — not a new finding.
