---
name: stale-check
description: Stops agents burning hours on problems another agent already fixed. Every carried-forward blocker, memory, or handoff claim gets a one-command re-verification attached when written, and MUST be re-run before it is repeated. Fires when you are about to repeat a known issue, read a memory or handoff doc, write a closeout that carries a blocker forward, or say "this is still broken". Also carries the evidence-bearing closeout rule.
---

# stale-check — re-verify before you repeat

## Why this exists

**The incident, 2026-08-13.** An agent flagged "`scripts/lane.mjs` is missing from `main`, so
every agent's session start fails" in **four consecutive closeouts**. It was true when first
observed. Another agent had merged the fix days earlier. Nobody re-checked. Four handoffs
carried a dead blocker, and Sean read it four times.

Nothing was broken. Hours of attention went to a problem that no longer existed, and — worse —
a confident false claim sat next to a dozen true ones, which makes every claim in the document
cheaper.

**Why it is a class and not an accident.** Sean runs many agents on one repo at once:

- A finding is a **snapshot**. `main` moved 34, then 6, then 23 commits *during single slices*
  of one workstream.
- Handoff docs and memories are **written once and read many times**, so a stale claim gets
  louder over time, not quieter.
- Nobody owns retiring a finding. The agent who wrote it has moved on; the agent who fixed the
  underlying problem never saw the claim.
- The cost is **asymmetric**: re-verifying costs seconds, acting on a stale blocker costs
  hours, and reporting one costs trust.

## The rule

> **A carried-forward claim needs a re-verification command. Run it before you repeat it.**
> A claim you cannot re-verify in one command is not a blocker. It is a memory.

## When this fires

- You are about to write "X is still broken / still missing / still blocked".
- You are reading a memory, handoff doc, or `rolling-last-done.md` and about to act on it.
- You are writing a closeout that carries any blocker forward.
- Session start, on any repo where more than one agent is active.
- Someone says "didn't we already fix that?"

## The three commands

**1. Is the tree you are judging even current?**
```bash
git fetch origin main -q
git rev-list --count HEAD..origin/main    # >0 means your view is stale
```
A finding made 30 commits ago was made about a different repository.

**2. Re-run the claim's own check.** Every carried claim must ship with one. Examples of what
a good check looks like:

| claim shape | its re-verification |
|---|---|
| "file X is missing from main" | `git ls-tree -r --name-only origin/main \| grep -c 'X'` |
| "command Y fails" | run Y, show the exit code and the last line |
| "endpoint Z is down" | `curl -s -o /dev/null -w '%{http_code}' <url>` |
| "N tests fail" | run them, paste the tail |
| "nothing imports M" | `grep -rln 'M' <scopes>` — and read the hits, do not assume |

**3. If it is fixed, RETIRE IT LOUDLY.** Do not quietly stop mentioning it — say it was stale,
say when it was true, and say who fixed it if you can tell. A silent disappearance teaches the
next reader nothing; an explicit retraction teaches them to re-check too.

## Writing a claim so the next agent can check it

Every blocker in a handoff, memory, or closeout carries three things:

```
CLAIM:  scripts/lane.mjs is absent from main, so `lane.mjs digest` fails for every agent
CHECK:  git ls-tree -r --name-only origin/main | grep -c 'scripts/lane.mjs'   # 0 = still true
AS-OF:  2026-08-12, main @ 78426ecf5
```

`AS-OF` is what makes staleness visible. A claim without a date and a commit is undateable,
and an undateable claim never expires.

## The companion rule: evidence-bearing closeouts

Same disease, different surface. From the same workstream, a reviewer's finding:

> *"You fixed verification theater in the system and kept it in the status report."*

Closeouts claimed "grep-verified", "209/209 tests pass", "prod 200" **with no grep output, no
run log, no status line**. Unverifiable from the artifact handed over.

> **Every claim in a closeout carries its command and output inline, or is tagged
> `[UNVERIFIED]`.**

Not a summary of the output — the output. `# pass 178 / # fail 0` is evidence;
"all tests pass" is a claim about evidence. This costs nothing and only removes the ability to
be vague. It caught a false claim within an hour of adoption: a "nothing imports this" grep
returned a hit that turned out to be a comment — under the old habit it would have been
written up as clean.

## What this is NOT

- **Not a reason to re-verify everything constantly.** Only claims you are about to *repeat*
  or *act on*. A finding you made 20 seconds ago in this session is fine.
- **Not a replacement for `agent-lane`.** That skill tells you what other agents are doing
  right now; this one tells you whether what you *believe* is still true.
- **Not a blocker on shipping.** It is three commands, and two of them are `git`.

## Interaction with other agents

If your check shows another agent fixed the thing:
1. Retire the claim in your closeout explicitly.
2. If it appeared in a memory file, **update or delete that memory** — a stale memory is worse
   than a stale doc because it loads automatically.
3. Do not re-flag it "just in case". A blocker reported after it is fixed is noise, and noise
   is how real blockers get skimmed past.

## One-line version

**Before you say it is still broken: check. Before you write it down: attach the check.
Before you claim it is verified: paste the proof.**