---
name: cross-env-verify
description: Fires whenever an agent is about to call something broken, missing, corrupt, or unreachable — before that claim is believed or acted on. One toolchain's failure is not proof of a fact about the world. Mandatory before any destructive remedy (delete, re-clone, re-init, reset, reinstall, overwrite, "recreate it fresh"). Triggers on "X is broken", "not a git repository", "not found", "does not exist", "corrupt", "unreachable", "empty", "missing", "we need to re-clone/re-init/reset/wipe/recreate".
---

# Cross-Environment Verification

## Why this exists

**2026-08-05.** A planner investigating a repo ran `git status` and got
`fatal: not a git repository`. It concluded the repo was broken, ranked it the **#1
blocker above everything else**, and prescribed *"re-clone or re-init as an independent
repo."*

The repo was completely healthy. It was on branch `codex/...-recovery-20260801` with full
history, tracked modifications, and intact worktree metadata. Git failed for exactly one
reason: the agent runs in **WSL**, and the repo's `.git` file holds a **Windows** path
(`C:/Users/...`) that WSL's git cannot resolve. Windows git reads it perfectly.

Executing that slice would have destroyed a branch, its history, and five files of
uncommitted work. A human asking for a review caught it. Nothing else would have.

The failure was not the git error. It was **collapsing two different sentences**:

> "I cannot reach X with this tool."
> "X is broken."

The first is an observation about your tooling. The second is a claim about the world.
Everything expensive lives in the gap between them.

## When this fires

Any time you are about to write, or act on, a sentence of the form:

- "X is broken / corrupt / missing / empty / not found / does not exist / unreachable"
- "the repo/database/service/file/config is in a bad state"
- "we need to re-clone / re-init / reset / wipe / reinstall / recreate this"
- "there is no Y here" (when Y's absence would be surprising)

It fires **hardest** when the proposed remedy is destructive. A wrong "it's broken" that
leads to a `--help` is cheap. A wrong "it's broken" that leads to `rm -rf` is not.

## The check

**1. Name the tool and the environment, not just the result.**
Not "git says it's not a repo" — *"git, run from WSL against a `/mnt/c` path, says it's not
a repo."* The moment you write the environment down, the hypothesis appears on its own.

**2. Re-check from a second vantage.** At least one, before the claim stands:

| Symptom | Second vantage that usually disagrees |
|---|---|
| git fails on a `/mnt/c` path from WSL | run git from Windows (Git Bash / PowerShell) |
| file "missing" from WSL | check the Windows path directly, and vice versa |
| command "not installed" | check the other shell, the venv, `which -a`, full path |
| service "down" | check the port/socket, not just the client |
| env var "unset" | check the *running process's* `/proc/<pid>/environ`, not your shell |
| dir "empty" | check permissions and whether you are in the path you think |
| API "returns nothing" | check status code and raw body before parsing |
| **script/tool/file "not wired", "not built", "doesn't exist here"** | **`node scripts/repo-wide-find.mjs <name>` — every branch, remote ref, worktree and stash** |
| a `<rev>:<path>` or `/leading-slash` git arg reports ABSENT | re-run with `MSYS_NO_PATHCONV=1` — Git Bash rewrites the argument before git sees it |

### The vantage this table was missing, and why it beat the skill

**2026-08-15.** An agent looked for `consult-glm.mjs`, did not find it, and concluded GLM was
**"not wired"** — then spent a review round designing around a tool that was available the whole
time on another branch.

This skill *should* have caught that: "not found" and "does not exist" are in its trigger list. It
did not, and the reason matters more than the incident. **Every row above was a TOOLCHAIN failure** —
the shape "I cannot reach X with this tool." Here the toolchain worked perfectly and answered
*correctly*: the file genuinely was not in that worktree. The mistake was upgrading a true statement
about **one ref** into a false statement about **the repository**. The agent's own sentence matched
nothing in the table, so recalling the skill would not have helped.

So the law generalizes. It was:

> "I cannot reach X with this tool" ≠ "X is broken"

It is also, and this is the half that was missing:

> **"X is not in this checkout" ≠ "X does not exist."**

A repo is not one tree. It is every branch, every remote-tracking ref, every linked worktree, and
the stash — and in a repo with worktrees (this one has several), *the checkout you are standing in
is the least representative sample available*. `git ls-files`, `rg`, and `ls` all answer honestly
about one tree and say nothing about the others.

**Before any claim that a repo asset is missing, run the one command:**

```bash
node scripts/repo-wide-find.mjs consult-glm.mjs
```

Exit 0 = it exists somewhere and your claim is false; exit 1 = the absence is now *evidenced*; exit
2 = the check could not run, which is not the same as absence. It sets `MSYS_NO_PATHCONV=1` itself,
because the correct check used to take five composed git commands — two of which Git Bash silently
mangles — and a check that costs five commands does not get run.

**Why a third skill was NOT the fix.** Two guards already covered this ground and both were beaten:
this skill (whose triggers matched but whose content did not), and the session-start drift check,
which literally warns *"tooling may appear missing when it exists on main"* and fires every single
session — which is exactly what makes it skimmable. A duty enforced only by the model remembering is
a duty that will eventually be dropped (CLAUDE.md rule 57). The fix is a cheap command plus a
deterministic gate at the moment of the claim (`scripts/hooks/absence-claim-gate.mjs`), not more
prose telling an agent to be careful.

**3. Look for the artifact that would exist if it were really broken.** A truly broken git
repo has no intact `refs/`, `logs/`, or `HEAD`. Absence of damage is evidence of health.
Go find the damage before you claim it.

**4. State the residue.** If a second vantage was impossible, say so explicitly:
`[UNVERIFIED — could not check from Windows]`. Never upgrade an unverified failure into a
fact, and never let one justify a destructive remedy.

## The rule

> **No destructive remedy on the strength of one tool's failure.**

Delete, re-clone, re-init, reset, wipe, reinstall, overwrite, "recreate fresh" — each
requires positive evidence of damage from a second vantage, not merely an error from the
first. If you cannot obtain that evidence, the finding is *"unreachable from here"* and
the remedy is **escalate to Sean**, not repair.

## Reviewer duty

When reviewing another agent's work, treat every "X is broken" as **unproven until you
re-check it yourself from a different environment**. This is the single highest-yield
check in a hostile review of anything Hermes produced, because Hermes lives in WSL and the
repos live on Windows — the mismatch is structural, so this error will keep recurring.

## Related

- `.ai-workflow/hermes-inbox/standing-context.md` — the same law in Hermes' always-loaded context
- `scripts/hermes/checkpoint.py` — the net for when this check is skipped anyway
- `scripts/hermes/review.py` — its generated prompt tells reviewers to apply this first
