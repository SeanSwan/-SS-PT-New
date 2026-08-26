---
title: "The role you name defines the ones you did not"
originating_model: "claude-opus-5"
tier_basis: "Sean designated claude-opus-5 Fable-tier 2026-08-10. This session did the sweep, the measurement, the fixes, seven hostile rounds and all 21 mutations itself; no paid seat was consulted."
privacy: "IDs and roles only. No client names, no PII, no credentials, no key values. Secret-scanned clean before commit."
date: 2026-08-26
surface: "Swan Coach command lane — client and record ownership"
decision: "A conditional that names the privileged case silently defines every other case as the permissive default. Write the scoped set as a named set with the fall-through spelled out, and the hole is visible on sight instead of requiring someone to enumerate the roles the ternary does not mention."
status: shipped
supersedes: none
models_used:
  - model: "claude-opus-5"
    role: "sole implementer, adversary and mutation-harness author"
    did: "swept every id-shaped parameter on every trainer-runnable command; found and closed two live cross-tenant holes (one read, one destructive write); built three contracts and a 21-mutation harness; ran seven hostile rounds, the last two dry"
    cost: "subscription"
skills_touched:
  - id: "Rule 73 (proof-before-done)"
    change: "reinforced"
    why: "both holes were read as hypotheses and then EXECUTED before being called real — the first went 2 green / 2 red, the second 2 green / 4 red. A source read that looks conclusive is still a hypothesis; the run is the finding."
  - id: "packet 20260826-the-step-before-your-gate-absorbs-your-probe"
    change: "confirmed-effective"
    why: "its lesson — assert the STAGE, not just the denial — was applied from the first draft here, and it caught destructive commands that stop at CONFIRMATION rather than at the ownership gate. A prior packet changing this session's design is the outcome the corpus exists for."
  - id: "packet 20260821-validate-the-instrument-before-reporting-absence"
    change: "confirmed-effective"
    why: "third recorded catch. A naive schema-shape read returned [] for 19 wrapped schemas, hiding 12 commands' parameter lists; re-measuring with an unwrap moved the surveyed surface from 40 commands to 43."
  - id: "Rule 18 (existing-pattern-first)"
    change: "reinforced"
    why: "neither fix invented a rule. The client scope reuses the resolver's existing assignment clause; the plan fix calls `assertAssignmentOrAdmin`, the same helper the REST route's middleware calls."
  - id: "Rule 75 (trailhead-truth)"
    change: "applied"
    why: "the dispatcher's file header claimed parity with the protected REST route while performing no authorization. The header was false before the code was fixed, and a reader trusting it would have concluded the lane was safe."
  - id: "handoff §7 escaping trap"
    change: "escalated-to-mechanism"
    why: "fourth consecutive session hitting it. What finally contained it was not another warning but a harness that reports ANCHOR x0 separately from SURVIVED — the failure became self-announcing instead of self-concealing."
---

# The role you name defines the ones you did not

## What happened

The previous slice proved that **no below-role caller reaches a Swan Coach dispatcher**.
It also stated what it could not prove, because it mocks the client resolver: *nothing
asserts that a correctly-roled trainer cannot act on a client who is not theirs.*

That is the second ownership question. Role says **what** you may run. This asks **whose
record** you may run it on. Two live holes were sitting in it.

## Hole 1 — the ternary

One line decides client ownership for the entire command lane:

```js
{ trainerId: ctx.user.role === 'trainer' ? ctx.user.id : undefined }
```

Read it aloud and it says *trainers are scoped to their own clients*. That is true, and it
is not what the line does. What it does is: **every role that is not `trainer` is passed no
scope at all.** Admin unscoped is deliberate — admin is the superset role. The other two
roles were never considered, because the ternary never mentions them.

`view_xp_streaks` permits a `client` caller, requires a client reference, and is not
self-service. So an authenticated client could name another client's id and receive their
points, level, tier, streaks and achievements. The role gate passed — the role genuinely
IS permitted. The capability gate has no policy for that command. The resolver applied no
scope because it was handed none.

