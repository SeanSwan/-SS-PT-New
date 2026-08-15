# Hermes inbox — three-way hostile review of the authz lane, and the defect it found

**When:** 2026-08-15 UTC · **Surface:** vs-claude, worktree `C:/tmp/ss-qa-harness-slice0`
**Branch:** `claude/qa-harness-slice0-20260811` (still NOT pushed) · **Agent:** Claude Opus 5, session `main-seae22129`

## What happened

Handoff D ordered the next agent to attack the previous session's authz work through Kimi K3,
HY3, and its own eyes, with the author excluded. Ran it. All three found the same defect
independently.

`preKeyFetchLimiter` — new middleware on the live E2EE key-bundle route — keyed its rate-limit
bucket on the **raw** `req.params.userId` while the handler resolved the target with
`parseInt(x, 10)`. parseInt is lenient, so `/keys/902`, `/keys/0902`, `/keys/+902` and
`/keys/902a` were four buckets and one victim. Measured: **100 requests, 0 throttled, 100
prekeys drained from a single target.** After the fix: 72 requests across 18 spellings, exactly
20 consumed, and 40 distinct legitimate victims still return 200.

The suite could not see it because every test shipped with a canonical integer. It varied actor,
target and count — never the spelling, which is the one input the key is derived from.

Also corrected a comment that was arithmetically false (20/hour does not make exhaustion "cost
many distinct accounts" — one account drains a ~100-key pool in 5h and sustains ~480/day).

Commits: `3526a68e0` (fix), `b986bd7ea` (adjudication + both reviews), `1e755f096` (sibling sweep).

## Decisions worth carrying

- The security fix went in the **key generator**, not in middleware ordering. Ordering fragility
  is what caused the bug; a fix that depends on ordering inherits it.
- Did **not** build the per-actor ceiling both reviewers wanted. It is real, but a second limiter
  on a live E2EE route changes behaviour for heavy legitimate users — Sean's call.
- Did **not** make `param('userId').isInt()` real. It is decorative (zero `validationResult` in
  that route file) and remains an open finding, but fixing it changes a live error contract.

## Mistakes I made

- **Ran a file-scoped grep and nearly reported a repo-wide number.** I checked `keyGenerator`
  in `rateLimiter.mjs` only, and was one sentence from writing "the only keyGenerator in the
  repo." There are **nine**. Caught it during the Rule 20 sibling sweep. The claim would have
  been false in a document written to be trusted.
- **Repeated a handoff claim without verifying it.** I wrote that the consult scripts default to
  a design remit based on the handoff saying so. Only afterwards did I open the scripts and
  confirm it first-hand. It happened to be true. That is luck, not method — and the handoff I
  was trusting contains at least one claim that is false (see below).
- **Formed and published a hypothesis before testing it.** I claimed express-rate-limit v7's
  IPv6 `keyGenerator` validation would reject the raw `req.ip`. Disproved it myself minutes
  later with a positive control — the terms are absent from the installed 7.5.1.
- **Truncated my own evidence with `tail -25`** on a backgrounded full-suite run, which cut the
  second failing filename out of the capture. Had to re-run the candidates separately to identify
  it. Same family as the pipe-swallows-exit-status error the prior session made three times: *do
  not let the shape of the capture decide what you get to see.*

## Corrections to prior documents

- **Handoff D §2b is wrong** where it says the limiter "is the only limiter in the repo keyed on
  something other than IP." Four money-path limiters, three gallery limiters and the gamification
  limiter all key on non-IP identities. The code comment said "in this file" and was correct; the
  handoff widened it and dropped the qualifier.
- **`memberDirectoryLateralProbe` is listed as failing in handoff D and now passes.** Someone
  fixed it. Do not carry it forward as broken.

## External-model calibration

| Model | Cost | Checked | Real | Disproven |
|---|---|---|---|---|
| Kimi K3 | $0.3198 | 7 | 6 | 1 — **fabricated a source quote**: cited a regex not present in the file, and its proposed fix is already what the file does |
| Tencent HY3 | $0.0133 | 2 | 2 | 0 — but underestimated severity ("finite spellings"; it is unbounded) |

**HY3 cost 24× less than Kimi and still found the headline finding independently.** That is the
most useful routing fact this session produced. Both scripts default to a *design* remit and both
returned pure security analysis once given an explicit `--remit` — the override replaces rather
than appends (`options.remit || defaultRemit`, line 120 of each). Total spend **$0.333** vs a $3
cap. Sean approved the spend before either call.

## Still Sean's, unchanged and now twice-carried

1. **The branch has never been pushed.** Upstream is misconfigured to `refs/heads/main`, so a
   bare `git push` targets the deploy branch. Safe form:
   `git push origin claude/qa-harness-slice0-20260811:claude/qa-harness-slice0-20260811`
2. **18 of 26 Hermes learning packets exist only on this machine.** A disk failure takes 69% of
   the corpus the rules describe as durable and machine-independent.
3. Carried further back: rotate the Render API key; add the DMARC record (SWA-13).
