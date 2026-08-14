---
title: A handoff's commands are claims — run them
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 and Kimi K3 are Fable-tier
reviewed_by: self, executed every command in the document; CodeRabbit + GitGuardian pass on PR #43
date: 2026-08-14
decision: Execute every command in a document you hand to someone else — proofreading finds prose errors and misses broken commands, which are the only errors a cold reader cannot recover from
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: author + verifier
    did: wrote the S0 handoff, then executed its own recipe and found three broken command classes
    cost: subscription
skills_touched:
  - name: handoff (documents written for a cold agent)
    change: amended
    why: a handoff must be dry-run, not proofread — its reader has no context to notice a wrong command
  - name: stale-check
    change: exercised in the useful direction
    why: verifying ANOTHER agent's claim (migrations run on every deploy) corrected a claim of my own
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

## The lesson

I wrote a 350-line handoff so a cold agent could continue this work without me. I proofread it. The
prose was accurate.

**Every command class in it was broken.**

1. **The review range pulled in other people's code.** I wrote `git diff <old-base>..<merge>` to mean
   "this slice". Main had absorbed 39 commits from parallel agents in that window, so the range
   spanned 55 commits and would have handed a hostile reviewer someone else's work labelled as
   mine — producing findings against code the next agent never wrote. The correct scope for "what
   this PR introduced" is the merge's first-parent diff, `<merge>^1..<merge>`.

2. **The scratch paths pointed at two different directories.** Bash's `/tmp` on this machine is
   `AppData/Local/Temp`; node resolves `/tmp/…` to `C:\tmp\…`. Both exist. So the recipe wrote a
   packet with bash and then passed that path to a script that reads it through node — which would
   have failed with `ENOENT` on a file the agent could plainly see existed. Nothing about the recipe
   *looks* wrong.

3. **A claim I had already made out loud was incomplete.** I had told Sean the merge deployed "an
   identical app" because no application files changed. True about the code; silent about the fact
   that the deploy runs `migrate:production` on **every** push, so it also executed migrations
   against the production database.

None of these were found by reading. All three were found by **running the document**.

**Why a handoff is the worst place for an unverified command:** its entire purpose is to serve a
reader who lacks the context to notice the command is wrong. In a normal working session a broken
command is an inconvenience — you see the error, you fix it. Handed to a cold agent, a broken
command is authoritative. They will assume the environment drifted, or that they misunderstood, and
spend their first hour debugging a recipe that never worked.

**The procedure:** before shipping any document containing commands, execute each one and record
what it produced — file counts, sizes, exit codes, estimated cost. Paste those numbers into the
document. A recipe with observed output attached is a tested recipe; a recipe without it is a guess
that looks like an instruction.

## The second lesson: verifying someone else's claim corrected my own

The migration finding came from **another agent's handoff**, not from me. It asserted that a push to
main runs migrations. I could have repeated it, or ignored it. Instead I opened `render.yaml` and
confirmed it at line 66 — and that confirmation retroactively corrected something *I* had told Sean
two turns earlier.

Checking a peer's claim is usually framed as scepticism about them. It is at least as often how you
find out you were wrong.

## Who did what

- **Opus 5** wrote the handoff, executed its recipe, found and recorded all three command errors in
  the document itself rather than quietly fixing them, and surfaced a P1 CI outage unrelated to the
  work.
- **No external model was consulted for this document.** Verifying commands is deterministic; paying
  a reviewer to read a recipe I could simply run would be the misrouting this corpus warns about.
- **A parallel agent's handoff supplied the migration fact** that corrected my own earlier claim.
  Parallel agents are a source of corrections, not only of merge conflicts.

## Skills created or changed

- **Handoff authoring, amended: dry-run, do not proofread.** Every command executed, every output
  number recorded in the file. The failure it prevents is a cold agent's first hour spent debugging
  an instruction that never worked.
- **Review-packet scoping made precise.** "Diff since X" is ambiguous the moment other agents merge
  in parallel. Scope to what a specific PR introduced.
- **Cross-toolchain path round-tripping.** Any recipe that writes with one tool and reads with
  another must have its path proven in both directions, not assumed.

## Mistakes I made

- **Three broken command classes in a document whose only job was to make someone self-sufficient.**
- **I let an incomplete claim stand for several turns** — "deploys an identical app" was true about
  the code and silent about the migration run, and I only caught it via a peer's assertion.
- **My cleanup echoed a success it had not achieved.** `git worktree remove` printed
  `Permission denied`; the unconditional `echo "removed"` on the next line reported success anyway.
  Caught only because I checked the filesystem afterwards. That is the same false-success shape I
  spent the day documenting in other people's code, occurring in my own shell plumbing.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What finally stopped it |
|---|---|---|---|
| Unverified command shipped to a reader | 3 (one document) | No — this packet is the first | Executing every command and pasting its observed output into the doc |
| False success from an unconditional `echo` | 1 | Adjacent to the "instrument lies" class, already written up | Checking the real state after any cleanup, never trusting the echo |
| Claim true-but-incomplete | 1 | No | Stating the *consequence* (deploy runs migrations), not just the diff |

**Contrast worth carrying:** the classes that recurred five and six times today were all documented
beforehand. These three were caught on their first occurrence — because a verification step ran
before the artifact shipped, not because I remembered a rule. Fifth packet today reaching the same
conclusion: **procedures prevent, prose does not.**

## External-model calibration

- None consulted. Command verification is deterministic and free; routing it to a paid reviewer adds
  cost and latency without adding information.
- **The mandated Kimi + HY3 hostile review of the S0 slice has NOT yet been run** — it is specified
  in the handoff (Part 4) with a dry-run-verified recipe (~38.6k prompt tokens, ≈$0.02 for Kimi) and
  is the next agent's first task once the CI outage is reported.
