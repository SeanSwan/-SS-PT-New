---
title: "My 11 tests passed while the system's 38 found the hole I had just made"
originating_model: claude-opus-5
tier_basis: "Session model is claude-opus-5[1m] (harness-stamped) — Fable-tier by Sean's designation 2026-08-10, on the Rule 68 allowlist"
date: 2026-08-19
decision: "Three approved guard fixes applied; migration 0028 shipped and the default-off law proven against live Postgres with four attacks; a self-introduced class-B hole found by the guard's incumbent suite and handed back for approval rather than self-applied"
status: draft
privacy: "Repo-relative paths, table and function names only; no PII, no secrets, no credentials"
models_used:
  - model: claude-opus-5
    role: builder / verifier
    did: "Applied three approved class-S fixes, wrote and shipped migration 0028, attacked the law four ways against live Postgres, ran the incumbent guard suite, found and disclosed its own regression, filed a fourth change request instead of self-applying"
    cost: subscription
skills_touched:
  - id: blast-radius-guard
    action: amended
    motivating_failure: "Repo-blind snapshot resolution and trigger-DDL misparsing blocked 100% of correct SwanGuard migrations; the amendment then introduced a relative-path hole caught by the guard's own tests"
  - id: verification-before-completion
    action: applied
    motivating_failure: "A self-authored 11-test verification suite passed green while the system it verified had a silent hole"
---

# My 11 tests passed while the system's 38 found the hole I had just made

I modified a safety guard, wrote eleven tests to prove I had not weakened it, and got
eleven passes. Then I ran the guard's **own** test suite: 34 pass, **4 fail** — including
the test protecting the original incident the guard was built for.

## Who did what

- **claude-opus-5** applied three owner-approved fixes, shipped a migration, proved a
  database-level invariant with four live attacks, then found its own regression by running
  the incumbent suite. Its worst move: writing a verification suite that shared its own
  blind spot and treating that suite as sufficient. Its best: running the incumbent tests at
  all, and handing the fix back for approval instead of self-applying a fourth time.

## Skills created or changed

`blast-radius-guard` — **amended** (repo-aware snapshot, class-B abstention across repos,
trigger/grant DDL excluded from class-C), then found to carry a self-introduced hole; the
correction is filed as a change request, unapplied. `verification-before-completion` —
**applied**, and found insufficient in the specific way this packet documents.

## The lesson

**When you modify a system that has tests, ITS suite is the gate. Yours is supplementary.**

My eleven tests covered exactly what I believed mattered, and every one used an **absolute**
file path — because that is how I had been thinking about the bug. The incumbent suite used
**relative** paths, because that is how the system is actually called. My change compared a
`filePath` against an absolute repo root; a relative path fails an absolute prefix test, so
in-repo files were classified as *foreign* and a whole check was silently skipped for them.

**A verification suite written by the person making the change inherits that person's blind
spot by construction.** It cannot be otherwise: the same mental model produced both the code
and the tests. The incumbent suite is valuable precisely because someone else wrote it, at a
different time, against failures nobody now remembers by heart — in this case a real
2026-08-11 incident where SQL pointed a foreign key at a stale `users` table.

**Procedural correction, not a resolution:** run the incumbent suite **before** writing your
own, and again after. Before, so you learn what the system already believes is dangerous.
After, so it judges you. "Test carefully" changes nothing; "run their tests first" is
checkable.

## The second lesson: a silently degraded guard is worse than a removed one

The hole was invisible from outside. The guard kept blocking, kept printing findings, kept
looking healthy — while not checking an entire class of file. Nobody would have noticed,
because a guard that *usually* fires reads as a guard that works.

**Degradation modes deserve louder alarms than outages.** An outage announces itself. A
partial failure of a trust system quietly converts trust into exposure — and the more
reliable the system has been, the more damage the silent hole does.

## The third lesson: a correct block is answered by fixing the input

Mid-session the guard blocked my own attack script, because that script contained a genuine
unbounded `UPDATE`. The tempting move was to request an approval — I had three fresh ones
and the mechanism was right there.

Wrong instinct. **The block was correct; the input was bad.** I rewrote the test SQL to be
bounded. Requesting approval to run something genuinely destructive, merely because the
approval path exists, is how an approval mechanism degrades into a formality. Approvals are
for changes that are *right and blocked*, never for inputs that are simply *wrong*.

That block was also the best evidence available that my fix preserved class C: it stopped me.

## Mistakes I made

- Introduced a hole in a safety guard while fixing it.
- Wrote a verification suite that shared my own framing (all absolute paths) and trusted it.
- Ran the incumbent suite last instead of first — the regression was discoverable in minute one.
- Handed the owner three commands without a `cd`; all three failed.

## Error → fix → repeat ledger

| Error class | Times | Written up before? | What actually stops it |
|---|---|---|---|
| Own tests share own blind spot | 1 | No — new class | The incumbent suite caught it. **Gate: run the system's existing tests BEFORE writing yours, and treat them as the acceptance bar.** |
| Absolute vs relative path comparison | 1 | No | Normalise or resolve; never assume path shape. A cross-platform footgun that looks correct in every test you would think to write. |
| Approval mechanism as an escape hatch for a correct block | 1 (resisted) | No | Recognised in the moment. **Gate: ask "is the block wrong, or is my input wrong?" before reaching for approval.** |
| Command given to the owner without its working directory | 1 | No | Three MODULE_NOT_FOUND errors. **Gate: every command handed over ships with its `cd`.** |

## External-model calibration

None this turn — no external consult, deliberately. The work was applying already-reviewed
changes and verifying them against a live database; the disagreements were settled by
execution, not judgement. **Noting the absence on purpose:** a hostile panel adds little
where a test suite and a Postgres instance can answer the question directly, and spending on
one would have been theatre.

## What proved it

Four live attacks on Postgres all raised (direct write, born-enabled insert, non-owner actor,
and a pre-written owner event in a separate transaction). Positive path verified end to end
with audit attribution. Migration applied 1 / skipped 27. Schema tests 12/12; service tests
14/14; type-check exit 0 across four workspaces. Incumbent guard suite **34/38 — the four
failures are mine, disclosed, and unfixed pending approval.**
