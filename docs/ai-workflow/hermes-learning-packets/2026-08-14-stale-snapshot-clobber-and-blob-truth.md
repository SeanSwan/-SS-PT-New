---
originating_model: claude-opus-5
tier_gate: PASS
date: 2026-08-14
topic: A feature commit that silently deleted twelve governing rules — and why every instrument I used to check it lied
surfaces: [claude-md, agents-md, sync-agents-mirror, drift-check-hook, git-verification-discipline]
models_used:
  - model: claude-opus-5
    role: diagnosis, verification, this packet
    did: traced the rule loss to a single commit; proved it with blob-level git evidence; caught two of its own false negatives; declined to commit pending a coordination call
    cost: subscription (no marginal API spend)
skills_touched:
  - id: rule-80 (Second-Vantage Verification)
    change: proposed-strengthen
    motivating_failure: Rule 80 already says one tool's failure is not proof. It did not stop me, because it names a principle rather than a command. The strengthening is procedural — for committed content, resolve to a blob SHA and use `git cat-file`.
  - id: stale-check (skill)
    change: proposed-extend
    motivating_failure: STALE-CHECK covers re-verifying carried-forward blockers. It does not cover re-checking whether the work itself already exists. I rebuilt ~90 minutes of my own session's completed analysis.
  - id: drift-check (skill)
    change: proposed-amend
    motivating_failure: The hook detected the divergence correctly and then prescribed the command that would have made it permanent.
---

## What was decided/built (Fable-tier lesson)

Two governance files, `CLAUDE.md` and `AGENTS.md`, had become different rulebooks — nine binding rules existed in only one of them. The obvious story is drift: two hand-maintained files diverging over months. **That story is wrong, and the wrong story produces the wrong fix.**

It was one commit. `10a3e7fa1`, titled `feat(skills): design-dialogue — and a cost figure in rule 16`, deleted twelve rule blocks from `CLAUDE.md`: rules 46, 73, 74, 75, 76, 77, 78, 79, 80, 81 removed outright; 16 and 40 modified. Its two advertised edits are both present and both correct. Everything else that had landed since the author's in-context copy of the file was reverted without mention. `AGENTS.md` was untouched, so it kept the rules by accident.

> **The law:** when an agent **regenerates** a large file instead of **editing** it, the operation is destructive regardless of the commit's title, and the diff must be read for **deletions of structure**, never for net line count. A rewrite from a stale snapshot preserves the author's intended changes and silently discards everyone else's. It presents as an ordinary feature commit and passes every gate the repo has.

Why this is expensive rather than merely annoying: the rules deleted were the *review* rules — Second-Vantage Verification, Tests-Can-Encode-The-Bug, Test-Delta Disclosure, Dead-File Quarantine, the Kimi hostile-review gate. **The clobber removed the machinery that catches clobbers.** A repo can lose its immune system in a commit whose message is about a cost figure.

The second half is worse. `scripts/sync-agents-mirror.mjs` exists to prevent exactly this divergence. It copies `CLAUDE.md` over the `AGENTS.md` body, because its designed invariant is *CLAUDE.md is canonical*. The clobber inverted that invariant — `AGENTS.md` became the only copy of nine rules. A `SessionStart` hook detects the divergence and recommends running the sync. **The repair tool, invoked on the repair hook's advice, destroys the surviving evidence.**

> **The second law:** every normalize/sync/regenerate tool encodes an invariant about which side is true. When the invariant breaks, the tool stops being a repair and becomes the weapon. Before running one, verify the direction of truth as a *fact*, not as a constant. An automated recommendation is more dangerous than none, because it launders the action as system-endorsed.

## Why (the rationale Hermes should carry forward)

- **Governance files need deletion-aware review, not diff review.** For any file that grants or constrains authority, the review artifact is a before/after **inventory of headings**, diffed as sets. `191 insertions(+), 51 deletions(-)` on a 1,000-line constitution is unreadable as a safety signal; "rules 73–81 absent from the after-set" is unmissable.
- **Numbering is load-bearing and collides silently.** The clobber renumbered Proof-Before-Done from 74 to 73, so "Rule 74" now means different things in the two files, and stored memory referencing "Rule 74" points at the wrong rule in one of them. Cross-file rule identity must be a stable slug, not an ordinal.
- **The surviving copy is survivorship, not authority.** `AGENTS.md` kept the nine rules because nobody touched it — and it simultaneously carries a *stale* rule 16. Neither file was a superset. Any "restore from the good one" framing would have re-broken the other direction. **The correct end state of a divergence repair is almost always a union, and the union must be verified in both directions before it lands.**
- **A green repo is not evidence.** Nothing failed. No test covered it, no hook blocked it, the secret scan passed, the commit was well-formed and honestly titled about its intended change.

## Reusable pattern / rule Hermes should apply next time

**When any agent rewrites a governance, config, schema, or policy file wholesale:**

1. Extract the **structural inventory** (rule headings / keys / section titles) from the before and after blobs. Diff those two sets. Anything in `before − after` is a deletion that must be named in the commit body or reverted.
2. Never accept net-line-count as evidence of scope for such a file.
3. If the file has a mirror/sync partner, run the partner's `--check` **before** the edit, so you know which side was true going in.

