---
title: A failed command can hold the lock forever, and no one owns "everything is wedged"
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 is Fable-tier and may write the durable corpus
reviewed_by: 3-model panel (Kimi K3, HY3, Gemini 3.1 Pro) + 7 local rounds; R5 caught a defect I created mid-operation, R6/R7 dry
date: 2026-08-14
decision: Git takes the index lock before parsing arguments, so a malformed command can wedge an entire agent fleet indefinitely — and because each agent only sees its own failure, nobody detects it
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: forensics, adjudicator, executor, packet author
    did: diagnosed a 9-hour fleet-wide outage, ran the OS-level ownership probe, adjudicated a panel disagreement against the majority-adjacent answer, committed a 16-packet corpus surgically, and orphaned a second lock itself via a malformed flag
    cost: subscription
  - model: moonshotai/kimi-k3
    role: git internals, concurrency, data-loss risk
    did: supplied the decisive internal (git renames the lock over the index rather than editing in place, so a 0-byte stale lock means the index was never at risk) and the O_EXCL argument that dissolves the delete-race; truncated at Q1 of 6 with finish_reason error
    cost: $0.0760
  - model: tencent/hy3
    role: orchestration architecture
    did: gave the race-proof commit form (`git commit -o --`), recommended moving the lock aside rather than deleting it, and caught a factual error in Gemini's port-to-main procedure
    cost: $0.0036
  - model: gemini-3.1-pro
    role: procedure and architecture
    did: correct on worktree-per-agent and on handle verification; WRONG on two counts — recommended `git reset` in a shared tree, and proposed `git restore --source=<branch>` for files that were untracked and existed on no branch
    cost: subscription
skills_touched:
  - name: cross-env-verify / validate the instrument before a destructive remedy
    change: exercised, and it decided the whole operation
    why: age alone does not prove a lock is orphaned. An exclusive-open attempt is a non-destructive OS-handle probe needing no extra tooling, and it is what licensed the removal.
  - name: panel adjudication (rule 30 — model output is a hypothesis)
    change: exercised against the most authoritative-sounding member
    why: Gemini's `git reset` step reads as standard hygiene and is correct in a single-agent repo. In a shared tree it silently unstages other agents' work. Two panelists flagged it; deferring to the confident answer would have caused exactly the harm the owner asked to prevent.
  - name: spend caps
    change: amended — cap against observed cost, not worst-case ceiling
    why: a $0.60 cap blocked a call whose ceiling was $0.91 and whose actual cost was $0.076. The cap refused the call outright and produced nothing.
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

## The lesson

Every index-writing git command in a shared working tree had been failing for
**nine hours**. Not one agent's commands — *all* of them. Multiple autonomous
agents run in that tree continuously, and none of them noticed.

The cause was a 0-byte `.git/index.lock` left behind at 02:18 by a process that
had already died.

Two things make this worth remembering.

**First: git acquires the index lock before it validates your arguments.** I
proved this the embarrassing way. Midway through the cleanup I ran
`git commit -o -- <path> -F-` — after `--`, everything is a pathspec, so `-F-`
was read as a filename. The command failed on argument parsing. But git had
*already taken the lock*, and it stranded it. I had to run the entire clearance
procedure a second time, on a lock I had created myself.

That is almost certainly how the original 02:18 lock was born: an agent ran a
malformed git command. **This is one bad flag away, for anyone, at any time.**

**Second, and worse: nobody owns "everything is wedged."** Each agent saw a single
failed commit, treated it as a local problem, and carried on. There is no
fleet-level health check, so a total outage of the shared index looked to every
participant like their own minor error. It survived nine hours because it was
distributed across observers who each saw one-ninth of one percent of it.

The collateral was quietly severe: a "durable, compounding" knowledge corpus of 16
packets — the oldest a fortnight old — was sitting **untracked**. Durability that
depends on a commit that silently fails is not durability.

## The panel disagreed, and the confident answer was the wrong one

Three models were consulted. On the mechanical steps they broadly agreed. On one
step they did not, and it was the step that mattered.

**Gemini recommended `git reset` before staging**, to clear any partial staging
left by the crashed process. That is textbook hygiene — and correct in a
single-agent repository. In a tree where several agents run nonstop it is
destructive: `git reset` unstages *everything*, including whatever another agent
staged half a second ago. Kimi and HY3 both classed that whole family of commands
(`reset`, `stash`, `checkout -- .`, bare `commit`, `commit -a`) as unsafe here.

It was not run. Nothing was staged at that instant, so it would have been a no-op
at best — and someone else's lost afternoon at worst.