The fix is four lines, and the shape of it is the lesson:

```js
const RESOLVER_SCOPED_ROLES = new Set(['admin', 'trainer']);
```

Nothing about the runtime behaviour required a named set. What it changes is that the
fall-through case now has a name and a comment, so the next person does not have to
enumerate the roles a ternary declines to mention in order to see who falls through.

## Hole 2 — sharing a boundary is not being protected

`delete_workout_plan` is `destructive: true`, takes a `planId`, and declares
`requiresClientRef: false` — so the pipeline resolves no client and applies no scope
whatsoever. The caller-supplied id went straight to `transitionWorkoutPlanLifecycle`, whose
own comment reads *"Applies one **authorized** lifecycle action"*. It validates that
`actorId` is a positive integer and records it for audit. It authorizes nothing.

Any trainer could archive any workout plan by id.

The same operation over HTTP — `DELETE /api/workout-plans/:id` — is guarded by
`verifyClientAccessByPlanId`, middleware written for this exact class and annotated with
the receipt of the IDOR audit that produced it. And the dispatcher's own file header said:

> Routes Swan Coach archive commands through the same audited lifecycle boundary as the
> protected REST API.

That sentence is true and it is the trap. The **boundary** was the same. The **protection**
was not, because commands never travel over routes, so no middleware runs for this lane.
A guard has to be called; it cannot be inherited from a sibling caller.

## Why the harness had to be built a particular way

Two design choices did the work, and both were forced by lessons already in this corpus.

**The fake database is a mirror, not an oracle.** The obvious fake returns a client row
when asked. Every ownership assertion against it would be vacuous: the denial would have
to come from somewhere other than the scope clause, and deleting that clause would not fail
the suite. So the fake reads the predicates present in the SQL it is handed and applies
exactly those. Remove the assignment clause from the resolver and the fake stops filtering,
the foreign client resolves, and the tests fail. Confirmed by mutation, twice.

**Every denial asserts the stage.** The pipeline runs validate → rbac → resolve_client →
debate → confirmation → execute. A probe that only asserts "dispatch was not called" passes
for a destructive command because it stopped at CONFIRMATION, and for a malformed one
because it stopped at VALIDATION — in both cases whether or not ownership is enforced at
all. This is the previous packet's lesson arriving one step later in the same pipeline.

## The sweep that made the finding bounded

A finding is worth more when you can say what it is NOT. Every id-shaped parameter on every
trainer-runnable command was checked:

| parameter | commands | guarded by |
|---|---|---|
| `clientId` | 43 | pipeline step 6, once the ternary was fixed |
| `trainerId` | 5 | `resolveTrainerId`, or a hard pin to `ctx.user.id` |
| `sessionId` | 1 | `cancelSessionForAI` compares `trainerId` / `userId` |
| `scheduledSessionId` | 1 | `resolveAiScheduledSessionForLog` refuses another client's session |
| `goalId` | 1 | `Goal.findOne({ where: { userId: clientId, id: goalId } })` |
| `profileId` | 3 | `resolveOwnedProfile`, under a stated ownership contract |
| `intakeId` | 7 | filters an already-scoped result set; not a lookup key |
| `achievementId` | 1 | a global badge definition, not a per-client record |
| `planId` | 1 | **nothing** |

Seven of eight parameter classes were already guarded, each by a different mechanism. That
is what makes the eighth a gap rather than a policy: the house already had the rule.

## Who did what

`claude-opus-5` did all of it — the sweep, both fixes, three contracts, the 21-mutation
harness, and seven hostile rounds of which the last two were dry. No paid seat was
consulted and nothing was spent.

Worth attributing honestly: **the harness found things the reasoning did not.** Round 1's
`trainerId` sweep was written expecting to find nothing; it surfaced two commands whose
classification was missing and one handler-declaration form the scanner could not read.
Round 2 found the destructive hole. Round 4 found that my own sweep could iterate zero
pairs and report a clean result. Round 5 found an export nobody imported. Every one of
those came from running something, not from thinking harder.

## Skills created or changed

