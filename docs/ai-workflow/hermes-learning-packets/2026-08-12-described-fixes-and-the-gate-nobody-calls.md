---
title: A described fix is not a wired fix — and unit tests cannot tell the difference
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 and Kimi K3 are Fable-tier
reviewed_by: moonshotai/kimi-k3 (hostile code review, verdict SEND-BACK, 7/7 findings real)
date: 2026-08-12
decision: Assertion-wiring must be tested separately from the mechanism it asserts
status: shipped
supersedes: none
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

# A described fix is not a wired fix — and unit tests cannot tell the difference

## 1. What happened

Shipped a QA-harness change whose headline claim was: *an expired suppression stops silencing a
defect and fails the build.* Wrote the mechanism, wrote unit tests for it, watched them pass,
reported it to Sean as working, and committed it.

It did not work. The value the mechanism produced — the list of blocking findings — was
computed, printed to the console, and **thrown away**. No assertion consumed it. An expired
suppression produced a red line in stdout and a green test.

Kimi K3's hostile code review opened with it: *"the slice's headline claim is false as
committed. The expiry mechanism is wired to a console printout, not to any assertion."*

## 2. Why the tests could not catch it

Every test called the mechanism directly:

```
applySuppressions(findings, [expired], today)  →  audit.expired.length === 1   ✓ passes
suppressionFindings(audit)[0].severity === 'critical'                          ✓ passes
```

All true. All useless. **Testing that a function returns the right answer says nothing about
whether anything asks it the question.** The gap is invisible to unit tests by construction,
because the unit test *is* the caller it is missing.

The regression test that actually pins it constructs the case where the OLD gate is clean and
only the NEW gate can fail:

```
compactIssues(state, routes)     →  NO_ISSUES        (old gate: passes)
worklist.blocking                →  ['expired-suppression']  (new gate: must fail)
```

That is the shape to reach for: **find an input where only the new wiring can produce a
failure, and assert the failure.** If no such input exists, the wiring adds nothing.

## 3. The generalisable rule

For any change of the form "X now fails the build":

1. Name the assertion that consumes X. If the answer is "it's logged" or "it's in the report",
   **it is not wired**.
2. Write one test whose only possible failure route is that assertion.
3. Falsify it: remove the assertion, confirm that test — and only that test — goes red.

A `console.log`, a JSON field, and a report section are all *outputs*. None of them is a gate.

## 4. The same error class, three times in one session

This is the third instance of one pattern found in a single session, and the third is mine:

| # | Surface | Confident output | Actual input / effect |
|---|---|---|---|
| 1 | `POST /render-job` | `success: true, "Render job queued"` | no worker, no dependency; nothing queued |
| 2 | `mission-report.mjs` | timestamped "QA REPORT" | read zero test results; fixed prose |
| 3 | **the suppression gate** | "expired = fails the build" | computed, logged, discarded |

I found #1 and #2 in other people's code, named the pattern explicitly — *"a script whose
output is a confident document and whose input is nothing"* — wrote it up as something to hunt
deliberately, and then committed #3 within the hour.

**Naming a failure pattern does not inoculate you against it.** The hunt has to be turned on
your own diff, at the moment you are about to claim the thing works. That moment — writing the
completion claim — is exactly when self-review is weakest, which is why it is the highest-value
moment to spend an external hostile review.

## 5. Two suppression systems is one too many

A related structural lesson. The change added an expiring suppression registry but left the old
hardcoded allowlist in the assertion path. Result: two systems, and **the advisory one was the
new one**. A registry entry could expire while the real gate kept swallowing the defect forever.

Rule: when replacing a mechanism, the migration is not the paperwork — it is deleting the old
call site. If both exist, assume the old one is authoritative until proven otherwise, because
it is the one that has been load-bearing.

## 6. Correlation over global state whitelists a whole class

Also worth carrying. A noise filter asked "did ANY socket teardown failure happen this run?" to
excuse a class of console error. Since that failure always happens early, every later error of
that class — from any endpoint, for any reason — was excused for the rest of the run.

Existential checks over accumulated run state are not filters, they are switches. Bound them
(consume a budget per suppressed item) or key them to the specific item.

## 7. External-model calibration

- **Kimi K3, hostile code review of full source, ~$0.01: 7 findings, 7 real, 3 fatal, 0 false
  positives.** Every finding was verified against source before acting.
- **Sending real source beat sending a summary.** An earlier architecture review from the same
  model, given a written description, produced good but generic guidance. Given the actual
  files, it found dead wiring — because it could see call sites and check whether a claim was
  reachable rather than merely correct.
- **The reusable trigger:** buy hostile review at the moment you are about to tell Sean
  something works. Not after shipping, not during design — at the completion claim.

## 8. Verification hooks for a future reviewer

- Re-check that `worklist.blocking` is still asserted, not merely logged. It is the single gate
  carrying the entire suppression-expiry guarantee.
- Confirm no second product-suppression path has reappeared alongside the registry.
- Three suppression lists outside the crawl were deliberately NOT migrated and still have no
  expiry. Until they are, the incentive fix is local to one surface.
- Confirm the harness-exhaust budget is still bounded and has not drifted back to an
  existential check over run state.
