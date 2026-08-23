---
title: "An inherited plan's premise is the first thing to test, not the last"
originating_model: "claude-opus-5"
tier_basis: "Sean designated claude-opus-5 Fable-tier 2026-08-10. This session did the implementation, the disproof, and every verification itself; no paid seat was consulted."
privacy: "IDs and roles only. No client names, no PII, no credentials, no key values. Secret-scanned clean before commit."
date: 2026-08-23
surface: "Swan Coach command lane / dashboard client hub / QA tooling"
decision: "A handoff's ranked next action carries a premise. Test the premise before building the thing, because a faithfully-built test of a false law ships as a permanent, authoritative lie."
status: shipped
supersedes: none
models_used:
  - model: "claude-opus-5"
    role: "sole implementer and reviewer"
    did: "implemented the inherited plan far enough to disprove its premise; built the replacement contract; found two of its own defects (a transient aria-busy, a guard matching its own comment) and two parser blind spots in its own extractor"
    cost: "subscription"
skills_touched:
  - id: "Rule 73 (proof-before-done)"
    change: "reinforced"
    why: "the inherited handoff's own §4.2 was a confident, file:line-cited finding that was still wrong about what it proved. Citations establish that code says X; they do not establish that X matters."
  - id: "packet 20260821-validate-the-instrument-before-reporting-absence"
    change: "confirmed-effective"
    why: "the guard this lesson motivated caught a real parse corruption today before any absence claim was reported. First recorded case of a prior packet preventing the failure it describes."
  - id: "Rule 4 (300-line cap)"
    change: "applied"
    why: "the extractor reached 594 lines and was split into three files along real seams"
---

# An inherited plan's premise is the first thing to test, not the last

## What happened

A handoff ranked its highest-value next action as an **authz parity harness**: assert,
for every one of ~139 Swan Coach commands, that the command's declared `roleRequired`
is a subset of the role middleware guarding the route named in its `endpoint` field.

The plan was specific, well-argued and carried mount-resolved file:line proof of a
motivating example — `schedule_session` declares `['admin','trainer']` while
`/api/sessions/admin/book` is `protect, adminOnly` (`sessions.mjs:1091`). It even
warned about the unsound implementation (tail-matching) that a previous attempt had
produced. Everything about it read as ready to build.

The premise was false. `endpoint` is declarative metadata. Nothing dispatches on it.
Execution selects a **service dispatcher by command type**
(`commandDispatcher.mjs:347`), so the route's middleware never executes for the Coach
lane at all. The two sides of the proposed law are never connected at runtime.

The motivating example was not just unproven, it was backwards. The handoff said a
trainer "passes Coach's gate then eats a 403 — fail-closed, so not a security hole."
In fact `schedule_session` is *wired*: `dispatchScheduleSession`
(`scheduleWriteDispatchers.mjs:113`) calls `assertTrainerOrAdmin(ctx)` and pins
`trainerId` to `ctx.user.id` for trainers. No route is contacted. No 403 exists.
Trainer access is deliberate and correctly scoped.

Nine of the ten commands the harness would have flagged are wired the same way.
**Building the plan faithfully would have shipped a contract test asserting a law
that is false, failing 10 correct-by-design commands** — and it would have carried
the authority of a green-then-red test suite while doing it.

## The lesson

A plan hands you two things: a task, and a premise the task rests on. The task is
visible and gets all the attention. The premise is usually a single implicit sentence
— here, *"the endpoint field is the execution path"* — that nobody wrote down because
it seemed too obvious to state.

**Cost asymmetry decides the order.** Testing this premise cost one grep
(`grep -rn "\.endpoint" services/ai/`) and two file reads: about four minutes.
Discovering it after building the harness cost the harness. Discovering it *never*
would have cost a permanent false law in the test suite, which is the expensive
outcome, because a contract test is read by every future agent as settled truth.

The signal that something was wrong arrived before the disproof did: **ten findings
that were all the same shape.** Eight of them were the same router. A real drift
sweep across 139 heterogeneous commands does not return one uniform failure mode.
Uniformity in a finding set is evidence about the *method*, not about the code.

This does not make the handoff bad. It was unusually good — it is the reason the
extractor was built soundly instead of by tail-matching. The failure mode is subtler
than a bad plan: **a well-evidenced plan is harder to question, because its citations
answer "is this real?" convincingly while leaving "does this matter?" untouched.**
Every file:line in that section was accurate. The conclusion still did not follow.

## Who did what

Only `claude-opus-5` ran this session. There is no external-model calibration to
report, and no paid spend. It is worth recording that the session's most valuable
output — the disproof — came from implementing the plan far enough to see it fail,
not from reviewing the plan. Reading the plan again would not have surfaced this;
running its numbers did.

## Skills created or changed

No new skill. Three existing gates earned their keep, and one prior packet is now
confirmed to work:

