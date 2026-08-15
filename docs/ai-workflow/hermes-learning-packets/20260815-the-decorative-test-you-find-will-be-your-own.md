---
title: The decorative test you find will be your own
packet: the-decorative-test-you-find-will-be-your-own
date: 2026-08-15
originating_model: claude-opus-5
tier: fable-tier
tier_basis: authored by claude-opus-5, on the _schema.json tier_allowlist per Sean's designation
  2026-08-10. Provenance is the MODEL, not the mode (Rule 71).
decision: A test suite proves nothing until a mutation makes it fail, and that standard applies
  hardest to your own suite. Prefer pinning a control's EFFECT over pinning the flag that enables
  it. Never write a probe's conclusion before its output exists.
status: draft
privacy: IDs, roles, endpoint paths and middleware line numbers only. No client PII, no
  credentials, no secrets. The JWT secret referenced in the suite is a test literal. Secret-scanned
  CLEAN before commit.
surface: security / test design / authorization
supersedes: none
extends: 20260815-two-parsers-for-one-identity-is-a-bypass.md
models_used:
  - model: claude-opus-5 (session main-seae22129)
    role: builder and self-reviewer
    did: closed the protect gap with 26 executed tests; mutation-tested them with 6 mutations and
         found one of its OWN tests decorative; ran the repo-wide id-coercion sweep and found no
         live bypass; declined two defensible hardenings on live auth paths
    cost: subscription, $0 marginal
skills_touched:
  - id: rule-73 (proof-before-done)
    change: sharpened
    failure: 15/15 green was true and meaningless — deleting a real security control left every
             test passing. Green is a claim about the suite, not about the code.
  - id: rule-61 (slice-internal hostile review)
    change: validated
    failure: the hostile pass on my own work is what found the decorative test, one commit after I
             had criticised another agent for shipping one
  - id: rule-51 (confidence tags)
    change: reinforced
    failure: I printed a conclusion label ("empty = not called") under a probe that had returned a
             hit; the label was authored before the output existed
---

# The decorative test you find will be your own

## The lesson

I spent a session proving another agent's suite could not see the bug it certified. Then I wrote a
suite, ran six mutations against it, and **one of my own tests turned out to prove nothing.**

I had asserted that an `alg: none` token is rejected *because* `protect` pins
`algorithms: ['HS256']`. Deleting that pinning entirely left all 15 tests green. The test was
measuring `jsonwebtoken` v9's own refusal to accept unsigned tokens — a library default — and
attributing it to our code. Every word of the test name was true and the test was worthless.

**Green is a claim about the suite, not about the code.** The only thing that converts a passing
test into evidence is watching it fail for the reason it names.

The replacement is a token signed **HS512 with the correct secret**: nothing but the algorithm
restriction can refuse it. Delete the pinning and exactly that test goes red.

## Test the effect, not the flag

The second half of the same lesson. `protect` sets `req.impersonation` from signed token claims,
and `waiverGate.mjs:131` does `if (req.impersonation?.actorId) return next()` — skipping a
signed-waiver requirement outright.

My first pass asserted the **flag**: that `req.impersonation` is set for an admin actor and not for
a client one. Correct, and one refactor away from meaningless — the flag could keep its shape while
the gate stopped consulting it.

The stronger version asserts the **effect**: same user, same gated path, same missing waiver, only
the impersonation claims differing — blocked, then through. That test fails if the flag breaks *or*
if the bypass is rewired. It costs one extra route mount.

**Where a control has a downstream consequence, pin the consequence.** A flag assertion is a proxy;
proxies drift.

## Who did what

Solo slice, no paid models. The calibration from the preceding review stands: Kimi K3 $0.3198 (6 of
7 checked findings real, one a fabricated source quote), Tencent HY3 $0.0133 (2 of 2 real,
severity underestimated). HY3 remains the better first call for security review on a diff.

## Skills created or changed

- **Rule 73 (proof-before-done)** — sharpened from "show proof" to "show proof that could have
  failed." A green suite is not proof; a suite with a demonstrated red is.
- **Rule 61 (slice-internal hostile review)** — earned its keep in the most direct way available:
  the hostile pass on my own work found the decorative test. Had I shipped on 15/15 I would have
  left a security control unpinned while the commit message claimed it was covered.
- **A structural fact worth carrying:** `protect` does not call `next()`. It ends with
  `await requireLinkedWaiver(req, res, next)` (`authMiddleware.mjs:385`), so the waiver gate runs
  inside every authenticated request. Anyone testing or reasoning about auth in this repo needs
  that, and nothing said it anywhere.

## Mistakes I made

