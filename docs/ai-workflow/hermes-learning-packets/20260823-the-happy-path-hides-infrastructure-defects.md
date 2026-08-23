---
title: "The happy path hides infrastructure defects — four that all passed a green run"
originating_model: "claude-opus-5"
tier_basis: "claude-opus-5 is a Rule-68 Fable-tier learning source by Sean's explicit designation 2026-08-10. Every defect below was found by executing a new vantage, not by reading code, and each fix was re-proven against the real caller path."
privacy: "IDs and roles only. No client names, no PII, no credentials, no key values. Secret-scanned clean."
date: 2026-08-23
surface: "radar SwanGuard Postgres backup / shell + systemd infrastructure"
decision: "A green run proves the happy path and nothing else. Error paths, unreachable branches, log destinations and concurrency all fail silently while success output looks perfect — so each needs its own executed vantage, not a code read."
status: shipped
supersedes: none
models_used:
  - model: "claude-opus-5"
    role: "builder + hostile reviewer + final decider"
    did: "built the restore-verified backup; then found across ten rounds that its own lock line silenced all stderr, its non-root fallback was unreachable, a helper was dead code, and the orphan-reap raced concurrent runs — none of which affected a successful run"
    cost: "subscription"
skills_touched:
  - id: "rule-73 proof-before-done"
    change: "reinforced"
    motivated_by: "four defects survived a run that printed a perfect success block and exited 0"
---

## The lesson

I built a database backup that worked on the first try: correct output, exit 0, dump written,
restore test passed. Ten hostile rounds then found four real defects in it. **Not one of them
changed the successful run's output.**

1. **`exec 9>"$LOCK" 2>/dev/null` silenced stderr for the entire script.** `exec` with
   redirections and *no command* changes the shell's file descriptors permanently — that
   `2>/dev/null` was not scoped to the lock, it applied to everything after it. Every failure
   message and the whole systemd journal would have gone dark, while stdout kept printing
   success. Found only because a "SKIPPED" line I *expected* to see was missing. Nothing about
   a working backup would ever have revealed it.
2. **A `sudo -n docker` fallback for non-root callers was unreachable** — the `/run` lock
   above it already fails for non-root. Resilience that cannot execute is dead code. My first
   fix put a root check *after* the lock, so it still never fired; it took a second pass to
   get the ordering right.
3. **A helper was defined and never called**, implying a per-table digest comparison that was
   not happening.
4. **The orphan-reap dropped every scratch database it found**, including one belonging to a
   concurrently running instance — which would have failed a healthy backup and deleted a good
   dump.

Transferable rules:

- **Each error path needs its own executed vantage.** Reading `failed()` proves nothing about
  whether its output reaches anywhere. Trigger it and look at where the text actually lands.
- **`exec REDIR` with no command is permanent.** If you want a redirection scoped to one
  operation, put it on that operation. This is a trap with no warning and no symptom.
- **A fallback branch is a claim that it can be reached.** Check what runs before it. Order is
  part of the logic, not a detail.
- **Verify your own printed recovery instructions by executing them verbatim.** Mine worked —
  but that was luck, not diligence, until I ran them.
- **Test side effects on live status surfaces are real.** A synthetic failure test clobbered
  the genuine status file; the next reader would have seen a failure that never happened.

## Who did what

**claude-opus-5** built it and found every defect in it, across ten rounds each entering from a
vantage not yet tried: sandboxed failure injection, the systemd caller path, journal contents,
the non-root branch, retention, a truncated-dump injection, an injected second database, and
finally executing the script's own printed restore instructions. No external model was
consulted. The pattern that produced results was refusing to count a code re-read as a round.

## Skills created or changed

- **`radar-db-backup`** — restore-verified Postgres backup with a REQUIRED-style failure
  posture: a dump that cannot be restored is deleted rather than kept, and a database that
  appears in the instance but is not covered gets NAMED rather than silently skipped.
- **Rule-73 proof-before-done, reinforced** — "it ran and exited 0" is evidence about one path.

## Mistakes I made

- **I shipped stderr suppression and did not notice for a full round**, because everything I
  was looking at went to stdout.
- **I wrote dead code twice in one script** — an unreachable fallback and an uncalled helper —
  in a session whose own corpus already carries "dead code is not unreferenced code".
- **I fixed the unreachable branch by adding a check that was itself unreachable.** Same bug,
  second instance, ten minutes apart.
- **Three more defective probes**: SQL quoted with `"` where Postgres needs `''` (empty result
  read as a mismatch); `grep -P` erroring while my `||` printed "OK" on a genuinely corrupt
  file; and `printf` interpreting `\b` inside a Windows path, corrupting a launcher while my
  "no non-ASCII bytes" check passed — because a backspace *is* ASCII.
- **I clobbered a live status file with a test** and had to re-run the real job to restore truth.

## Error to fix to repeat ledger

| Error class | Times this session | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| Defective probe read as a real finding | **10 across the session** | Yes — an existing memory cites six prior instances, and I wrote it up again this morning | Nothing yet. It recurred four more times *after* I documented it today. The only correction with any evidence behind it: on any negative, mismatch, or absence result, re-run the probe against a case known to be positive **before** reporting. A `grep -P` that errors and an `||` that fires on error are the same bug wearing different clothes. |
| Dead / unreachable code presented as resilience | 3 (uncalled helper, unreachable fallback, unreachable fix for the fallback) | Yes — "dead code is not unreferenced code" is already in this corpus | Executing the branch. Reading it is what produced it in the first place. |
| Silent-output defect invisible on the happy path | 1 | No — this is new | Deliberately triggering an error path and checking where the text lands, rather than checking that the good path prints. |
| Test side effects on live surfaces | 1 | No | Predicting the side effect before running, and restoring truth immediately after. |

## External-model calibration

None consulted during the build. Sean has directed a multi-model hostile panel (GLM 5.3,
Grok 4.6, DeepSeek, Ox Alpha) over this code as the next action, debating to consensus — that
panel's findings versus what these ten self-rounds already caught will be the real calibration
datapoint, and it should be recorded here when it returns.
