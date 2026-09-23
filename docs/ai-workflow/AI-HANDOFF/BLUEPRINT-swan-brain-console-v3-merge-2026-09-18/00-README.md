# Swan Brain Console V3 — Merge / Salvage Mega-Blueprint

**Status:** PACKAGE READY — **readiness BLOCKED** until slice S0 (salvage) lands.
**Date:** 2026-09-18 · **Author:** WorkBuddy (Sable) · **Protocol:** `fable-blueprint-forge`
**Decision authority:** `MEGA-BLUEPRINT.md` (this packet) — every builder choice is pre-made there.

**Supersedes for the *merge* question:** `SWAN-BRAIN-CONSOLE-BLUEPRINT-2026-08-26.md` is **REJECTED**
(GPT-5.6 Sol — its analysis ran against a branch 2,285 commits behind `origin/main`). Do not consume
it for architecture. Its *patterns* (tab/source/seat registries) are reused below with attribution,
because the pattern survived even though the document did not.

**Subject of record (all uncommitted, all in one gitignored directory):**
- Console — `scripts/swan-brain-console/` (12 files, 2,840 lines incl. `app/`)
- Fleet — `frontend/src/pages/HomePage/three-worlds/` (20 variants, 8 scene families)
- Living in `tmp/worktrees/brain-console-20260913/` — 77 files in the two scopes above

---

## Why this packet exists (and why it is not a rebuild)

Sean asked whether the Swan Brain should be merged into one app, and whether it should be an
**MCP server / dashboard / CLI** — and then asked for a hostile review with fixes, upgrades and
enhancements, or a decision to break it down and build it better.

The review's first act was to establish what actually exists. It found something that changes the
sequencing: **the entire workstream is untracked, and the git link that would have recovered it is
dead.** See `05-slices.md` §S0 and `01-architecture.md` §5. The work is not bad — it is *good and
unbacked*. Repairing the backup is slice zero; everything else is downstream of it.

The verdict on rebuild: **do not rebuild.** 66/66 contract tests pass on the current tree
(re-verified 2026-09-18, this session), the engine-honesty guard is genuinely well-built, and four
hostile-review rounds already closed 30+ findings with executed proof. A rebuild would discard
verified work and re-earn the same bugs. The correct move is **verify → salvage → merge the door,
not the monolith → then build the upgrade backlog.**

---

## The doc set (build order)

| # | File | What it decides |
|---|---|---|
| 0 | `MEGA-BLUEPRINT.md` | **The ruling.** MCP vs dashboard vs CLI; merge yes/no; locked decisions |
| 1 | `01-architecture.md` | As-is topology, the three-layer target, data flow, the untracked-work hazard |
| 2 | `02-wireframes.md` | Every console screen + state, ASCII, desktop + 375px, exact copy |
| 3 | `03-contracts.md` | Every endpoint, every exported signature, every invariant |
| 4 | `04-build-order.md` | File-by-file, ≤300-line budgets, what to mimic in-repo |
| 5 | `05-slices.md` | Slice plan with executable acceptance criteria + STOP lines |
| 6 | `06-bans.md` | The "do NOT" list, restated for a context-free builder |
| 7 | `07-checkpoints.md` | Checkpoint protocol + review remit text |

---

## Builder Contract (paste into the builder's first prompt, verbatim)

> You are the builder, not the architect. Follow this package to the letter. Where the package
> decides, you do not re-decide — even if you would do it differently. Where the package is silent
> on something that matters, STOP and return the question; do not improvise.
>
> Build ONE slice at a time. After each slice, output the diff plus the acceptance-criteria evidence
> (test output, curl results, screenshots) and **WAIT** for the checkpoint verdict before continuing.
> Never claim a criterion passed without pasting its output.
>
> **Three rules that are not negotiable in this workstream:**
> 1. **Never `git add -A`.** The main tree holds >1,000 dirty files from other agents (Rule 67).
>    Stage explicit paths only.
> 2. **The console never gains a write path.** It is GET-only by construction. Do not add a POST
>    handler, do not add a promote button, do not add a seat picker. Each refusal is deliberate and
>    documented in `06-bans.md`.
> 3. **Never commit or push without Sean's explicit approval.** `main` auto-deploys to
>    sswanstudios.com via Render.

---

## First slice

**S0 — Salvage.** Move the workstream out of the gitignored, git-link-dead directory into a live
branch and prove it arrived byte-identical. Acceptance criteria and the exact commands are in
`05-slices.md` §S0. **Do not begin S1 until S0 passes.**

## Checkpoint plan

Architect checkpoint per slice, free ladder first (GLM/ZCode seats, $0), Fable only if Sean
authorises spend. Rule 46 chain applies at commit: builder → Gemini → Codex hostile (advisory) →
**Fable = Final Decider / commit gate**.

## Secret scan

`bash scripts/scan-secrets.sh` must pass over this package before commit (Rule 44). Known trap in
this environment: the scanner's own `rm -f "$tmp"` dies when `rm` resolves to the safe-delete shim,
which the hook then misreports as "secret-pattern detected". Workaround:
`TMPDIR="$PWD/tmp/gitscan" bash scripts/scan-secrets.sh`.