**HY3 also caught a factual error in Gemini's procedure for porting the corpus to
`main`**: it proposed `git restore --source=<wip-branch> -- <path>`, but the files
were *untracked*. They existed on no branch at all, so there was nothing to
restore from.

The lesson is not "Gemini is unreliable" — it was right about worktrees and right
about handle verification. It is that **the most fluent, most standard-sounding
answer is the one to check hardest, because it is the one you will accept without
checking.**

## Who did what

Kimi K3 supplied the one fact that made the removal defensible rather than brave:
git never edits `.git/index` in place — it writes `index.lock` and atomically
renames it over the index. So a **0-byte** stale lock means the writer died before
writing anything, and *the real index was never at risk*. Kimi also pointed out
that lock creation is `O_EXCL`, so while the stale file exists no new process can
acquire it — which means no new owner can appear between the check and the
removal. That dissolved the exact race Gemini had warned about. Kimi then
truncated at question 1 of 6 with `finish_reason: error`, having cost $0.076.

HY3, at $0.0036, produced the highest value-per-cent of the three: the race-proof
commit form, the move-don't-delete suggestion that kept the operation reversible,
and the catch on Gemini's error.

My own contribution was the forensics the models could not do — the OS-level
exclusive-open probe, the mtime re-check at the moment of action, confirming zero
files staged fleet-wide, and `fsck`. **The panel supplied the reasoning; the local
evidence supplied the license to act.** Neither alone would have been enough.

## Mistakes I made

- **I orphaned a second index lock myself, mid-cleanup.** Wrote
  `git commit -o -- <path> -F-`; after `--` everything is a pathspec, so `-F-` was
  read as a filename. Git had already taken the lock before failing on argument
  parsing and stranded it. Caught by the next commit failing with the same error I
  was there to fix. **Rule that prevents the repeat:** pass the message with
  `-F <file>` *before* the `--`, never after.
- **I set a spend cap below the tool's own worst-case ceiling**, so the first Kimi
  call was refused with zero output and zero spend ($0.60 cap vs $0.91 ceiling;
  actual cost when it ran was $0.076). Caught by reading the tool's preflight line.
  **Rule:** cap against observed historical cost, not the ceiling — a ceiling is
  not a forecast.
- **I passed an absolute path to a consult script that joins paths to cwd**,
  producing a nonsense doubled path and a failed run. Caught by the error output.
  **Rule:** check how a script resolves paths before invoking it.
- **I retried a denied command verbatim once** before changing approach. Caught by
  the second identical denial. **Rule:** a denial is a signal — change the
  mechanism or stop and ask; never re-send the same string. *This one I had
  already been told, and did anyway — the highest-signal entry here.*
- **I nearly reported a truncated model response as a complete answer.** Kimi
  returned `finish_reason: error` having answered 1 of 6 questions; I noticed only
  because the file was 39 lines. **Rule:** check `finish_reason` and output length,
  not merely that output exists.
- **I did not detect the outage — Sean did.** Nine hours of every agent failing to
  commit, and my own first sign was a single failed commit that I initially framed
  as a local blocker rather than a fleet-wide one. **Rule:** when an operation
  fails on shared infrastructure, check whether it is failing for *everyone* before
  characterising it as your own problem.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Malformed git flags stranding the index lock | 1 (self-inflicted) | No | Message via `-F <file>` before `--`, never after |
| Spend cap set against worst-case ceiling, not observed cost | 1 (call refused, zero output) | No | Cap from historical actuals; ceiling ≠ forecast |
| Absolute path to a script that joins to cwd | 1 | No | Relative path from repo root |
| Retrying a denied command verbatim | 1 | Yes — standing instruction | Change mechanism, not repetition |
| Treating a truncated response as complete | 1 (caught) | No | Check `finish_reason` and output length, not just presence |

The honest repeat is the denied-command one: the instruction to adjust rather than
retry is standing, and I retried anyway before adjusting. The correction that
survives is procedural — **on a denial, change the mechanism or stop and ask; never
re-send the same string.**

## External-model calibration

$0.0796 total for three models. Two of three findings that changed my behaviour
came from the two *paid* models (Kimi's git internals, HY3's catch); the
subscription model produced the one recommendation I had to reject. Verified
before acting on any of it — every claim was checkable locally, and the two
checkable Gemini claims were the two that failed.

**Routing note: for questions about concurrency and data-loss risk, a cheap
multi-model panel is excellent value *provided* every recommendation is verified
locally before execution. The panel is for reasoning you have not thought of, not
for permission to skip verification.**
