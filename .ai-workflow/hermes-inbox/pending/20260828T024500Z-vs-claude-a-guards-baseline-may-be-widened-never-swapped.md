---
surface: vs-claude
utc: 20260828T024500Z
topic: A guard's baseline may be WIDENED, never SWAPPED — a fix that re-opened the exact incident class it closed, and eight more found by attacking fixes instead of testing them
tags: [guards, pre-commit, merge, hostile-review, fail-open, rule-53, panel-routing]
---

## What I did / learned

- **Hostile round 8 on three pre-commit SAFETY GUARDS I had changed the same day. Nine findings,
  all real, all fixed. Three CRITICAL. Two were pre-existing holes live on `main`.**
  `749fc614f`, pushed, 87 guard tests green, 16 hand-run mutations.

- **THE LESSON: a guard's baseline may be WIDENED, never SWAPPED.** My fix replaced the guard's
  `HEAD` baseline with `origin/main` to stop it mis-reading carried lines as authored ones. It
  worked — and it re-opened the exact incident class the guard exists to stop, because a rule
  the BRANCH added (which main never had) could then be silently dropped: main has no such rule,
  so its absence is not a removal. **The fix for a false positive created a false negative in the
  same check.** The correct shape was the union of both parents, never a substitution.

- **Every finding after the first came from ATTACKING a fix, not from testing it.** The fixes had
  tests. The tests passed. Nine defects still sat there. Concretely, attacking my own fix found
  that **baseline logic never runs on a file the guard does not SELECT** — a merge resolved by
  keeping the branch's `CLAUDE.md` printed *"no constitution file staged — SKIP"* and went green
  while every rule main added since the fork was discarded. That one predated all my work and is
  the `10a3e7fa1` class, reachable on `main` today.

- **A guard's failure mode is silence.** A fail-OPEN path found this round: a diff call with no
  `maxBuffer` inherited Node's 1 MiB default, a large diff threw, the `catch` swallowed it as
  "no added lines", and the file was **never judged** while the guard exited 0. Nothing logs.
  Nothing throws. Every subsequent commit looks green.

- **One value meaning two things, again.** A conflict resolved to main's side is *byte-identical*
  to a genuine carry, so an OID predicate cannot separate "I adopted main's bytes" from "I threw
  away my own fix". Git records the difference elsewhere (MERGE_MSG). Same shape as the five
  ownership defects: a single value carrying two meanings, permissive reading wins.

## Why it matters to Hermes

- When a guard blocks something provably safe, the finding is usually IN THE GUARD — **but the
  fix is the most dangerous code in the repo that day.** It is written under pressure to unblock,
  by someone who wants it to be simple, in a file whose failures are silent. It deserves a
  harder review than the feature that provoked it, not a lighter one.
- **Widen, never swap** generalises past guards: any check that changes what it compares against
  should ask what the old baseline was still catching.
- **Attack the fix, not just the diff.** Testing a fix confirms it does what you meant. Attacking
  it asks what it now fails to notice. Those are different questions and only the second found
  the CRITICALs here.

## State right now

- `749fc614f` pushed, PR #95 open, **not merged, not deployed**. Behind `origin/main` 0, ahead 55.
- 87 guard tests (43 + 28 + 16), 16 mutations, all anchors confirmed matched, files restored
  byte-identical. **One SURVIVED mutation disclosed rather than hidden**: dropping a `maxBuffer`
  is killed by no test (a >64 MB diff is impractical), acceptable only because the catch is now
  fail-closed so an overflow blocks instead of silently passing.
- Round 8 touched only hooks / constitution / one skill — zero runtime code — so the backend gate
  (9906 passed) and 46/46 ownership mutations from `e607d2dc6` still describe the shipped tree.
- **Round 9 is specified and NOT run**: numeric escape-hatches ambiguous under a two-parent
  baseline (HIGH), merge-mode should gate on ancestry (MEDIUM), cherry-pick attribution (LOW),
  and extract the merge-awareness helper the three guards now duplicate.
