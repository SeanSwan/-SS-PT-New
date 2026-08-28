# GLM Consult

**Model:** glm-5.3
**Document:** C:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/panel-2026-08-27/BRIEF-R8-GUARDS.md
**Tokens:** 9554 in / 21975 out (reasoning: 19319) | total 31529
**Wall:** 421.9s

---

## B1 — X2b union baseline

**constitution-guard.mjs:~540-560 (hatch block, diff-anchored) · CRITICAL · merge silently discards the branch's *body* edits — the 10a3e7fa1 class, residual to F1.**
F1's fix unions *presence* but the body rule is still one-sided: "judged against origin/main's copy where main has the rule." Scenario: branch legitimately tightens rule 12's body (committed on branch, never on main); `git merge origin/main`; CLAUDE.md conflicts (main also touched it); resolver takes main's side wholesale. Staged body == main's copy → body check sees zero shrink, reversion heuristic sees identical text → passes. The branch's newer law was silently dropped by the merge — precisely the "older text restored over newer law" signature the HEAD baseline caught, and the exact content-reversion that created this guard. F1's own lesson ("widen, never swap") was applied to presence and skipped for body.
**Fix:** for any rule where `HEAD:copy ≠ origin/main:copy` (both-modified or branch-ahead), the staged body must be judged against **both** parents: if staged exactly equals one parent's copy while the other parent's copy differed, block unless declared (both-modified conflicts resolved to one side are exactly the resolutions that must be loud).

**constitution-guard.mjs:~540 (`allowed.has(String(was.num))`) · HIGH · number-keyed hatches are incoherent under a two-parent baseline.**
Scenario: branch declares `SWAN_ALLOW_RULE_REMOVAL=50` for HEAD's rule 50 "Legacy lint." Main has since renumbered — its rule 50 is "MANDATORY security check." The merge (stale-copy resolution keeping the branch's file shape) drops rule 50 entirely. Union contains *main's* rule 50; `allowed.has("50")` waives it — and the trim-floor only runs when `now && now.num === was.num`, so a full drop skips the floor and is waived wholesale. A declaration for one rule authorized deletion of a different rule.
**Fix:** during a merge, hatches must key on rule identity, not bare number — e.g. `50:<8-char hash of the HEAD copy's body>`, or require the hatch to name which parent's rule it means.

## B2 — second axis choice

**frontend-guards.mjs / constitution-guard.mjs / token-registry-check.mjs (all three merge-mode gates) · MEDIUM · merge-mode engages when merging *into* main, where `origin/main` is the wrong anchor, and never validates the tracking ref.**
Scenario A: on local main with unpushed commits (HEAD ahead of `origin/main`), merge a feature branch. MERGE_HEAD exists → X3 diffs added lines against stale `origin/main`, counting main's own unpushed lines as "added" (false blocks); X2c's "differs from origin/main" selection anchors to a ref the merge never touched. Scenario B: origin/main moves mid-merge (fetch while resolving): the law-anchor is no longer the main being adopted.
**Fix:** gate merge-mode on ancestry, not ref existence: `git merge-base --is-ancestor origin/main MERGE_HEAD` ⇒ this merge *adopts* main ⇒ merge-mode, and anchor to **MERGE_HEAD** (the main actually being adopted — immune to the ref moving). `--is-ancestor origin/main HEAD` ⇒ merging a branch into law ⇒ keep HEAD mode (the pre-X behavior was correct there). This also retires the "which ref is current law" guess entirely.

## B3 — union dilutes the aggregate

