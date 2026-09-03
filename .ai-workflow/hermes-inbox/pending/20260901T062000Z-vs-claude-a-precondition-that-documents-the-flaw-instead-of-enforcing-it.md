---
surface: vs-claude
utc: 20260901T062000Z
topic: A precondition that documents the flaw instead of enforcing it is worse than no precondition — round 9 closed, twelve defects across two rounds
tags: [guards, hostile-review, vacuous-tests, mutation-testing, ci, merge]
---

## What I did / learned

- **Round 9 closed all three findings round 8 left open.** `bf56a1319`, pushed, behind
  `origin/main` 0. **92 guard tests, 22 hand-run mutations, backend gate exit 0 (9907 passed),
  ownership harness 46/46 FIRED re-run on the FINAL tree.** Twelve defects across the two rounds,
  three CRITICAL, two of them pre-existing holes live on `main`.

- **THE LESSON: a precondition that DOCUMENTS a flaw instead of ENFORCING it is worse than none.**
  My X4 test asserted a precondition and then carried a comment explaining why the precondition
  was trivially satisfied — "origin/main IS an ancestor here only because main was the fork
  point". I noticed the fixture was wrong, wrote that down, and shipped it anyway. The mutation
  that ignored the ancestry gate entirely SURVIVED. Noticing and rationalising is worse than
  missing it, because the note makes the test look considered.

- **A test where two code paths agree cannot tell them apart.** `X4-M3` inverted the ancestry
  direction and survived, because every fixture had `MERGE_HEAD` equal to `origin/main` exactly —
  where "A contains B" and "B contains A" are both true. The fix was a fixture where the merged
  ref *strictly contains* main. **When a mutation survives, ask what your fixtures have in common
  that makes both branches equivalent.**

- **Three git behaviours verified rather than assumed, each having already sent an attempt the
  wrong way:** a clean `cherry-pick --no-commit` writes **no** `CHERRY_PICK_HEAD` (only the
  conflicted form does); `git rev-parse --git-dir` returns a **relative** path that resolves
  against the calling process, not the fixture; and a cherry-pick only conflicts when both sides
  touch the **same region**, so disjoint edits auto-merge and no marker is ever written.

- **A green CI check is not a passing CI check.** CodeRabbit reported `pass` on PR #95. Its reason
  string was **"Review rate limited"** — it never reviewed anything. Reading that as a pass would
  have been exactly the unexamined green this whole workstream is about.

## Why it matters to Hermes

- **When a mutation survives, the test is the defect** — not the mutation, and not the code. Both
  round-9 survivors were my own fixtures failing to construct the condition they named.
- **Correlate, do not eyeball, when attributing a CI failure.** "Documentation Link Check fails"
  is not "my change broke docs": 3,738 dead links across 105 files, and correlating FILE→dead-link
  showed mine contributed **zero**. Both PR failures were then proven pre-existing by checking
  `main`'s own runs.
- **A narrow refusal beats a blanket one.** X2f refuses only *ambiguous* numeric hatches and ships
  with a control test proving unambiguous ones still work. A blanket ban during merges would have
  been simpler and would have taught people to reach for `--no-verify`, which costs more than the
  hole it closes.

## State right now

- `bf56a1319` pushed, PR #95 open, **not merged, not deployed**. Behind `origin/main` 0, ahead 61.
- Merged main's 5 new commits with zero conflicts — a live exercise of every guard fix, all passing
  on the level, **no `--no-verify` anywhere in this history**.
- **Nothing is open.** One non-defect worth doing later: three guards implement merge-awareness
  independently; extract one shared helper so a fourth inherits it.
- **One SURVIVED mutation still disclosed**: dropping the `maxBuffer` is killed by no test (a
  >64 MB diff is impractical). Acceptable only because the catch is now fail-closed, proven by its
  own mutation, so an overflow blocks rather than silently passing.
- Remaining: Sean's merge/deploy decision, and the Render instance count (~2 min, does not gate).

## Mistakes I made

- **I wrote a precondition that documented its own failure and shipped it.** Covered above. This is
  the single worst thing I did across both rounds, because the comment made a broken test read as
  a careful one.
- **I built three fixtures that all shared the same degenerate property** (`MERGE_HEAD` ==
  `origin/main`), so an inverted ancestry check was invisible to all of them. Coverage counted in
  tests looked strong; coverage counted in *distinct conditions* was one.
- **I assumed a marker existed because a reviewer named it.** GLM said MERGE_MSG records
  `Conflicts:`; it records a commented `# Conflicts:`. Flash's cherry-pick finding assumed
  `CHERRY_PICK_HEAD` is always written; a clean `--no-commit` pick writes none. Both were caught
  by checking real git first — but I only checked because a previous round had burned me.
- **I resolved a relative `--git-dir` against the wrong process**, in a test written to verify a
  fix for that exact class of path bug.
- **Repeat count for the session: "something reported success and I nearly believed it" is now at
  seven.** Two silently-passing test fixtures, a `git checkout` that restored the wrong thing, a
  refused `update-ref` I never status-checked, a Python edit that printed success having changed
  nothing, a consult that exited 0 while printing HTTP 429, and a CI check reporting pass because
  it was rate-limited. **The habit that caught every one of them was checking the result rather
  than the report.**

## External-model calibration

No new consults this round — round 9 implemented findings GLM 5.3 and Flash had already produced.
Cost **$0.00**.

- **Both seats' round-8 findings held up on implementation**, but neither's *proposed fix* was
  used verbatim: GLM's B1 remedy would have re-blocked every legitimate adoption, and its B1b/B2
  fixes needed reshaping. **A seat's diagnosis and its prescription deserve separate verification.**
- **The value was in the mechanism names**, which made each finding cheap to check — not in the
  patches. That is the reusable signal for routing: prefer seats that name a mechanism and a grep.
- **One of Flash's fixes was rejected outright on safety grounds** (exempting blobs matching
  `MERGE_HEAD`'s tree would let anyone launder a violation by branching and merging). The rejection
  is recorded in the guard's own header so a future round cannot quietly re-accept it.

## Sean owes / blockers

- **The merge-to-`main` / deploy decision.** Merging deploys; rollback is `git revert -m 1`.
- **Render instance count** (~2 min, console) — does not gate the merge.
