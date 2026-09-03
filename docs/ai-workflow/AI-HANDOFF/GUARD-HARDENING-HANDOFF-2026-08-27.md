---
decision: "Swan Coach ownership is merged with main and green. Three pre-commit guards were hardened across TWO hostile rounds finding twelve real defects, two of them pre-existing holes on main. Round 9 is CLOSED - no findings remain open. CI now runs and both its failures are proven pre-existing on main. The merge to main is Sean's call and is fully specified."
status: open
supersedes: none
---

# HANDOFF — guard hardening, rounds 8 AND 9 closed, nothing open

**Branch:** `claude/coach-endpoint-truth-v2-20260824` @ `71397b452` — **PUSHED**, verified
(remote == local, unpushed 0). **NOT merged. NOT deployed.** Behind `origin/main`: 0. Ahead: 59.
**PR #95** open. Cost across everything: **$0.00**.

> **Rounds 8 and 9 are both closed. No finding is open.** Twelve defects found and fixed across
> the two rounds. The only thing left on this workstream is Sean's merge/deploy decision.

---

## 0. READ FIRST — traps that cost time today

1. **The work lives in a WORKTREE at `C:/tmp/swan-p1a`.** The main repo at
   `Desktop/quick-pt/SS-PT` is on a different branch. Point every path there.
2. **Consult scripts live on `main`, not on this branch.** Run them **from the main repo** with
   absolute `--document`/`--out` paths into the worktree.
3. **Read consult OUTPUT, never exit status.** Two consults today "completed exit 0" while
   printing `HTTP 429`. One more burned its entire 32k budget on reasoning and emitted an empty
   file — that is a truncated run, not a DRY result, and must never be recorded as one.
4. **Fire the two seats SEQUENTIALLY.** Concurrent calls tripped a rate limit.
5. **`git checkout --` restores from the INDEX.** It destroyed an uncommitted implementation
   mid-mutation-run today. Back up to scratchpad and restore with `cp`.
6. **`git update-ref MERGE_HEAD` is REFUSED** ("refusing to update pseudoref"). Test fixtures
   must perform a REAL merge — and assert they did, or they silently test the non-merge path.
7. **In a worktree, `.git/` is a FILE.** Use `git rev-parse --git-dir`. A literal `.git/MERGE_HEAD`
   check reports "not merging" and would fail OPEN.
8. **Source files are CRLF.** Multi-line text anchors miss. Prefer line-number splices or the
   Edit tool; verify after every scripted edit — a Python edit printed "appended" today having
   changed nothing.

---

## 1. What happened, in one paragraph

Swan Coach ownership (five live cross-tenant defects, seven rounds to DRY) was merged with
`origin/main`. Five pre-commit guards refused that merge. **Three shared one blind spot: they
could not tell a line the commit AUTHORED from a line that merely ARRIVED via the merge.** Fixing
them properly — rather than taking the `--no-verify` both seats initially recommended — exposed
that the *fixes themselves* had holes of the same class, plus two pre-existing holes live on
`main` today. Round 8 found and closed nine.

**The transferable lesson: a guard's baseline may be WIDENED, never SWAPPED.** The first fix
replaced `HEAD` with `origin/main` and re-opened the exact incident class the guard exists to
stop. Every subsequent finding came from attacking a fix, not from testing it.

---

## 2. Current state — what is proven

| check | result |
|---|---|
| Guard suites | **92 tests green** — constitution 48, frontend 28, token-registry 16 |
| Mutations (hand-run) | **22**, every anchor confirmed matched, file restored byte-identical each time |
| Backend baseline gate @ `71397b452` | **exit 0** — 9907 passed, 25 known-failing / 23 files |
| Ownership mutation harness @ `71397b452` | see the round-9 closeout comment on SWA-64 |
| Five pre-commit guards | all PASS on the level — **no `--no-verify` anywhere in this history** |
| CI | **fixed and verified working** (runs execute 59s/5m35s; previously every run died at 0s) |

**CI now runs, and both its failures are PROVEN pre-existing on `main`** — verified, not assumed:
`AI Eval Gate` fails on every `main` run including the newest, and `Documentation Link Check`
reports 3,738 dead links of which **my files contributed zero** (correlated FILE→dead-link, 105
files implicated, none mine). CodeRabbit shows "pass" but its reason is *"Review rate limited"* —
it never reviewed, so do not read that as a pass.

