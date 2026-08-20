---
title: "A curated baseline is always greener than the repo's own aggregate"
date: 2026-08-19
originating_model: claude-opus-5
tier: fable-tier
tier_basis: "Sean designated claude-opus-5 Fable-tier on 2026-08-10; this session ran as claude-opus-5 end to end."
privacy: "IDs and roles only. No PII, no credentials. Dev database credentials were deliberately not restated in any artifact; a synthetic value was substituted in the redaction test."
surface: swanguard-creator-manager
decision: "A verification baseline must run the project's own aggregate test entry point. A hand-picked command list measures what the author thought to check, and will look greener than the repo actually is."
status: shipped
supersedes: none
reviewed_by: "self-hostile DRY-LOOP, 5 rounds (R1 2 code defects, R2 3 convention gaps, R3 1 inherited red suite, R4/R5 clean); both new guards mutation-tested"
linear: SWA-70
models_used:
  - model: claude-opus-5
    role: incoming agent on an inherited handoff; builder then hostile reviewer
    did: "Took the handoff's own §4.0(a) calibration slice. Converted a transcript-only invariant claim into an executable 4-class live-Postgres probe plus a 19-test unit suite. Ran the repo's own npm test, which the handoff never had, and found two red suites. Found a migration-number collision the slice registry did not know about. Found and fixed two defects in its own probe design."
    cost: subscription
  - model: claude-opus-5 (prior session)
    role: outgoing agent, author of the handoff under continuation
    did: "Wrote a handoff whose §0.1 snapshot instruction made every later 'is this failure mine?' question answerable by evidence instead of argument. Also curated the §1 baseline to five commands and reported it green while the repo's own npm test was red in two places."
    cost: subscription
  - model: glm-5.3
    role: prior-session hostile reviewer of the handoff
    did: "Correctly caught that the default-off law's proof rested on a transcript with no runnable reproduction — the finding that created this slice. Did not run the baseline it was reviewing."
    cost: subscription
  - model: moonshotai/kimi-k3
    role: prior-session hostile reviewer of the handoff
    did: "Correctly caught that the handoff warned of data loss while offering no interim mitigation, producing the §0.1 snapshot step this session then depended on. Did not run the baseline it was reviewing."
    cost: subscription
skills_touched:
  - id: rule-73 Proof-Before-Done
    change: earned-its-keep
    motivating_failure: "The inherited document contained the rule 'proof, not assertion' and, in the same file, claimed the database law was 'verified with four attacks' with no script. The rule was present and still not applied to the document's own strongest claim."
  - id: rule-56 Tier-A Baseline Disclosure
    change: sharpened
    motivating_failure: "Rule 56 already requires distinguishing slice-clean from baseline-clean. It does not say the baseline must be the project's OWN aggregate command. Five individually-true green commands were reported as a green baseline over two red suites."
  - id: TEST-DELTA DISCLOSURE
    change: earned-its-keep
    motivating_failure: "This slice widened an existing assertion (migrations 0027 -> 0028). Classing it RE-ANCHOR and stating that 0028 legitimately exists and is applied is what separates it from silencing a failure."
---

# A curated baseline is always greener than the repo's own aggregate

## The lesson

A handoff bound every number in its state table to the exact command that produced it —
better discipline than most handoffs manage, and explicitly designed to stop the next agent
quoting stale figures. Five commands, all green, all genuinely true.

The repo's own `npm test` was red. In two separate suites.

The command list was *curated*: web suite, database suite, type-check, build, one guard
suite. It never ran the aggregate the project itself defines as its test entry point.
Running it surfaced:

1. `postgres-migration-runner.test.mjs` hardcoded migrations `0001`–`0027`. The workstream
   had added `0028` and never updated it. Red since that migration landed.
2. `apps/api/src/civicOfficialSourcesRoutes.test.ts` failing in an unrelated lane.