- Handoff: `docs/ai-workflow/AI-HANDOFF/GUARD-HARDENING-HANDOFF-2026-08-27.md`.

## Mistakes I made

- **I violated Rule 53 and a paid seat had to tell me.** I corrected rule 74's dead citation and
  never swept for siblings — so rule 57 went on listing the dry-loop gate as *wired* while rule
  74 recorded it as *deleted*. The constitution contradicted itself, in a change whose entire
  purpose was making the constitution true. Rule 53 exists **because these travel in clusters**,
  and I had read it. The sweep takes one `rg`; I skipped it because I "knew" where the problem was.
- **I wrote a fix that re-opened the incident class the guard exists to stop**, and only caught it
  because I ran my own hostile pass before reading the seats. Had I read theirs first I would have
  anchored on their questions and likely never constructed it.
- **My own test was vacuous and only mutation testing exposed it.** The "no merge in progress"
  case was built on an empty repo where `origin/main` never resolved, so it passed through the
  fail-closed branch and never exercised the precondition it named. Green, and proving nothing.
- **Two fixtures silently tested the wrong path.** `git update-ref MERGE_HEAD` is *refused* as a
  pseudoref and I never checked the status; a second fixture's merge was already-up-to-date so no
  merge occurred. Both looked green. Every merge fixture now **asserts its own precondition**.
- **I destroyed my own uncommitted implementation mid-verification** with `git checkout --`, which
  restores from the INDEX — then read the resulting failures as mutations being killed when they
  were the feature being absent. Two of three results were meaningless and I nearly reported them.
- **A scripted edit printed "appended" having changed nothing** (unconditional success print), and
  a `.git/MERGE_HEAD` check reported "not merging" because a worktree's gitdir lives elsewhere —
  which would have failed OPEN in the guard I was writing.
- **The pattern across five of those: something reported success and I nearly believed it.** The
  only reason none reached Sean as fact is that each was checked afterwards. That is now the
  habit: verify the instrument, then believe the reading — *especially* when the instrument is one
  I just wrote.

## External-model calibration

**GLM 5.3** (21975 out / 19319 reasoning / 421.9s) and **GLM 5.3 Flash** (13159 out / 12177 /
257.4s, after one failed run). Subscription-billed. Cost: **$0.00**.

- **Same lab.** Their agreement is one prior sampled twice, never corroboration.
- **GLM 5.3 was worth its cost even where wrong.** Its findings name a *mechanism and a grep*, so
  each is cheap to verify. A1's substance was right and its detail wrong (it said MERGE_MSG marks
  `Conflicts:`; it is a commented `# Conflicts:` block). B1's diagnosis was right and **its
  proposed fix would have caused a regression** — "block whenever staged equals one parent" would
  re-block every legitimate adoption. Verifying before implementing is what caught that.
- **Flash's first run emitted an EMPTY file after spending its entire 32k budget reasoning.** That
  is a truncated run, **not** a DRY result, and logging it as DRY would have manufactured a clean
  round out of a failure. Re-run with a narrow scope and a bigger budget, it produced the squash
  finding neither GLM nor I had.
- **The best answer came from neither seat, twice**: the guard predicate (union of both seats'
  incompatible anchors) and the merge-base discriminator. Synthesis is a step, not a formality.
- **I rejected one of Flash's fixes on safety grounds** and recorded why, so a future round does
  not quietly re-accept it: exempting blobs matching `MERGE_HEAD`'s tree would let anyone launder
  a violation by putting it on a branch and merging.
- **Operational:** fire the seats SEQUENTIALLY — concurrent calls tripped a 429 that reported
  "exit 0" while printing the error.

## Sean owes / blockers

- **The merge-to-`main` / deploy decision.** Merging deploys; rollback is `git revert -m 1`.
- **Render instance count** (~2 min, console) — does not gate the merge.
- Nothing on CI: it is fixed and verified executing.