**One SURVIVED mutation, disclosed:** dropping the `maxBuffer` in `token-registry-check.mjs` is
killed by no test — generating a >64 MB diff is impractical. Acceptable **only** because the
catch is now fail-closed (proven by its own mutation), so an overflow BLOCKS rather than silently
passing. The `maxBuffer` raises the threshold; the catch removed the silent-pass class.

---

## 3. What round 8 fixed

**Mine (found before reading either seat):**
- **F1 CRITICAL** — X2 swapped the baseline instead of widening it; a rule the BRANCH added and
  main never had could be silently dropped. → union of both parents (X2b).
- **F2 CRITICAL, pre-existing on main** — baseline logic never runs on a file the guard does not
  SELECT. A merge keeping the branch's `CLAUDE.md` printed "no constitution file staged — SKIP"
  and went green while main's rules vanished. → merge-aware selection (X2c).
- **F3 HIGH** — same selection hole in frontend-guards, where the reverted fix is a **G5**
  violation (production-outage class). → merge-aware selection (X1b).

**GLM 5.3 (every finding verified against code before acting):**
- **B1a CRITICAL** — union fixed PRESENCE, left BODY one-sided. GLM's own proposed fix would have
  re-blocked every legitimate adoption; the **merge base** separates the two cases exactly (X2d).
- **A1 HIGH** — a conflict resolved to main's side is byte-identical to a true carry. Now read
  from MERGE_MSG's **commented** `# Conflicts:` block (GLM said `Conflicts:`; verified otherwise).
- **A5 HIGH, FAIL-OPEN** — no `maxBuffer`; a large diff threw, was swallowed as "no added lines",
  and the file was never judged. Now fails closed.
- **A6 MEDIUM** — rule 57 still listed the dry-loop gate as wired while rule 74 recorded it
  deleted. **A Rule 53 violation of mine**: I fixed one instance and never swept for siblings.
- **B3 MEDIUM** — pooled aggregate shrink diluted the 0.5% budget. Now per-parent (X2e).

**GLM 5.3 Flash (independent):**
- **Squash MEDIUM** — `git merge --squash` writes **no MERGE_HEAD**, only SQUASH_MSG. All three
  guards missed it. Verified against real git; all three now detect it.

**REJECTED with reasoning** — Flash proposed also exempting blobs matching `MERGE_HEAD`'s tree.
That destroys X1's whole safety argument ("already on the default branch, already deployed") and
would let anyone launder a violation by putting it on a branch and merging. **Exemption stays
anchored to `origin/main` only.** Do not let a future round re-accept this.

---

## 4. ROUND 9 — CLOSED. Nothing open.

All three findings round 8 left open are fixed, tested and mutation-covered.

| # | finding | severity | fix |
|---|---|---|---|
| X2f | A rule NUMBER stops being a unique key once the baseline has two parents, so a number-keyed hatch declared for HEAD's rule 50 could silently waive main's different rule 50 | HIGH | Ambiguous numbers REFUSED, not guessed at. The refusal is **narrow** — a control test asserts an unambiguous declaration still works, because a blanket ban is what teaches people to reach for `--no-verify` |
| X4 | Merge-mode engaged on any merge, including merging a branch INTO main, where the merged ref does not contain main and the anchor is wrong | MEDIUM | Merge-mode now requires that the merged ref CONTAINS current main. Squash's proxy is "HEAD does not already contain main". Fails closed |
| X5 | cherry-pick / revert / `am` stage unauthored content with no MERGE_HEAD, so blockers said "exists in HEAD and is GONE" about a foreign edit | LOW | Blocker names the sequencer. Direction was always fail-closed; the cost was a message that reads as wrong |

**Two of my own round-9 tests were vacuous and mutation testing caught both** — worth reading,
because both are the same class the ownership arc found five of:

- `X4-M1` (ignore ancestry entirely) **SURVIVED**: my fixture forked the feature branch FROM
  `origin/main`, so the merged ref trivially contained it and the gate never engaged. The test
  even carried a comment *noting* that — a precondition documenting the flaw instead of enforcing
  it. Rewritten so the fork predates main's advance; the precondition now asserts the merged ref
  does NOT contain `origin/main`.
- `X4-M3` (invert the ancestry direction) **SURVIVED**: every fixture had `MERGE_HEAD` equal to
  `origin/main` exactly, where both directions agree. Added a case where the merged ref strictly
  CONTAINS main, which separates them.