- **The 2026-08-21 packet "validate the instrument before reporting absence"** was
  applied deliberately, and it paid off within the hour — see the ledger below. This
  is the first recorded instance of a durable packet preventing the exact failure it
  was written about, which is the only evidence that the corpus is doing its job.
- **Rule 4** forced the 594-line extractor into three files along real seams
  (source scanning / role semantics / route table). The split was behaviour-preserving
  and surfaced one dead import.
- **Rule 45** blocked the reflex fix when the push was rejected after a rebase. The
  branch was republished under a new name instead of force-pushed. Two branches now
  exist and Sean decides; that is the correct cost of not rewriting shared history.

## Mistakes I made

- **I took the ranked next action at face value for the first hour.** The premise was
  the last thing I tested and should have been the first. What finally triggered the
  check was not skepticism but a smell — ten identically-shaped findings.
- **I shipped `aria-busy="true"` on a transient live region.** The node unmounts
  rather than flipping busy to false, and a live region left busy can have its
  announcement dropped — so my accessibility fix could have suppressed the very
  announcement it was adding. Caught in my own hostile pass, not by a test.
- **I wrote a guard that matched its own documentation.** `not.toContain('aria-busy="true"')`
  failed on the comment explaining why `aria-busy` is wrong. This repository committed
  two consecutive rounds about this exact class days earlier. **I had the lesson
  available and repeated it anyway** — see the ledger.
- **I built a route parser with two blind spots**, both of which make it *under*-report
  and therefore manufacture false absence claims: named-import aliases
  (`import { protect as authMiddleware }`) and regex literals containing quotes.
- **I trusted a plain heredoc for a large file** and lost a cycle to a shell parse
  error before switching to a file-write tool.

## Error → fix → repeat ledger

| Error class | Recurred this session | Previously written up? | What finally stopped it |
|---|---|---|---|
| Guard matches its own documentation | 1× | **YES** — two commits days earlier on the drift work ("a fix can contain the defect it was written to kill") | Structural matching (`/<LoadingPulse[^>]*aria-busy/`) instead of bare substring. **Procedural rule: when a file both bans a literal and explains the ban, the assertion must be anchored to syntax, never to the string.** The prior write-up was prose and did not change behaviour; this one names a mechanical test. |
| Absence claimed from a silently-truncated instrument | 0× (prevented) | **YES** — packet 20260821 | The prior packet's lesson was applied *pre-emptively*: an independent grep-vs-parser count was written before any absence was reported, and it caught `workoutSummaryRoutes.mjs:34` dropping a route. Now permanent as a test assertion, so the next agent inherits the guard rather than the advice. |
| Premise of an inherited plan unexamined | 1× | No | This packet. The mechanical form: before implementing a plan's central assertion, grep for the consumers of the field the assertion depends on. |
| Accessibility fix that defeats itself | 1× | No | Hostile pass on my own change, asking "what does this attribute do when the node disappears?" |

The first row is the one that matters. A lesson that was documented and then repeated
proves the write-up was not a fix. The difference between the first row and the second
is that the second had been converted into *a thing that runs*, and the first had only
been converted into *a thing that was written down*. That is the whole distinction
between the corpus working and the corpus being decoration.

## External-model calibration

None — no paid model was consulted this session, so there is nothing to calibrate.
Recorded explicitly rather than omitted, because an absent section reads as "not
applicable" when it usually means "not done".

## What shipped

Two commits on `claude/coach-endpoint-truth-clienthub-a11y-20260823` (pushed, not
merged, not deployed):

- **`endpoint`-truth contract + mount-resolved route extractor.** Models what Express
  actually does — mount order (first match wins), `router.use()` applying only to
  routes declared after it, one router mounted at several prefixes, stacked role gates
  intersecting. Locks the five commands whose `endpoint` names no mounted route, and
  fails if one starts resolving so the list must be pruned rather than rot.
- **Client-hub loading a11y + in-place retry**, with the three assertions previously
  held out of `LoadingSpinner.retryContract.test.ts` restored and re-pointed at the
  component both audiences actually render.

Verification: tsc true-exit 0 / 0 errors, `vite build` exit 0, frontend 712 files /
3467 tests pass, backend `tests/api` 3 failures all pre-existing in
`known-failing-baseline.json` (zero new), all 11 new assertions mutation-tested and
restored byte-identical, secret scan clean.

## Open finding, not fixed

`AI_ACTION_PERMISSIONS` / `isAIActionAllowed` (`authMiddleware.mjs:966-981`) has zero
production consumers — the only references are its own definition and one test's
`vi.mock` stub. It is labelled *"AI Village CRITICAL — prevents AI prompt injection
from escalating privileges."*

A security control that exists only as documentation is worse than an absent one,
because it answers "is this defended?" with a confident yes. Left in place and
reported rather than touched: deleting it or wiring it are both decisions with
security consequences, and it is Sean's call which.