**constitution-guard.mjs:~565-590 · MEDIUM · union `before` inflates `aggBefore` with adopted zero-loss mass.**
Scenario: long-diverged branch merges main, adopting 20 rules main added since fork. Aggregate is computed over union∩after; the 20 adopted rules contribute `was.len ≈ now.len` — pure denominator. The 0.5% death-by-a-thousand-trims budget is now 0.5% × (union size) instead of × (rules actually at risk); with intersection 60 / union 92 the effective tolerance on the trimmed set becomes ~0.77%. Compounds with the declared-rule `continue` in the same loop, which removes declared rules from the denominator.
**Fix:** never pool denominators — compute aggregate shrink per parent (main's surviving rules vs main's copy; branch-only rules vs HEAD's copy) and block if *either* parent's aggregate exceeds tolerance.

## A1 — X1 verbatim-carry

**frontend-guards.mjs:~80 (`verbatimCarryFrom`) · HIGH · the predicate identifies "bytes that exist on main," not "bytes this merge carried" — conflict resolutions to main's side are exempt.**
Scenario: main carries a G5 violation at `src/Foo.tsx` (pre-existing debt). This branch **fixed** it. Merge origin/main; the file is both-modified → conflict; resolver takes main's side. Staged blob == `origin/main` blob → verbatim-carry exempt, never checked. The branch's fix to the production-outage class (styled-components #12 at mount) is silently reverted and the merge goes green. Blob state is byte-identical to a true carry, so blobs alone cannot distinguish — but git recorded the difference: `.git/MERGE_MSG` carries a `Conflicts:` list.
**Fix:** during a merge, parse MERGE_MSG's `Conflicts:` section; any path listed there is never verbatim-exempt regardless of OID match. The stale-`origin/main` variant of this (a revert authored on the merged branch to exactly main's old bytes) is the same predicate hole but is caught at its authoring commit unless `--no-verify` — which remains the outer bound on all three guards.

A1 otherwise: the OID anchor holds. Editing re-enters the checked set; moved paths lose their main counterpart and re-enter; symlink/gitlink blobs differ or aren't content-checked anyway; the `ls-files -s` regex fails closed on SHA-256 repos.

## A2 — stale MERGE_HEAD

**No finding on the test itself.** `rev-parse -q --verify MERGE_HEAD` is sound as a liveness test, for a reason stronger than usual: while MERGE_HEAD exists, *any* `git commit` necessarily creates a merge commit with MERGE_HEAD as second parent — there is no "non-merge commit while a stale MERGE_HEAD sits" to exploit. The conflicted-merge window does expose the two places merge-mode is *weaker*, not stronger (B1 body finding, A1 exemption finding) — those are the actual holes, reachable in that window; the liveness test is not the bug.

## A3

Covered by the B1 body finding (the presence case was F1, killed; the body case survives — confirmed, not killed).

## A4 — X3 diff mechanics

**Nothing.** `git diff --cached <commit> -- f` is index-vs-commit as assumed; argument order correct; the `+c` start line is index-relative under `--cached` regardless of which base, so the added-line map stays correct. A rename at the new path yields whole-file-added (stricter); the old path yields no added lines (inherent to `--added-only`, unchanged); mode changes emit no hunks. The real failure surface in that block is A5's.

## A5 — fail-closed claims

**token-registry-check.mjs:~280 (`catch { diff = '' }`) · HIGH · fail-OPEN, and the merge change enlarges the trigger.**
`execFileSync` here has **no `maxBuffer`** (its siblings set 16–64MB; this one defaults to 1 MiB). A single target file whose `--cached origin/main` diff exceeds 1 MiB — plausible for a generated design-token registry, and *more* likely now that the base is origin/main, since carried/renamed files produce full-file hunks against it — throws `ERR_CHILD_PROCESS_STDOUT_MAXBUFFER`, is caught, and is silently treated as "no staged diff": the file contributes **zero added lines and is never judged**. Same catch also converts any nonzero-exit git failure into a pass. This is the exact "bug in a guard silently stops protecting" mode.
**Fix:** set `maxBuffer: 16 * 1024 * 1024` minimum; in the catch, distinguish exit-code — exit 0 with empty stdout ⇒ contributes nothing; anything else ⇒ block with an actionable error (fail closed), never `''`.

X1's `gitOut` catch → null → file stays checked: verified fail-closed. X2's `git()` doesn't catch but checks `.ok` and `die()`s on unreadable baseline/staged: fail-closed.

## A6 — rule-74 edit

**CLAUDE.md rule 74 (first hunk's *unchanged* sentence) · MEDIUM · the edit leaves the contradiction it was written to remove, and the correction is worded to evade the staleness detector.**
Two concrete problems in the merged text: (1) The dual-tier paragraph one sentence above the correction still reads "wired in `.claude/settings.json` beside the Hermes, **dry-loop** and Linear gates" — the document asserts the dry-loop gate is wired *and* that it was deleted, in the same rule. (2) The correction cites `scripts/hooks/dry-loop-gate.mjs — named here as history, not as a pointer to read` — that parenthetical exists precisely so the file-existence check (which you note runs only when a constitution file is staged) won't flag it. That re-creates the original sin: a citation engineered to outlive its referent undetectably, in the very edit fixing a citation that outlived its referent. Additionally, "There is no dry-loop `Stop` hook today" is a frozen present-tense negative that rots on re-addition, and "37–47% of turns," "PR #70," and the four-gate list are unverifiable from any artifact the repo checks.
**Fix:** amend the stale sentence to the actual gate list; move the deletion history out of the rule body into a dated line the existence checker is taught to honor (`deleted in <sha>` annotations), and make the registered-gates list something the checker *derives* from `.claude/settings.json` rather than frozen prose. On the force question: recording the weakness is right; recording it *without a re-arm trigger* is what invites drift — the honest close is "weaker **until** the scheduled probe / replacement lands," with the probe actually existing, not a comment.

## A7 / B4 — what wasn't asked

**All three guards · LOW · "authored vs arrived" was keyed solely to MERGE_HEAD; cherry-pick, `revert --no-commit`, and `checkout <rev> -- path` also stage arrived content.**
`git cherry-pick <main-sha>` onto a branch re-introduces the original X-class over-blocking (judges carried lines vs HEAD) with no merge-mode relief — fail-closed direction, but the zero-conflict-sync that triggered X1/X2/X3 relapses via cherry-pick. Conversely nothing under-detects here. **Fix:** treat `CHERRY_PICK_HEAD`/`REVERT_HEAD` as merge-mode with the picked commit as the carry anchor. (B4: beyond the two orchestrator sites you already named, this is the only other shared `diff --cached` assumption visible from here; the deeper shared assumption — *local `origin/main` == current law, unvalidated* — is the B2 finding, and the "scheduled job against origin/main" backstop in X2's comments is still a comment, not a job; with `--no-verify` and no CI gating ever, that detective layer is the only thing that makes any of this durable.)

**Attacked and DRY on:** X1 OID-equality laundering via edit/rename/move/symlink/gitlink/stale-ref (predicate holds except as reported); X3 argument order, `--cached <commit>` semantics, rename/mode hunk effects on the line map; A2 liveness-test soundness; X1/X3 `catch` fail-open audit (X1 clean, X3 reported).
