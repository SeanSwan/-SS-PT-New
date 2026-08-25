---
name: a-control-that-did-not-run-looks-like-a-test-with-no-teeth
date: 2026-08-25
originating_model: claude-opus-5
tier: fable
surface: backend/routes/sessions.mjs + backend/services/sessions/session.service.mjs
commits: 406aabbb8, 2121e42a2
models_used:
  - model: claude-opus-5
    role: builder, hostile reviewer
    did: answered three open panel questions; found the fourth placeholder at its origin; wrote two positive controls that lied and caught both
    cost: subscription
  - model: stealth/ox-alpha
    role: hostile review seat (standing)
    did: predicted the 24-hour boundary-drift class from first principles without seeing the service source; its top-rated risk was wrong because the packet was a diff, not a handler
    cost: $0.0000
skills_touched:
  - id: instrument-check
    change: extended
    failure: a positive control that silently no-ops is indistinguishable from a test with no teeth, and both read as "green"
  - id: test-driven-development
    change: sharpened
    failure: a boundary test with a safety cushion does not test the boundary
---

# A control that did not run looks like a test with no teeth

## The lesson

Positive controls are the tool for "does this test actually catch anything." Twice
today the control itself was the thing that failed, and both times the symptom was
identical to the failure I was checking for.

**Case one.** I reverted a fix, expected the test to go red, and it stayed green.
The obvious reading is "my test has no teeth." The actual cause: the control script
used `\n` patterns against a CRLF file, `String.replace` found nothing, returned the
original unchanged, and my script printed "reintroduced" because I never checked.
The fix had never been reverted. **A green result after a no-op control and a green
result from a toothless test are the same observation.**

**Case two.** I wrote a boundary test for a 24-hour policy and added `+2000ms` to
the session time "to avoid clock flakiness." That put the session 24.0005 hours out,
which satisfies `> 24` *and* `>= 24` — so the test passed against the exact bug it
was written to catch. Caught only because I ran a control, which this time worked.

Both collapse to one rule: **a control must verify it landed before its result means
anything.** Not "did the replace run" — did the file now contain the broken state.
Three lines:

    fs.writeFileSync(p, patched);
    const after = fs.readFileSync(p, 'utf8');
    if (!after.includes(brokenMarker)) { console.error('CONTROL DID NOT LAND'); process.exit(1); }

And the corollary for boundary tests specifically: **a cushion added for stability
moves you off the boundary, which is the only place the test has meaning.** Freeze
the clock instead (`vi.setSystemTime`) and land exactly on it. Flakiness and
meaninglessness are not a trade-off to split — determinism gives you both.

## The other finding: the same placeholder, fourth layer

`GET /api/sessions/:id/cancel-warning` served `lateFeeAmount: 88` hardcoded to
every client — `Math.round(175 * 0.5)` — and told them "a fee of $88 may apply",
for a fee that is never charged to a client at all.

This is the **fourth** appearance of that number in one workstream. It was fixed in
the frontend hook, then the cancel panel, then the server-side charge derivation,
and each fix pushed it one layer further back rather than killing it. The pattern
to recognise: **when the same literal keeps reappearing, you are not fixing a bug,
you are chasing it upstream** — and the fix is to find where it originates and
whether anything downstream is still entitled to invent it.

## Who did what

**claude-opus-5** answered the three open questions, found the fourth placeholder,
and wrote both broken controls.

**Ox Alpha** ($0.0000, third consecutive round of real findings) predicted the
boundary-drift class from first principles — *"nothing shown proves cancelSession
uses the same operator as the warning"* — without ever seeing the service source.
It was right, and there were three disagreeing predicates rather than two. Its
top-rated risk (an unscoped `cancel-warning` endpoint) was wrong, and the cause was
mine for the second time: **I sent a diff instead of the full handler, and a diff
cannot show an authorization check that did not change.**

## Skills created or changed

No new skill. One extension to the instrument-check discipline, stated as a rule:

> A positive control must assert its own landing. Verify the broken state exists in
> the file before reading the test result. A control that no-ops and a test with no
> teeth produce the same green.

And one packet rule earned the hard way, twice: **send reviewers the whole handler,
not the diff.** A diff shows what changed; reviewers need what *is*. Both wrong
top-severity calls Ox has made on this workstream trace to that.

## Mistakes I made

- Wrote a control with `\n` patterns against a CRLF file and reported success
  without verifying it landed.
- Briefly concluded my test had no teeth when in fact my control had not run.
- Added a stability cushion to a boundary test, which moved it off the boundary and
  made it pass against its own target bug.
- Sent Ox a diff rather than the full route handler — the second time a packet
  defect caused a wrong top-severity call, and after I had already written a
  learning packet about packet quality.

## Error -> fix -> repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Trusting an instrument that did not run | 6 across the day (grep truncation, `grep -P`, tsc OOM, dead route file, control no-op x2) | Yes — skill, memory, and TWO packets written today | Only ad-hoc suspicion. Now has a concrete procedure: controls assert their own landing. |
| Packet gives reviewer partial evidence | 2 | Yes — packet written earlier today | Nothing yet. Both instances produced a confidently wrong top-severity finding. |
| Test that cannot fail | 1 | No — new | The positive control, which is the only reason it surfaced. |
| Same literal chased upstream instead of killed | 4 layers | Yes — this workstream's whole thesis | Finding the origin. Three prior fixes each moved it one layer back. |

The top row is now at six occurrences in one day, and it is the first time it has a
*mechanism* attached rather than an exhortation — controls that assert their own
landing. That is the shape that worked for the `$$` bug (root-caused to
`String.replace` semantics, fixed with function replacers, zero recurrences since).
Whether it holds is next session's evidence, not this one's claim.

## External-model calibration

Ox Alpha remains the best value on the board: $0.0000, three rounds, a real
predicted-from-theory finding each time. Its failure mode is consistent and is
mine to fix — it over-rates risks in code it was not shown. Feed it whole handlers
and its precision goes up; feed it diffs and it burns a P1 slot on something that
was never broken.
