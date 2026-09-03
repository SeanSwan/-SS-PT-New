---
title: "The step before your gate absorbs your probe"
originating_model: "claude-opus-5"
tier_basis: "Sean designated claude-opus-5 Fable-tier 2026-08-10. This session did the implementation, the measurement, the hostile pass and every mutation itself; no paid seat was consulted."
privacy: "IDs and roles only. No client names, no PII, no credentials, no key values. Secret-scanned clean before commit."
date: 2026-08-26
surface: "Swan Coach command lane — authorization contracts"
decision: "Before asserting that a gate denies, measure how many probes REACH it. A probe stopped by an earlier pipeline step passes the denial assertion while proving nothing, and the resulting suite is vacuous in the safe-looking direction."
status: shipped
supersedes: none
models_used:
  - model: "claude-opus-5"
    role: "sole implementer, reviewer and mutation harness author"
    did: "built the exhaustive below-role denial contract; measured the vacuity rate before trusting it; found a role dimension its own instrument had skipped; shipped three unfalsifiable drafts of one assertion and killed each with a mutation"
    cost: "subscription"
skills_touched:
  - id: "Rule 73 (proof-before-done)"
    change: "reinforced"
    why: "13 green tests proved nothing until mutation testing showed which assertions could fail. Green is a precondition for the claim, never the claim."
  - id: "packet 20260821-validate-the-instrument-before-reporting-absence"
    change: "confirmed-effective"
    why: "a positive control inside a source scanner read 0/110 and exposed a scanner that would otherwise have reported a clean, entirely false result. Second recorded case of a prior packet catching the failure it describes."
  - id: "Rule 18 (existing-pattern-first)"
    change: "reinforced"
    why: "the repo's own `sliceBetween` and `stripComments` helpers were reused rather than reimplemented — the failure mode the previous session recorded."
  - id: "Rule 4 (300-line cap)"
    change: "applied"
    why: "the contract reached 628 lines, the largest in the repo, and was split along the seam the next slice reuses"
  - id: "handoff §7 escaping trap"
    change: "escalated-to-procedure"
    why: "documented as a lesson, then repeated four times in the next session by the agent who read it. A prose warning did not change behaviour; a procedural rule might."
---

# The step before your gate absorbs your probe

## What happened

The task was the one the previous handoff ranked first: **nothing asserted that a Swan
Coach command denies a below-role caller.** 139 registered commands, 112 wired to
dispatchers, three ever read by a test.

The obvious harness writes itself. For every command, for every role not in its
`roleRequired`, run the pipeline and assert it is denied. I wrote it. It passed.

Then I asked a question I nearly skipped: **not "did it pass" but "where did each probe
actually stop?"**

```
303 below-role pairs (139 commands x 4 roles)
  stopped at `validate`: 116   <-- 38%
  stopped at `rbac`:     187
  reached a dispatcher:    0
```

**116 of 303 probes never reached the gate under test.** The pipeline validates params at
step 4 and checks role at step 5. A probe sending `{}` is rejected by the Zod schema —
before authorization is consulted at all. Those 116 assertions would have passed with the
role gate **deleted from the pipeline entirely**.

The suite was 38% vacuous, and vacuous in the direction that reads as coverage.

## Why this is the general case, not a quirk

Any gate sitting behind other gates has this property. Validation before authz, authz
before ownership, ownership before rate limiting, a feature flag before all of them. Your
probe has to survive every earlier step to test the one you care about — and when it does
not, the failure looks exactly like success, because the request was denied. It was just
denied for a reason that has nothing to do with what you are asserting.

**The tell is available and cheap: instrument WHERE the probe stopped, not just THAT it
was refused.** A denial assertion should carry a stage assertion beside it. If your
harness cannot say which step refused the request, it cannot distinguish "the gate held"
from "the gate is missing and something else caught it."

The fix here was to synthesize schema-valid params from Zod's own reported issues —
start at `{}`, parse, patch each issue by its path, re-parse — which took 293 of 303 to
the gate. The last 10 are five commands whose cross-field `custom` refinements cannot be
invented; those are **pinned by name with the blocking issue**, and a pin that starts
converging fails the suite. Pinning is the honest move: a skipped case that nobody named
becomes, within a month, a case everyone assumes was covered.

## The instrument skipped an entire dimension while reporting exhaustive coverage

The first version enumerated roles from `USER_ROLES`, exported by the command registry the
commands themselves live in. Reasonable. It was wrong: it listed
`['admin','trainer','client']` and omitted `user` — the User model's **default** role, held
by every self-registered account, and required by 12 commands.