Neither the author nor two independent hostile reviewers saw either one, because all three
were reasoning about the *claims* in the document and none re-ran the *aggregate*.

**A curated list measures what the author thought to check. The project's aggregate measures
what the project says matters. When they diverge, the curated list is greener — always, and
by construction, because nobody curates a list to include the thing they forgot.**

The correction is procedural, not attitudinal: run the repo's own entry point (`npm test`,
`make test`, whatever the project declares). When you must curate — because the aggregate is
slow, or needs a database — say explicitly which aggregate you did not run. "Green across
these five commands" and "green" are different claims and must not be written the same way.

## Who did what

- **claude-opus-5 (this session):** ran the aggregate; found both red suites; proved neither
  was caused by this session using the *previous* agent's snapshot instruction; fixed the
  in-lane one and deliberately left the out-of-lane one, recorded.
- **claude-opus-5 (prior session):** authored the handoff. Its §0.1 non-destructive snapshot
  is the reason "is this failure mine?" was answerable in thirty seconds with evidence
  rather than argued from memory. It is also the session that curated the baseline.
- **GLM-5.3:** caught the transcript-only proof. Correct and load-bearing — it created this
  slice.
- **Kimi K3:** caught the warning-without-a-mitigation. Correct and load-bearing — the
  snapshot step it forced is what made the provenance of both failures provable.

Both reviewers found real defects in what the document *claimed*. Neither checked what the
document *measured*. That is a reviewer blind spot worth naming: hostile review of prose
converges on the argument, not on re-running the evidence.

## Skills created or changed

No new skill. Two existing rules earned their keep and one is sharpened above (rule 56:
the baseline should be the project's own aggregate, and a curated substitute must name what
it skipped).

## Mistakes I made

- **Built a test fake less faithful than the real driver.** Matched refusals on SQL text
  while `pg` binds the actor as a parameter, so `select enable_creator($1,$2,$3)` contains no
  literal `'system'`. Six tests failed for reasons unrelated to the code under test.
- **Designed the probe to collect breaches rather than stop at the first.** The trigger fires
  only on a `false→true` transition, so after one successful attack every later attack also
  "succeeds". The report would have been one real breach plus cascade artifacts. A failing
  test caught it; my review did not.
- **Nearly shipped an attack that could not fail.** The fourth attack raises the *same*
  message as the second. Without asserting its own precondition it would have scored a
  refusal while proving nothing.
- **Restated a dev credential** in a doc comment and used the real one as a redaction-test
  fixture, when the compose file already held it.
- **Wrote code in a second repo before reading that repo's rules.** Its slice-close rule
  requires a registry update; I discovered this in hostile round 2, after the code existed.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What finally stopped it |
|---|---|---|---|
| Green baseline reported over an unrun aggregate | 1 (inherited) | **no — new** | Run the project's declared entry point. If curating, name the aggregate you skipped. Now a bound row in the handoff's state table. |
| Fake less faithful than the real dependency | 1 | no | Match the fake on the same inputs the driver actually sends — text **and** bound parameters. Running live and faked in the same session exposed the divergence immediately. |
| Assertion that cannot fail | 1 (pre-ship) | related to TEST-DELTA DISCLOSURE | Mutation-test every new guard: remove it, confirm exactly the matching test fails, revert. Two mutants, both caught. |
| Collected-report design where the guard is transition-triggered | 1 | no | Fail fast. After the first breach, later results are artifacts of the first, not independent findings. |
| Writing code in a repo before reading its rulebook | 1 | no | When working outside the primary repo, read its `CLAUDE.md`/`AGENTS.md` before the first edit. |

## External-model calibration

No paid external model was consulted this session. The two prior-session reviewers
(GLM-5.3, Kimi K3) are calibrated above: both produced findings that verified as real and
load-bearing, and both shared the same blind spot of reviewing claims rather than re-running
measurements. For this task class — reviewing a handoff document — that blind spot is
systematic, not incidental, and is worth pairing prose review with one aggregate test run.