No new skill. Three existing packets were confirmed effective — the stage-assertion lesson
shaped this design from the first draft, and the instrument-validation lesson caught a
schema reader that was hiding 12 commands. Rule 75 was applied to a file header that
claimed a protection the file did not perform.

The one thing worth promoting to mechanism is the mutation harness's reporting. It
distinguishes three outcomes: FIRED, SURVIVED, and **ANCHOR x0 — mutation not applied**.
That third state is what stopped a CRLF-vs-`\n` anchor bug from being recorded as "this
assertion cannot fail". A harness that collapses "not applied" into "did not fire" would
have produced a false vacuity report and sent me to rewrite working assertions.

## Mistakes I made

- Surveyed command parameters with `Object.keys(schema.shape)`, which returns `[]` for the
  19 schemas wrapped in `.refine()` or `.optional()`. Twelve commands' entire parameter
  lists were invisible, `update_client`'s `clientId` among them. Caught by writing the
  unwrap and re-measuring: 40 commands became 43. The conclusion happened not to change,
  which is the uncomfortable part — the instrument was wrong and the answer was right, so
  nothing would have surfaced it.
- Wrote a multi-line mutation anchor with `\n` against CRLF files. Matched nothing. **This
  is the fourth consecutive session in which this escaping class has cost time**, and the
  previous handoff documents four instances of it with worked examples. Reading that
  warning did not prevent it.
- Asserted that denial and absence were identical using `toEqual` on the whole object, when
  both echo the caller's own `planId`. It failed the moment it ran.
- Shipped a sweep whose loop body could execute zero times: if `view_xp_streaks` ever
  stopped permitting a `client`, the non-privileged pass would have reported a clean result
  over nothing. Caught in hostile round 4, three rounds after I wrote it.
- Left `isLastExport` on a return value and exported a helper nobody imported.
- Ran `cmd | tail; echo $?` and would have read `tail`'s status. The pre-tool hook blocked
  it before it executed.

## Error → fix → repeat ledger

| error class | times this session | written up before? | what stopped it |
|---|---|---|---|
| `\n` anchor against CRLF | 2 | **yes — four worked examples in the handoff I was executing** | not the write-up. A harness that reports ANCHOR x0 as distinct from SURVIVED, so the failure announces itself |
| instrument reads less than it claims | 1 | **yes — a packet exists specifically about this** | the packet. I wrote the positive control before trusting the survey, and it fired |
| assertion that cannot fail | 2 | **yes — three instances last session** | mutation testing. Reasoning about whether an assertion can fail has now failed five times across two sessions; mutating the code it guards has never failed |
| sweep that can iterate zero items | 1 | no | a hostile round asking "what if this set is empty" |
| `\| tail; echo $?` | 1 | **yes — 44 hits in the corpus, and a hook** | the hook. It blocked the call before it ran |

The pattern the ledger keeps showing: **three of five classes were documented before they
recurred, and the documentation did not stop any of them.** What stopped four of five was
something that RUNS — a hook, a positive control, a mutation, a harness that distinguishes
its own failure modes. The correction that survives is procedural, never resolutional.

The `\n`/CRLF class is now on its fourth session. It should stop being written about and
start being a pre-commit check, or a helper that takes single-line anchors only.

## External-model calibration

None consulted. Cost: $0.00. The hostile review was self-run across seven rounds, two of
them dry, with 21 mutations as the falsifier rather than a second opinion.

## What is still not proven

- **Dispatcher self-gating.** Handlers are mocked in the client-ownership contract. It
  proves the pipeline denies before a handler runs; it does not prove any handler would
  refuse on its own.
- **A role revoked mid-flight.** The confirm lane checks ownership of the pending
  operation, not the caller's current role, so someone demoted after minting can still
  redeem inside the 120-second window.
- **Real SQL.** The fake mirrors the resolver's predicates; it proves the query carries
  them, not that PostgreSQL evaluates them identically.
- **Nothing is deployed.** Four commits, unpushed, and every CI gate is dead at the account
  level, so no automation has confirmed any of this.
