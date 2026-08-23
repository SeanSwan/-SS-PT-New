---
title: "A self-review that converges measures the searcher, not the code"
originating_model: claude-opus-5
tier_gate: PASS
tier_basis: "Sean's explicit designation 2026-08-10 — OPUS 5 IS FABLE TIER; opus5 writes the durable corpus, not quarantine"
date: 2026-08-22
decision: "A dry loop that returns CLEAN is necessary and not sufficient; security-adjacent work gets an external pass before it ships, and the route matrix is enumerated from the ROUTER file, never from the test file"
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder
    did: "Built six client-dashboard slices, ran a five-round dry loop that returned clean, then fixed eight defects an external panel found in one pass"
    cost: subscription
  - model: moonshotai/kimi-k3
    role: reviewer
    did: "On the plan review: found the dual client-side/server-side impersonation gap no other seat saw"
    cost: $0.044
  - model: openai/gpt-5.6-sol-pro
    role: reviewer
    did: "Only REJECT verdict on the code; found the list-scope widening and the denylist ceiling, though its top items were pre-existing architecture rather than diff-introduced"
    cost: $0.39
  - model: z-ai/glm-5.3
    role: reviewer
    did: "Named the category-claim-vs-enumerated-path-list drift class, and caught that a load-bearing claim in my own packet was uncited"
    cost: subscription
  - model: x-ai/grok-4.6
    role: reviewer
    did: "Found the self-contradictory inline consent disclosure and the stale policy comment; warned that my own test mock could be hiding a response-shape bug"
    cost: $0.09
  - model: deepseek/deepseek-v4-flash
    role: reviewer
    did: "Found the P0 participant-escalation hole; best defect-per-dollar on both panels"
    cost: $0.003
  - model: deepseek/deepseek-v4-pro
    role: reviewer
    did: "Found that the health-field flag was advisory rather than enforced"
    cost: $0.05
  - model: qwen-3.8-local
    role: reviewer
    did: "Independently found the same P0 escalation as DeepSeek Flash; found the unwired re-consent prompt"
    cost: $0
  - model: claude-fable-5
    role: judge
    did: "Arbitrated the plan panel: killed 13 items, overruled five seats on the P0 ranking and was right"
    cost: $1.99
skills_touched:
  - name: rule-73-proof-before-done
    change: proposed
    why: "Its 'clean hostile pass' bar was met by a loop that had not exercised the vulnerable route; the bar needs a coverage predicate, not just a round count"
  - name: dry-loop-law
    change: proposed
    why: "Two consecutive CLEAN rounds converged on a P0 still present; convergence should trigger an external pass for security-adjacent diffs rather than end the loop"
  - name: hermes-learning-packet
    change: amended
    why: "Emitted unprompted at substantial close per the 2026-08-13 automatic-trigger amendment"
surfaces: [messaging-authorization-gate, ai-consent-disclosure, de-identification-service, client-dashboard-shell]
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

## What was decided/built (Fable-tier lesson)

Six remediation slices on a production training-SaaS client dashboard, arising
from an external audit whose *plan* had already been hostile-reviewed by seven
models and arbitrated by Fable. The build closed a live revenue defect (a
coaching capability gated on a billing tier, so clients on the largest training
packages were server-side blocked from contacting the trainer they paid),
corrected consent copy that overstated anonymity at the moment of legal capture,
gated non-training health data behind an enforced control, and contained focus
in a drawer that had been pointer-only.

Then the thing worth recording happened. I ran a five-round hostile dry loop on
my own diff. Rounds 2 and 3 found real defects; rounds 4 and 5 came back clean,
which is the defined bar for "dry." A seven-model panel run afterward as a
formality found a P0 in a single pass — two seats independently.

## Why (the rationale Hermes should carry forward)

The P0: a route carried the users being ADDED in its request body. The gate
validated the thread's EXISTING members and never read the body. Because the
membership test passes trivially when the only other member IS the assigned
trainer, a client could create a legitimate thread and then add an arbitrary
stranger to it, exposing history — making the carefully-written create-time
restriction bypassable in two steps.

My five rounds used genuinely different vantages: full suites, a baseline
worktree at unmodified main, a production build, route-shadow analysis,
caller-path tracing down to the SQL predicate. All of them were *mine*. None
exercised that route, because I had never written a test for it — and the thing
that suggests which routes matter is the set of tests already written.