**Before running any sync / normalize / regenerate / mirror command:**

4. State the invariant it assumes out loud ("this assumes X is canonical").
5. Verify that invariant against current content — is X still the superset?
6. If not, the command is destructive; build the union first, then run it.

**For any claim about what a commit or branch contains:**

7. Resolve to a **blob SHA** (`git rev-parse <rev>:<path>`) and read it with **`git cat-file -p <sha>`**. Do not use `git show <rev>:<path>` (path-conversion hazard on MSYS) and never read the working file — it may be dirty. Check `git status` before treating any on-disk file as representing a commit.

## Who did what

- **claude-opus-5 (me)** — did the whole diagnosis and every verification. Correctly identified the divergence and its root commit; correctly identified the mirror script as destructive-in-current-state; correctly built and verified the union in both directions. Also produced **both** false negatives described below, briefly told Sean its own correct finding might be wrong, and rebuilt ~90 minutes of analysis this same session had already completed. No other model was involved — no Codex, no Gemini, no Kimi, no HY3, no Village. **There was no second vantage on this work, which is precisely the condition Rule 80 exists to flag.**
- **Sean** — caught the duplication from outside the session ("another agent is doing the same exact thing") when no internal check had. That is the measured value of an outside vantage: it found in one sentence what the author's own process had not surfaced at all.

## Skills created or changed

None created or amended this turn — the turn ended at a coordination hold before any commit. Three proposals recorded in frontmatter, each tied to the specific failure that motivated it:

- **Rule 80 (Second-Vantage)** — strengthen from principle to procedure. It already forbids trusting one tool's failure, and I violated it twice while holding it in context. A rule phrased as a virtue does not fire; a rule phrased as a command (`git cat-file -p <blob-sha>`) does.
- **`stale-check`** — extend from "re-verify carried-forward blockers" to "inventory prior artifacts (scratchpad, worktrees, branches) before starting analysis."
- **`drift-check`** — amend so a detected mirror divergence emits *which side is the superset* alongside the remedy, and withholds the sync recommendation when the target would lose content.

## Mistakes I made

- **Read a dirty working-tree file as ground truth for what is committed on `main`,** and on that basis told Sean mid-turn that my own (correct) diagnosis might be wrong. `git status` had said ` M CLAUDE.md` and I did not look. This is the single worst error of the turn: it briefly converted a true finding into a retraction in front of the person relying on it.
- **Accepted a false negative from `diff` across a toolchain boundary.** Python's `/tmp` resolves to `C:/tmp`; Git Bash's `/tmp` is the MSYS temp dir. `diff` reported "0 hunks" on files Python had proven differed by 7,426 characters. I believed it for two tool calls.
- **Rebuilt work this session had already finished,** because I never listed my own scratchpad. Sean caught it, not me.
- **Created a worktree without checking whether one already existed** for the same task — same root cause as the above.
- **Quoted a rule-count (74 vs 66) from a regex that also matched sub-list items.** Direction right, numbers wrong; corrected to 81 vs 73 only after enumerating headings.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Already written up before it recurred? | What finally stopped it |
|---|---|---|---|
| Believed a negative produced by an unvalidated instrument | **2** — (a) `diff` on cross-toolchain paths, (b) `git show` / working-file vs the actual blob | **YES, in two places** — the inbox pattern report §2a, and standing memory `feedback_validate_probe_before_absence_claim.md` | A command with **no ambiguity surface**: `git cat-file -p <explicit-blob-sha>`. It cannot path-convert and cannot read a working file. |
| Rebuilt already-completed work | 1 | Partially — STALE-CHECK covers blockers, not existing artifacts | An outside observer (Sean). No internal check caught it. |
| Reported a count from an over-broad regex | 1 | No | Enumerating the actual matched lines instead of counting them. |

**The repeat count is the finding.** The false-negative class was documented in two separate places *and I reproduced it twice inside one turn while both documents were in context.* That is decisive evidence about what kind of correction works: **the write-ups failed because they were resolutional** — "validate your instrument," "be skeptical of negatives." Advice that requires remembering to apply it at the moment of temptation does not survive contact. **The correction that survives is a named command substituted for a named command.** Not "be careful with `git show`" but "`git show <rev>:<path>` is banned for verification; use `git cat-file -p <blob-sha>`."

This generalizes: when a lesson recurs after being written up, do not rewrite the lesson. **Convert it into a mechanical substitution, a hook, or a gate** — or accept that it will recur again.

## External-model calibration

**No external or paid model was consulted this turn.** No Kimi K3, no HY3, no GPT, no Gemini, no Village. Nothing to calibrate, and that absence is itself the finding: the only defect-detection on this work was self-review, which is the documented weakest configuration (pattern report §5a — six clean self-review rounds found zero of five defects that one outside pass found). The duplication was caught by Sean, from outside. **Recorded so the corpus does not mistake this turn's confidence for verified-by-panel.**
