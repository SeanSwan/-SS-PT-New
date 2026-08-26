---
surface: vs-claude
utc: 20260826T230000Z
topic: A sentinel meaning both "no restriction wanted" and "restriction failed" resolves to the permissive one
tags: [swan-coach, authorization, fail-open, panel-review]
---

## What I did / learned
- Ran an enhancement/gap hunt (broader than a bug hunt) with GLM 5.3 and GLM 5.3 Flash after
  four hostile rounds had already reached DRY. Two real defects, both in code the four rounds
  had read.
- **The resolver fail-OPENED.** `resolveClient` computed
  `hasTrainerScope = Number.isInteger(parseInt(trainerId)) && > 0`, and a false there meant
  NO SCOPE CLAUSE — the admin-wide query. A trainer whose own id was missing, zero, negative
  or unparseable was served UNSCOPED rather than refused.
- **The transferable shape: one value carried two meanings, and the code acted on the
  permissive one.** `hasTrainerScope === false` meant BOTH "no scope was requested" (correct
  for admin) and "a scope was requested and could not be computed" (must deny). Collapsing
  those into one boolean is what made the failure silent.
- **The asymmetry is how it was spotted, and it is the general detection method.** The sibling
  helper `assertAssignmentOrAdmin` returns false on an unparseable requester id. Two helpers,
  one input class, opposite answers. When two pieces of code answer the same question
  differently, one of them is wrong — that comparison finds bugs no single reading does.
- **Denial with no server-side record.** The plan-archive handler answered 404-shaped (correct
  — an id-walker must not learn what exists) and recorded nothing. Response opacity was the
  design; server-side silence was an oversight, and it made the enumeration attack the design
  anticipates invisible in the only place detection could live.

## Why it matters to Hermes
- When Hermes reviews any scoping/tenancy code, the question is not "is there a check" but
  "what does the check do when it cannot decide". Fail-open hides behind a boolean that reads
  as an ordinary negative.
- The detection method generalises: find two helpers that answer the same question and diff
  their behaviour on bad input. In this codebase that pair was `clientResolver` and
  `assertAssignmentOrAdmin`, and the divergence was a live hole.
- A 404-parity denial is only half a design. The other half is that the operator can still see
  it. If Hermes is asked to review a "we return 404 so attackers learn nothing" pattern, ask
  where the denial is recorded.

## State right now
- Branch `claude/coach-endpoint-truth-v2-20260824`, 16 commits, clean tree, NOT pushed.
- Both fixes shipped with tests; 42/42 mutations fire; full backend 9742 passed with the
  failing set matching the per-test baseline exactly.
- Recommended next slice CHANGED on the panel's strength: a required registry field declaring
  how each id-taking command derives ownership, plus an enumeration contract whose failing
  list is the residual-risk inventory. Ahead of the test-stub migration.
- Open and unacted: admin name-resolution breaks past 50 clients (`LIMIT 50`); in-flight
  confirmations die at deploy now that `clientId` is in the HMAC payload; no rate limit or
  mint quota on the lane; nothing watches the denial audit rows.

## Mistakes I made
- **I claimed a sweep proved every id-class was guarded, and the sweep was manual.** It was
  correct on the day and encoded nowhere, so it protected exactly the commands that existed
  when I ran it. A panel called the one command that does it right "accidental" — fair, and
  it is why the next slice is now an enforced invariant rather than another sweep.
- **Missed a fail-open in a file I had read four times this session** — including while
  writing a mutation against the very branch three lines away. Reading for one defect class
  makes you blind to another in the same lines.
- **Three mutation anchors invalidated by my own edit**, because reshaping the denial branch
  moved the lines they pointed at. Caught only because the harness reports ANCHOR separately
  from SURVIVED — collapsing those two would have sent me to rewrite three working tests.
- **Weighted two seats as independent when they were one lab.** Corrected mid-session when the
  stealth listing was revealed; the triage was redone counting by lab.

## External-model calibration
- **glm-5.3**: 9 findings → 2 real and fixed (one HIGH fail-open, one MED audit gap), 1
  disproven, rest scope/known. Best signal-per-finding of any seat used this session, and its
  next-slice argument in an earlier round changed what I built.
- **glm-5.3-flash** (formerly listed as Ox Alpha): 4 findings → 0 directly actionable, but its
  HIGH was structurally right with a factually wrong example, and its proposed fix is now the
  recommended next slice. Verdict: worth calling for structure, verify every concrete claim —
  its example failed on the first file I opened.
- Both are Z.AI. Their agreement is one prior sampled twice, not corroboration. Cost $0.00.

## Sean owes / blockers
- Merge/deploy decision on 16 unpushed commits; GitHub Actions still billing-blocked.
- Deploy checklist: flush the pending-operation store, or in-flight confirmations minted
  before this ships fail signature verification for up to 120s after go-live.
- Product call: admin/trainer client-name resolution past 50 clients — raise the limit, or
  move to database-side similarity.
- Fable and GPT-5.6 Sol reviews are out with Sean; their verdicts get verified per finding
  before anything is acted on.