**The loop converged not because the code was clean but because it ran out of
ideas I already had.** Convergence is evidence about the searcher at least as
much as about the searched. A self-review cannot sample outside its own prior.

## Reusable pattern / rule Hermes should apply next time

1. **A converged self-review triggers an external pass; it does not replace
   one.** For security-adjacent diffs this is not optional. Seven seats cost
   under two dollars combined and found eight real defects my loop had passed.
2. **Enumerate the route/method matrix from the ROUTER file, not the test
   file.** Every entry needs coverage before "done." Deriving scope from
   existing tests reproduces the original blind spot exactly.
3. **Where a gate consumes user-supplied identifiers, list every request field
   they can arrive in — params, body, query — and confirm the gate reads all of
   them.** Mine read params and ignored body.
4. **A category claim in user-facing copy cannot be backed by an enumerated
   list in code.** Match the category (key name at any depth) or the copy goes
   false the first time someone adds a new field spelling.
5. **When a comment instructs a future operator to do something first, that
   ordering belongs in code.** Otherwise it is decoration.
6. **Fixing the part you are looking at manufactures confidence about the part
   you are not.** I corrected a bullet list and left the paragraph beneath it —
   which contradicted itself in adjacent sentences and printed a version number
   disagreeing with its own heading.

## Who did what

- **claude-opus-5 (me)** — built all six slices, ran the dry loop that missed
  the P0, then fixed every panel finding. Also produced every mistake below.
- **DeepSeek v4 Flash (~$0.003) and Qwen 3.8 ($0)** — independently found the
  P0. The two cheapest seats on the panel found the most severe defect.
- **GLM 5.3 (subscription)** — the highest-leverage reviewer across both
  panels. On the plan it caught that a load-bearing claim of mine was uncited;
  on the code it identified the category-vs-path drift and named it as a
  *recurring class*, which converted a one-line patch into a structural fix.
- **Grok 4.6 (~$0.09)** — found the self-contradictory disclosure and the stale
  policy comment that would have reintroduced an earlier regression. Also
  warned that my own mock could be masking a production-breaking response-shape
  bug. Verification showed my code was correct — but the warning was right to
  make, and I could not have known without checking.
- **DeepSeek v4 Pro (~$0.05)** — caught that the health-field flag was a
  caution, not a control.
- **Sol 5.6 Pro (~$0.39, most expensive)** — sole REJECT, substantively right,
  though its two highest-severity items were pre-existing architecture rather
  than introduced by the diff.
- **Fable 5 ($1.99)** — on the earlier plan panel, overruled five of seven
  seats on which defect ranked first and was correct: they had ranked without
  knowing the block was server-enforced.

## Skills created or changed

No new skill. One control was hardened from advisory to enforced: enabling
gated health fields now requires a declared consent version matching what the
build demands, failing CLOSED on mismatch and logging critical. The reusable
shape is that a required ordering between an operational action and a
disclosure update must be a code-level precondition, not a comment.

Two doctrine amendments are *proposed*, not made: the proof-before-done bar and
the dry-loop law both treat "a clean hostile pass" as sufficient, and this
session is a counterexample. Both should carry a coverage predicate — every
router entry exercised — rather than a round count alone. Flagged for Sean; not
edited unilaterally.

## Mistakes I made

1. **Declared a dry loop clean while a P0 sat in an unexercised route.** Two
   consecutive clean rounds, and the hole was reachable from a visible button.
2. **Wrote copy claiming a category while the code enforced a path list** —
   after the identical mismatch had already caused a regression earlier the
   same day.
3. **Gated data an existing test explicitly labelled safety-critical.** The
   test name contained the word; I met it as a red bar rather than by reading
   the suite first.
4. **Misapplied a principle minutes after articulating it.** I escalated
   whether injuries should be withheld, explained that withholding them makes
   coaching unsafe, got a split decision — then applied it to injuries and not
   to medical conditions, which sat in the same bucket for the same reason.
5. **Claimed an acceptance criterion I never verified** — "new consent version
   recorded on grant." The frontend never sent it, so grants recorded under the
   old version, making the corrected disclosure indistinguishable in the audit
   trail from the text it replaced.
6. **Shipped a self-contradictory disclosure by only fixing the text above it.**
7. **Left a stale policy comment naming a field as denied** hours after moving
   it to protected — the single artifact most likely to bring the regression
   back.
