---
title: "Writing the lesson down did not stop me repeating it ninety minutes later"
originating_model: claude-opus-5
tier_basis: "Session model is Opus 5 (harness-stated: 'You are powered by the model named Opus 5 (1M context)', exact id claude-opus-5[1m]) — Rule 68 allowlist member by name; Sean designated Opus 5 Fable-tier 2026-08-10"
date: 2026-08-24
decision: "Built and proved leg 1 of the radar backup hub (workstation -> radar restic copy, restricted key, retention that fails closed). Nine defects found by executing rather than reviewing; two were repeats of lessons authored earlier in the same session."
status: shipped
privacy: "IDs/roles only; no PII, no secrets, no passwords, no absolute user paths"
surface: infrastructure / backups / agent-discipline
models_used:
  - model: claude-opus-5
    role: builder + own hostile reviewer
    did: "Discovery against radar and WSL, wrote four scripts, executed them, and found nine defects by running them rather than by reading them. Wrote the corrective phase and proved both the positive and negative paths."
    cost: subscription
skills_touched:
  - id: rule-73-proof-before-done
    action: applied
    motivated_by: "Every defect in this session was found by executing, never by review. The retention job passed reading and failed running."
  - id: blast-radius-guard
    action: applied
    motivated_by: "restic copy direction is load-bearing; reversing -r and --from-repo writes into the source. Source snapshot count recorded before and after and compared, so a reversal is caught rather than assumed away."
---

## The lesson

**A warning I wrote myself, in the same file, twelve lines above the code, did not stop
me from violating it. Neither did a learning packet I authored ninety minutes earlier
about the identical failure class.**

Two instances, one session:

1. I wrote a script header explaining — at length, with reasoning — that destination
   retention must be **greater than or equal to** source retention, because a tighter
   destination policy prunes snapshots the next copy re-uploads, forever. Twelve lines
   below that comment I set a policy **tighter than the source**. It pruned 40 snapshots
   to 30. The next copy restored all ten.
2. Earlier the same session I emitted a durable packet about the 12-night vault
   omission: *a job that reports success while its own required artifact is silently
   missing.* I then shipped a retention job whose status-file write failed with
   `Permission denied` while the job printed `RETAIN OK` and exited 0. The status file is
   the single artifact anyone would consult to learn whether retention was running. It
   did not exist. The job called itself healthy.

**So the mechanism is not ignorance, and it is not forgetting.** The lesson was present,
authored by me, in context, and adjacent to the code. What failed is that **prose is not
a control.** A comment describes intent; it does not evaluate. Reading a script confirms
that it *says* the right thing, which is precisely the check that cannot distinguish a
correct implementation from a plausible one.

**Both defects were found the same way: by executing and reading what actually happened.**
The retention bug surfaced only in the journal — the exit code was 0 and the summary line
said OK. The thrash bug surfaced only by counting snapshots before and after a real prune.
Neither was visible to inspection, and I had inspected both.

**The generalisable rule:** when you write down a constraint, in the same change add the
thing that *fails* when the constraint is broken. In this case that was three lines —
prove the status path is writable and `exit 3` if not; count snapshots before and after
and compare. Every one of the nine defects this session had an equivalent three-line
executable form, and none of them had it before the defect shipped.

**Corollary about instruments, which is the same disease wearing a different coat.**
Four separate times a tool reported a comfortable falsehood: `grep -iE 'ALL'` matched the
"all" inside *"not allowed to run sudo"* and aborted on a healthy user; `bash -n` under
Git Bash passed a CRLF-corrupted script that the interpreter which actually runs it
rejects; `du` reported 4.0K for a 4.5G directory it could not read; and an empty
`git log` result nearly became an absence claim. **Validate the instrument against a
known-good and a known-bad case before believing its verdict** — an instrument that has
only ever been shown passing input has not been tested, it has been used.

## Who did what

**Opus 5 (me)** — all of it, and all nine defects are mine. No reviewer, no paid model,
no panel; nothing was consulted. Sean caught none of these — he intervened twice on
*scope* (the browser-harness purpose the handoffs had lost, and disk retention), both
times correctly and both times about something no amount of my reviewing would have
surfaced, because it was knowledge only he held.

That distribution is the calibration signal worth keeping: **self-review caught the
implementation defects only once I executed things; it caught none of them by reading.
And self-review cannot catch a missing requirement at all** — Tier 0 of that options
document was absent because nobody had written the requirement down, and no amount of
hostile passing over my own text would have conjured it. Sean supplied it in one
sentence.

## Skills created or changed

No new skill. Three disciplines were exercised; the first two earned their keep and the
third exposed its own limit:

- **Blast-radius guard on copy direction.** `restic copy` takes the destination as `-r`
  and the source as `--from-repo`; reversing them writes into the repo you are protecting.
  Rather than trust the argument order, the script records the source snapshot count
  before and after and fails loudly if it changed. Proven: 40 before, 40 after.
- **REQUIRED-inputs gate that refuses rather than half-runs.** It fired correctly on a
  wrong password path — my assumption was wrong and the gate stopped it. This is the
  discipline working as designed, on its author.
- **Hostile review by reading — insufficient, demonstrated.** I reviewed the retention
  runner before shipping it and approved it. It was wrong in two ways. Only execution
  found either. Reading a script tells you what it claims.

**Proposed, not built:** a check that any script header stating a numeric or ordering
constraint has a corresponding assertion in the body. Both of this session's headline
defects would have been caught by it, and it is the third constraint-hygiene lesson in
this corpus in two days.

## Mistakes I made

- **Reported `RETAIN OK` exit 0 while the status file write failed** — the repeat of a
  lesson I authored the same session. Fixed to prove writability first and `exit 3`.
- **Violated my own header comment twelve lines later** — destination retention tighter
  than source, causing a prune/re-copy loop.
- **`grep -iE 'ALL'` false-FATALed** on "not allowed to run sudo".
- **`nologin` shell broke the forced command** — sshd execs forced commands through the
  login shell.
- **Placed the repo where the owning user could not traverse to it** — never checked the
  parent's permissions.
- **Validated a script with Git Bash when WSL runs it** — CRLF corruption passed review.
- **Assumed a password-file path** that the source script defines differently.
- **Trusted `du` output** produced without adequate permission.
- **`ProtectHome=read-only` would have blocked restic's cache** — caught pre-run.

## Error → fix → repeat ledger

| Error class | Instances | Written up before? | What actually stopped it |
|---|---|---|---|
| Job reports success while its own required artifact silently failed | 1 | **YES — by me, ~90 min earlier, same session** | Executing it and reading the journal; the exit code and summary line both lied |
| Self-authored constraint violated in the same file | 1 | no | Counting snapshots before/after a real prune |
| Instrument believed without validation | 4 | **YES — standing memory** | Running a control case; comparing against known-good output |
| Permission assumed, not checked | 2 | no | `sudo -u <user> test -w` before depending on it |
| Validated with the wrong interpreter | 1 | no | `file` + `bash -n` under the interpreter that runs it |

**Row one is the finding.** The documentation was current, correct, authored by me, and
in context — and the defect shipped anyway, inside the same session. That is decisive
evidence about what a write-up is worth on its own: **a lesson recorded is not a lesson
installed.** The corrections that held this session were all procedural and executable —
run a control, count before and after, prove writability then exit non-zero. The ones
that did not hold were all resolutional: know the rule, remember the rule, put the rule
in a comment.

Row three deserves the same reading. Four instrument failures in one session, against a
standing memory that already warns about exactly this. The memory fired once, when I
happened to be looking; it did not fire the other three times.
