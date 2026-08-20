---
title: "An enforcement point only protects the layers below it"
date: 2026-08-20
originating_model: claude-opus-5
tier: fable-tier
tier_basis: "Sean designated claude-opus-5 Fable-tier on 2026-08-10; this session ran as claude-opus-5 end to end."
privacy: "IDs and roles only. No PII, no credentials. Dev database credentials were not restated in any artifact; synthetic values used in tests."
surface: swanguard-creator-manager
decision: "When enforcement is pushed down to a layer that cannot be forgotten (a DB trigger, a kernel check), the layer immediately above it becomes the entire attack surface — because the enforcement point can only validate the inputs it is handed. Write down what that layer must never do, and test it."
status: shipped
supersedes: none
reviewed_by: "self-hostile DRY-LOOP, 5 rounds (R1 3 code defects, R2 1 untested-path gap, R3 disclosed a wiring test gap, R4/R5 clean); allowlist, body-actor and UI-failure guards each mutation-tested"
linear: SWA-70
models_used:
  - model: claude-opus-5
    role: builder then hostile reviewer, single session
    did: "Built the durable creator catalog (API store, Postgres impl, owner-gated routes, HTTP client service, runtime wiring) against an existing interface. Found three defects in its own code and one activated-dead-path gap in someone else's. Proved persistence end to end against live Postgres."
    cost: subscription
  - model: claude-opus-5 (prior sessions)
    role: author of migration 0028 and the CreatorService interface
    did: "Put the default-off law in a database trigger and defined the service interface before any implementation existed. The interface meant this slice touched zero UI files; the trigger is what this packet is about."
    cost: subscription
skills_touched:
  - id: rule-73 Proof-Before-Done
    change: earned-its-keep
    motivating_failure: "Route tests (memory store) and store tests (live Postgres) were both green while the wired combination was untested. Two green suites either side of an unverified seam is not proof of the join."
  - id: rule-58 Proactive Schema-Drift Detection
    change: earned-its-keep
    motivating_failure: "The Postgres store maps ~30 snake_case columns to camelCase by hand. bigint columns arrive from node-postgres as strings; an unguarded Number() would have rendered NaN subscriber counts."
  - id: blast-radius-guard
    change: earned-its-keep
    motivating_failure: "Every mutation in the new store is bounded by primary key, asserted by a test that scans emitted SQL. An unbounded UPDATE here would be a whole-catalog write that no human would ever type by hand."
---

# An enforcement point only protects the layers below it

## The lesson

Migration 0028 enforces "only the owner may enable a creator" with a database trigger. That is
the right place for it: a trigger cannot be forgotten by a caller, skipped in a hotfix, or
lost when someone writes a second code path. The whole design rests on it, and a live probe
proves it refuses four distinct attack classes.

But the trigger checks `actor = 'owner'` — and **it can only check the string it was handed.**
It cannot know whether the process that sent `'owner'` had any right to send it.

So the moment an HTTP route writes `enable(id, req.body.actor)`, the law is bypassed one layer
*above* the trigger, and every guarantee in that migration becomes decorative. The database
would faithfully refuse a forged `'system'` while cheerfully accepting a forged `'owner'` from
anyone who could reach the endpoint. Nothing in the database would look wrong. The audit trail
would even say `owner`.

Generalised: **a guard at layer N protects you from layers N+1 and below. It does not protect
you from layer N-1.** Pushing enforcement down makes it unforgettable, and simultaneously
concentrates the entire attack surface into the one layer that constructs its inputs. That
trade is usually correct — but it is a trade, and the half that gets written down is almost
always the guard, not the obligation it creates above.

The fix was one line (derive the actor from the session's `requireRole`, never the body). The
durable part is the discipline around it:

1. **Name the obligation where the guard lives**, not at the call site. A comment block at the
   top of the store file says what every caller must never do, because the next caller has not
   been written yet.
2. **Do not accept the field at all.** The route reads no `actor` from the body — not ignored,
   absent — so a future edit cannot quietly start honouring one.
3. **Test the forgery, not the refusal.** Posting `{"actor":"system"}` and asserting the event
   is still attributed to `owner` is the test that matters. Asserting the database refuses
   `'system'` tests the trigger, which was never in doubt.

## The second-order lesson: denylists protect what you thought of

The same slice had a settings route that stripped `enabled` from the patch and passed the rest
through. It stopped the one attack it was named for, and let `{"title":"HACKED"}` and
`{"id":"..."}` rewrite the record.

Worse, the two implementations of the same contract had *different* safety properties: the
Postgres store was accidentally safe because it builds SQL from a column allowlist, while the
memory store — **the default when no database is configured** — spread the patch onto the row.
The safer implementation was the optional one.

A denylist protects the fields you thought of. An allowlist protects the ones you didn't. And
when one contract has two implementations, the weaker one is the one that defines your actual
guarantee — check which is the default.

## Who did what

- **claude-opus-5 (this session):** built and wired the whole slice; found all three of its own
  defects plus a fourth in previously-dead code it had activated.
- **claude-opus-5 (prior sessions):** wrote the trigger and the interface. Both were good calls
  — the interface meant this slice touched no UI file at all. This packet is not a criticism of
  the trigger; it is the missing half of its documentation.

## Skills created or changed

No new skill. Three existing rules earned their keep (frontmatter). The generalisable check to
add to future review: *when a guard lives below the caller, what is the caller obliged never to
do, and is that obligation tested?*

## Mistakes I made

- **Wrote a denylist and called it a strip**, shipping the weaker of two implementations as the
  default.
- **Threw synchronously from a method typed `Promise<T>`**, so `.catch()` would not catch it,
  while the sibling implementation rejected for the same input.
- **Used `this` inside an object-literal method**, breaking any caller who destructures.
- **Activated a dead error path without testing it.** The UI's catch branch had never executed
  because the in-memory service could not fail; swapping in a network-backed service made it
  live. I activated untested code I had not written and did not notice until round 2.
- **Nearly proved the wrong thing.** Both halves of the persistence path were tested; the join
  was not.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What finally stopped it |
|---|---|---|---|
| Denylist where an allowlist was needed | 1 | no | Failing test first, then a shared allowlist both implementations use. Look for the asymmetry: safe impl, unsafe default. |
| One interface, two failure shapes | 1 | no | Run the negative-path test against every implementation, not only the new one. |
| Green either side of an untested seam | 1 | **yes — second consecutive session** | An end-to-end test trusting neither half's return value. Yesterday it was a curated baseline hiding red suites; today two green suites either side of an unverified join. Same shape: everything measured, the join between them not. This is now a recurring class and deserves a standing check. |
| Activating previously-unreachable code | 1 | no | When a swap makes a dead branch live, that branch needs a test even though you did not write it. |

## External-model calibration

No external model was consulted. The hostile review was self-run across five rounds; three of
the four defects were found by writing a test that failed, not by reading the code — which is
the calibration note worth keeping about *me*: on this task class my code-reading missed what
my test-writing caught.