The suite was therefore missing 42% of its pairs (176 instead of 303) while its name and
its output both said exhaustive. Nothing in production was harmed — no runtime code read
that constant — which is exactly what made it survive: **a drifted constant with no
consumer has nothing to break, so nothing reports it, and the first thing that trusts it
inherits the drift silently.**

It surfaced only because an assertion written for an unrelated reason ("every role a
command requires must be a known role") failed on 12 commands at once. **A finding set that
is uniform in shape is evidence about your method** — the same tell the previous session
recorded, arriving from the opposite direction.

The contract now reads the model's `DataTypes.ENUM` directly and asserts the floor
explicitly, so a fifth role cannot escape it. Deriving from the authority beats importing
from the neighbour.

## Three drafts of one assertion, each strictly better, each still unfalsifiable

The confirm lane must consume a pending operation before returning it as verified. Three
attempts:

1. `expect(window).toMatch(/pendingOps\.delete\(operationId\)/)` — passed with single-use
   deletion removed. The **expiry branch** also deletes.
2. "a delete between the ownership check and the success return" — passed on the
   destructive path with the consume removed. The **signature-tampering branch** also
   deletes.
3. "a delete after the last early return, before the success return" — the straight-line
   path to success, the only code guaranteed to run when the operation is handed back.
   This one fails when the consume is removed.

Each draft was a genuine improvement on the last. Each was still a guard that could not
fail. **Reasoning about an assertion cannot tell you whether it can fail; only mutating the
code it guards can.** This is the same three-in-a-row pattern the previous session
recorded — one vacuous assertion inside the fix for the previous one — recurring in a
session that had read that lesson.

## When a mutation does not fire, find out which side is broken

Two mutations came back clean and I was one step from recording those assertions as
vacuous. They were not. `str.replace(target, replacement, 1)` had hit the **first** of two
identical guard sites — a sibling function 100 lines above the one under test — so the
real target was never mutated.

A non-firing mutation has two explanations and they demand opposite responses: strengthen
the assertion, or fix the mutation. Guessing wrong in the first direction weakens a
working guard; guessing wrong in the second ships a vacuous one. Grep the target's
occurrence count before concluding anything. That check also found a **third** `dispatch`
call site nobody had asserted on.

## `dispatch` had three doors and my own header claimed one

I verified the import graph — no route, controller, service, script, seeder or migration
imports a registered handler — and wrote "the pipeline is the only door to a dispatcher."

It is not. `executeConfirmedOperation` dispatches from stored params when a user redeems a
pending operationId: one non-destructive path, one destructive path with HMAC. Neither
re-checks role; both check ownership, expiry and single use. Role is verified once, at
mint.

A true statement about imports became a false statement about reachability the moment it
was generalized. Both lanes now have contracts, and the honest residual limit is stated
rather than implied: **a caller whose role is revoked between minting and redeeming can
still redeem, inside the 120s expiry.** Bounded, real, asserted nowhere.

## Who did what

`claude-opus-5` did all of it — implementation, measurement, hostile review, the 20-mutation
harness, and both artifacts. No paid or external seat was consulted, so there is no routing
lesson to record this session beyond the negative one: every finding below was reachable
without spend, using a positive control and a mutation harness that cost nothing to run.

The most expensive-to-find defect (the 38% vacuity) came from **instrumenting the harness**,
not from reviewing it. The second (a skipped role dimension) came from an assertion written
for an unrelated purpose. Neither would have been surfaced by a reviewer reading the diff,
because both defects live in what the tests DON'T reach, and a diff shows only what is there.

## Skills created or changed

- **`tests/helpers/zodParamFixture.mjs` (new).** Issue-driven param synthesis so a probe can
  get PAST a validation step to the gate under test. Built against the failure that motivated
  it: 116 of 303 probes were being absorbed by schema validation. Its `ok:false` contract is
  deliberate — non-convergence means PIN the case by name, never skip it silently.
- **`tests/helpers/dispatcherReachability.mjs` (new).** The source scanners, extracted at the
  Rule 4 cap along the seam the next slice reuses. Carries the positive control requirement
  in its header, because the scanner it replaced reported a clean false result.
- **Rule 73 (proof-before-done) — reinforced.** 13 green tests, then 20 mutations, of which
  the first pass showed 2 non-firing and the investigation showed 3 genuinely vacuous
  assertions. Green was never the claim.
- **Handoff §7 escaping trap — escalated from lesson to procedure.** Documented in prose,
  read by me, then repeated four times. Prose did not work; the proposed procedural form is
  in the ledger below.

## External-model calibration

None. No paid or external seat (Kimi, HY3, Ox Alpha, GLM, Village, Fable) was consulted this
session, so there is no findings-real-vs-disproven ratio to record and no spend to report.

Worth carrying forward for the routing table: the previous session on this same branch ran a
three-seat paid/free panel and its strongest seat was the FREE one (Ox Alpha, $0.0000) for
the second consecutive round, while two seats converging on a recommendation still produced a
proposal that a single probe refuted. This session found five real defects in its own work
with zero spend, using a positive control and a mutation harness. The pattern across both:
**mechanism beats opinion on this class of work.** Spend a seat when the question is judgment
(is this the right design, what did we miss); run a harness when the question is fact (does
this assertion fail when the code breaks).

## Mistakes I made

- Built the obvious below-role harness and watched it pass before asking where the probes
  stopped. The measurement that exposed 38% vacuity took one instrumented run; skipping it
  would have shipped a permanent false assurance.
- Enumerated roles from a registry constant instead of the model that defines them, and
  lost a whole role dimension while the suite reported exhaustive coverage.
- Shipped three unfalsifiable drafts of one assertion, each an improvement on the last.
- Nearly recorded two working assertions as vacuous because my mutations had hit the wrong
  one of two identical sites.
- Generalized "no file imports a handler" into "the pipeline is the only door", and wrote
  it into a file header as fact. Two further call sites existed.
- Wrote a scanner regex through a shell heredoc, which collapsed `\b` to a literal
  backspace. The scanner then matched nothing and reported a clean result. Only a positive
  control caught it.
- Repeated that escaping mistake three more times in the same session, in a session whose
  own source handoff documented the exact class in its §7.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Backslash escapes collapsed by heredoc / `node -e` into JS | **4** | **YES** — the handoff I was working from documented it in §7, four instances, before I started | Nothing yet. Prose did not. The procedural form is: **any script containing a backslash is authored with a file-writing tool, never a heredoc or `-e`** |
| Assertion that cannot fail (vacuous guard) | 3 drafts of one assertion | **YES** — previous session shipped three, each inside the fix for the last | Mutation testing each draft. Not review, not reasoning — only the mutation |
| Absence claim from an unvalidated instrument | 1 | **YES** — a prior packet exists on exactly this | The positive control that packet motivated. It read 0/110 and stopped the false result reaching a conclusion |
| Mutation targeting the wrong of N identical sites | 2 | No | Counting occurrences before concluding the assertion was at fault |
| Generalizing a narrow verification into a broad claim | 1 | Partially (Rule 28) | Own hostile pass, after the claim was already written as fact |

**The repeat count is the finding.** Three of five classes were documented BEFORE they
recurred, and the one documented most thoroughly — with four worked examples, in the very
handoff being executed — recurred the most. A lesson written as narrative gets read and
does not change behaviour. What stopped the failures here were the two lessons that had
been converted into *mechanism*: a positive control that runs, and a mutation harness that
runs. **The lesson that survives is procedural, not resolutional** — "run this before
concluding", never "be careful about this".

## What shipped

- `backend/tests/api/aiCommandDispatcherAuthorization.contract.test.mjs` — 303 below-role
  pairs reach a dispatcher zero times; 293 are denied AT the role gate; the denial names
  the required roles; single-door reachability including namespace/dynamic/require/re-export
  forms; peer reuse cannot widen role.
- `backend/tests/api/aiCommandConfirmLaneOwnership.contract.test.mjs` — the two confirm-lane
  call sites: ownership, expiry, single-use-on-the-success-path, HMAC, kill switch.
- `backend/tests/helpers/zodParamFixture.mjs` — issue-driven param synthesis, with its
  non-convergence contract stated (`ok:false` means pin it, not skip it).
- `backend/tests/helpers/dispatcherReachability.mjs` — the source scanners, extracted for
  the next slice.
- `backend/services/ai/commandRegistry/baseSchemas.mjs` — `USER_ROLES` now matches the model.

20 mutations, all fire, every file restored byte-identical. Backend suite failing-set
byte-identical to the recorded baseline.

## Still not proven

- **Dispatcher self-gating.** This proves the pipeline denies before a handler runs. It does
  not prove any of the 110 handlers denies on its own. That is the next slice.
- **Ownership, not role.** Nothing asserts a correctly-roled trainer cannot act on a client
  who is not theirs.
- **Role revoked mid-flight**, per above.