- **Shipped a decorative test into a suite whose entire purpose was to be non-decorative** — caught
  by mutation, not by review, and one commit after criticising the same failure in another agent's
  work. Knowing a failure class does not confer immunity to it.
- **Wrote a probe's conclusion before its output existed.** I printed
  `"(empty = not called in protect's body)"` beneath a grep that had returned a hit. The label was
  authored with the command; the output contradicted it; I nearly filed the contradiction as
  agreement. **A pre-written conclusion is not a reading of a result** — and it is worse than no
  label, because it survives a skim.
- **Ran the sweep exactly as asked and would have reported a clean result I had not earned.**
  `Number(req.params` / `parseInt(req.params` finds 48 sites and misses **212** destructured reads
  (`const { userId } = req.params`), which are the more dangerous class because nothing normalizes
  them at all. The requested probe could not have found what it was asked to look for.

## Addendum, same session — it happened again, and the tooling lied too

Written after a second slice, because the title turned out to be more literal than intended.

**A second decorative test of my own.** Testing the `router.use`-cleared tier, I wrote a case
asserting that a non-canonical id (`'0902'`) cannot walk around the client check. Loosening the
strict parser from `/^[1-9]\d*$/` to `/^\d+$/` — a real weakening of a real guard — left it green.
The test used an **unassigned** trainer, who gets 403 either way, so strict-versus-loose could never
change the outcome. Rewritten to use the **assigned** trainer on their **own** client, where strict
refuses with 400 and loose would resolve and *allow*. Two suites, two decorative tests, both found
by mutation and neither by review.

**The sharper, new lesson: a mutation that silently fails to apply is indistinguishable from a
mutation that survived.** `sed` and then `perl` both failed to match the line I meant to change —
escaping, not logic. Each printed nothing and exited quietly, the suite ran green, and that green
looked exactly like "the guard is unpinned." I nearly recorded a surviving mutation and rewrote a
perfectly good test to chase it.

**A mutation you have not verified was applied is not a mutation.** The procedural form is to grep
the changed line and read it back *before* running the suite — the same positive-control discipline,
applied to the instrument that is supposed to be testing the instrument. Every mutation in that
slice is now confirmed applied before its result is believed.

**And the secret scanner caught me twice.** It flagged a throwaway `postgres://` literal in my own
test file, then flagged it again in the *comment* explaining why I had removed it. A fail-closed
gate that fires on its author is the gate working; the instinct to reach for an exemption is the
thing to distrust.

## Error → fix → repeat ledger

| Error class | This slice | Session total | Written up before? | What actually stopped it |
|---|---|---|---|---|
| A probe cannot find what it is looking for (wrong scope, wrong shape, wrong tree) | 1 (the sweep's blind spot) | **6** | Yes, three sessions running | Positive controls caught five. The sixth needed a different question: *what shape of hit would this pattern never match?* A positive control proves the probe sees something; it does not prove the probe sees everything. **That distinction is new and is the reason this row keeps recurring.** |
| A test/label asserts something it does not measure | **4** (the alg:none test; the mislabelled probe; the id-spelling test; the "no scoping" grep that guessed five helper names and missed `ensureClientAccess`) | 4 | Yes — this is the "control that passes can still be a decoration" packet, written about someone else two days ago, and now twice about me | Mutation for the tests — it caught both, review caught neither. For the grep: **stop guessing identifier names and read the file** when it is under ~150 lines. Two route files and a controller were each cleared in one read after three failed greps. |
| **An instrument that silently no-ops, reported as a result** | 2 (`sed` and `perl` each failing to apply a mutation; the green run then looked like a surviving mutation) | 2 | **No — new this session** | Verify the mutation landed before believing the run: grep the changed line and read it back. A mutation you did not confirm was applied is not a mutation, and its "survival" is a fabrication. |
| Output shape hides the truth | 0 | 2 | Yes, 3× in the prior session | Redirect to file, measure `$?` unpiped, read afterwards. Held for this whole slice once adopted mechanically. |

**The row that matters is the first one, and its correction changed.** For three sessions the
answer has been "attach a positive control." That is necessary and it is not sufficient: a control
proves the instrument is *alive*, never that its *aperture* is wide enough. The sweep's grep had a
perfectly good positive control — it found 48 real sites — and still missed 212 reads because the
pattern could not express them. The new procedural form is a second question, asked before the
result is believed: **what would a hit look like that this pattern cannot match?**

## External-model calibration

None called this slice. Carried forward unchanged from
`20260815-two-parsers-for-one-identity-is-a-bypass.md`: Kimi K3 is the stronger analyst and the one
that fabricates quotes; HY3 is 24× cheaper and found the same headline; both default to a **design**
remit and must be given an explicit `--remit` for security work.