**Three things verified against real git rather than assumed**, each of which had already sent an
attempt in the wrong direction: a clean `cherry-pick --no-commit` writes **no** `CHERRY_PICK_HEAD`
(only the conflicted form does — stated as a known limit in the code); `--git-dir` returns a
**relative** path that resolves against the calling process, not the fixture; and a cherry-pick
only conflicts when both sides touch the **same region**.

### Still worth doing, not a defect

Three guards now implement merge-awareness independently. **Extract one shared helper** so a
fourth inherits it rather than rediscovering it. Flash recommended this and two rounds proved the
class recurs. This is a refactor of working, tested code — not an open finding.

---

## 5. THE MERGE DECISION — unchanged, and Sean's

`main` auto-deploys to Render, so **merging IS deploying**. Everything below still stands from the
earlier handoff and has not been invalidated:

1. **Nothing to flush.** The prior handoff's #1 pre-deploy item is a no-op, verified three ways:
   `pendingOps` is an unconditional in-memory `Map` (no Redis path exists), so the deploy IS the
   flush; an unknown id returns `Operation expired or not found` **before** HMAC verification, so
   the predicted signature failures cannot fire; and all three mechanisms GLM raised that could
   have resurrected it (shutdown drain, second HMAC path, durable consumer of the payload
   constructor) were checked and **disproven**.
2. **Confirm Render instance count** (~2 min, console). Does not gate the merge; decides whether
   the ≤120s residual is a deploy-time event or a per-request one.
3. **Rollback is `git revert -m 1 <merge-sha>`.** Both seats **refused** an env-gated bypass valve
   as a rollback mechanism — "a worse defect class than the one you're rolling back". Note
   `AI_COMMAND_WRITES_ENABLED=false` does NOT cover this: defect #1 was a read.
4. **Revert trigger:** not one anecdote — a denial *confirmed false*, i.e. a Coach-lane ownership
   denial whose trainer has a live assignment row for that client. Hand-check the first ten.
5. **Carry to production:** if `SIGNATURE TAMPERING DETECTED` fires in the first hour it is **not**
   deploy noise — it cannot be caused by this deploy and would be a real, different problem.

---

## 6. How to run round 9

Brief and both raw seat outputs are in `docs/ai-workflow/AI-HANDOFF/panel-2026-08-27/`. Reuse
`BRIEF-R8-GUARDS.md` as the shape — it works. Change the axis, do not re-run the same brief.

```
cd c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT
node scripts/consult-glm.mjs --model glm-5.3 \
  --document "C:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/panel-2026-08-27/BRIEF-R9.md" \
  --out "C:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/panel-2026-08-27/GLM-R9.md" \
  --remit "..." --max-tokens 32000
# then, SEQUENTIALLY, the same with --model glm-5.3-flash
```

**Seat calibration learned today, worth carrying:**
- The two seats are **the same lab**. Their agreement is one prior sampled twice, never
  corroboration — the Ox-Alpha failure in a new costume.
- **GLM 5.3** gives falsifiable, mechanism-named findings. Several were *disproven* on
  verification and were still worth every second, because each named a specific grep.
- **Flash** argues itself down when the axis changes, and found the squash case neither GLM nor I
  saw. But it burns its budget reasoning — give it a **narrow** scope and a large `--max-tokens`.
- **The best answer came from neither seat twice today** (the guard predicate union; the merge-base
  discriminator). Synthesis is a step, not a formality.
- **Every finding is a HYPOTHESIS until checked** (Rule 30). GLM was right about A1's substance and
  wrong about its detail; B1's diagnosis was right and its proposed fix would have caused a
  regression. Verify before acting, every time.

---

## 7. Where everything lives

| artifact | path |
|---|---|
| This handoff | `docs/ai-workflow/AI-HANDOFF/GUARD-HARDENING-HANDOFF-2026-08-27.md` |
| Merge handoff (still current for §5) | `docs/ai-workflow/AI-HANDOFF/COACH-OWNERSHIP-MERGE-HANDOFF-2026-08-27.md` |
| Round 8 brief + both seats + synthesis | `docs/ai-workflow/AI-HANDOFF/panel-2026-08-27/` |
| Rounds 1-7 (ownership work) | `docs/ai-workflow/AI-HANDOFF/panel-2026-08-26/` |
| Hermes memos | `.ai-workflow/hermes-inbox/pending/2026082*` |
| Linear | **SWA-64** |

**Session-start orientation:** read §0, §2 (what is proven and what is not), §4 (round 9's work)
and §5 (the merge). That is enough to act.