8. **Left dead code** after replacing the loop that consumed it.
9. **Wrote a "single source of truth" docblock that was untrue** of the
   component that mattered most.
10. **Nearly recorded a false negative from my own truncated search** — a
    `head -8` hid a route mount and I began concluding a surface was dormant.
11. **Asserted a load-bearing claim without a citation**, caught by an external
    reviewer auditing my evidence rather than by my own review.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Category claim vs enumerated list | 2 | yes — same day, one round earlier | External seat naming it as a recurring class |
| Caution written where a control was needed | 1 | **yes, already in this corpus** | External seat |
| Doc/comment/copy drifting from code in-session | 5 | yes, repeatedly | Panel review — never self-review |
| Trusting a spec over the tree | 3 | yes — existing rules | Opening the file the spec described |
| Absence claimed from a truncated probe | 1 (7th overall) | yes, six times | Re-running with no limit |
| Acceptance criterion asserted, not verified | 1 | yes | External seat |
| Principle stated but not applied to all members | 1 | no | A full-suite run |

Two entries deserve emphasis.

**"A caution is not a control" is already a durable lesson in this corpus, and
I wrote a caution anyway** — inside a privacy control, in a session where that
principle was in front of me. Writing a lesson down does not install it.

**The truncated-probe error is now at seven occurrences.** Every prior write-up
said some version of "be careful with searches." That has demonstrably not
worked. The correction that survives is procedural and checkable: *an absence
claim requires a search with no `head`, no `-m`, and no inverse filter, re-run
and shown.* If the output is too long to read, that is evidence the claim is
wrong — not a reason to truncate.

The pattern across the whole table: **every recurrence was stopped by an
external reader or a mechanical check, and none by re-reading my own work.**

## External-model calibration

| Model | Cost | Findings real on verification | Worth paying for |
|---|---|---|---|
| Qwen 3.8 (local) | $0 | P0 escalation, unwired re-consent | Always run — free and it found the worst bug |
| DeepSeek v4 Flash | ~$0.003 | P0 escalation, copy/code gaps | Best value on the board, both panels |
| GLM 5.3 | subscription | Uncited claim, category drift, list widening | Highest leverage; names failure *classes*, not just instances |
| Grok 4.6 | ~$0.09 | Inline disclosure, stale comment, mock-shape warning | Strong on artifacts others skim past |
| DeepSeek v4 Pro | ~$0.05 | Advisory-flag-not-control | Overlapped Flash on the plan; earned its place on the code |
| Sol 5.6 Pro | ~$0.39 | List widening, TOCTOU, denylist ceiling | Thorough, but skews to pre-existing architecture over diff defects |
| Fable 5 | $1.99 | Arbitration only | The only seat that can overrule a majority correctly; worth it at decision points, not for detection |

**Routing conclusion, empirical rather than asserted: spend does not predict
detection.** The two cheapest seats found the most severe defect on both
panels. The most expensive reviewer produced the one recommendation the judge
overruled. Money buys *arbitration* — a defensible ruling when reviewers
disagree — not *finding*. Run the free and near-free seats always; reserve
Fable for the decision, not the search.

## Risks / guardrails

- The de-identification layer remains a **denylist**, so an unrecognised field
  or a name typed into a free-text note is still forwarded. The consent copy
  was reworded to stop promising otherwise; the real fix is an outbound
  allowlist DTO and is tracked, not done.
- Withholding sleep and stress costs recovery-aware programming. That cost is
  recorded inside the re-anchored test so it is not rediscovered as a bug.
- Authorization checks and the writes they authorize remain separated in time
  (a TOCTOU window). Pre-existing pattern, flagged, not addressed here.
- No authenticated browser pass was possible, so real-device rendering, socket
  behavior and field metrics remain unverified.
- The full frontend suite is nondeterministic under parallel load **on
  unmodified main** — a baseline control run failed on different files than the
  branch did. Treat any single full-suite failure as unattributed until a
  baseline comparison is run.

## Provenance & privacy

`originating_model: claude-opus-5` — Fable-tier by Sean's designation
2026-08-10; corpus-eligible, not quarantine. Secret scan run over every changed
file and every emitted artifact: 0 hits. IDs and roles only; no client names, no
medical or personal data, no credentials, no absolute paths, no hostnames.
