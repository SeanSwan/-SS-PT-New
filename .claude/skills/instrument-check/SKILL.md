---
name: instrument-check
description: Validate the instrument before believing what it says — the positive-control procedure for any absence claim, any "green" result, and any test you wrote yourself. Loadable by seats with no hooks (Codex, Hermes, Qwen). Triggers - "it's missing", "no results", "nothing found", "does not exist", "all green", "tests pass", "verified", or any claim built on a single search/probe/suite.
---

# instrument-check

**The corpus (2026-07 → 2026-08, 1,291 documents):** the failure family that recurs most
after being written up — **88%** — is stating a fact about one file, branch, grep or probe as if
it were true of the whole repo. Its twin, believing an exit code / green suite / tool "done"
without proving the tool could detect the thing, recurs **68%**. Prose rules did not hold.
This is the procedure, in three steps, none optional.

## 1. Positive control — before any absence claim

You are about to say *X does not exist / is missing / no results / never runs / zero*.

- Run the **same instrument** (same command, same flags, same scope) against something you
  **know exists**. If it does not find the known item, the instrument is broken and your
  absence is void.
- Name both in the claim: `ABSENT: <x> — control: <cmd> found <known-item>`.
- Cannot run a control (novel bug, no known-present analogue)? Then the claim is
  **UNPROVEN**, and you say `UNPROVEN`, not "confirmed absent."

Known instrument traps in this repo (each one a real incident):
- Git Bash `<rev>:<path>` reports files ABSENT that exist → `MSYS_NO_PATHCONV=1`.
- `$?` after a pipe reads the last command, not the one you care about → `${PIPESTATUS[0]}`.
- A relative `cd` after the cwd reset → `No such file` looks like absence.
- `grep` over one subtree, one branch, or one copy of a surface that exists twice →
  `node scripts/sweep.mjs <needle>` searches every surface and origin/main in one command.
- Truncated / paged / persisted tool output → you have not seen it; say "partial."

## 2. Scope check — before any "everywhere / nowhere / the repo" claim

A broad claim needs a broad instrument. Before "the repo does X" or "nothing uses Y":
`node scripts/sweep.mjs <needle>` — it prints hit counts per surface (frontend, backend,
scripts, docs, workflows) **and** on origin/main, and it lists remote branches carrying the
path. If you did not run something at least that wide, scope the claim to what you searched:
"in `backend/`, on this branch."

## 3. Validate the test, not the suite — before "tests pass" means anything

A test you just wrote shares your blind spot. It proves something only once you have seen it
**fail** against the defect it claims to catch.

- Revert the fix (or inject the bug) → run → it must go RED. Then restore → GREEN.
- If it cannot go red, it is decorative. Say so; do not count it.
- After adopting a review finding, re-run the **original failing observation**, not your new
  test. A fix is where the next bug lives.

## Output shape

Every claim this skill governs carries its evidence inline, e.g.
`[VERIFIED] no caller of recordSpend in scripts/ — control: same grep finds checkSpend ×3; sweep: 0 hits on origin/main`.
No evidence → `[UNPROVEN]`. Never `[VERIFIED]` on a single unvalidated instrument.
