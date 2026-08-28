# GLM Consult

**Model:** glm-5.3-flash
**Document:** C:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/panel-2026-08-27/BRIEF-R8-GUARDS.md
**Tokens:** 9571 in / 13159 out (reasoning: 12177) | total 22730
**Wall:** 257.4s

---

**A5 — fail-open audit of the catches**

**1. token-registry-check.mjs:~281 (the `execFileSync('git', ['diff','--cached',...DIFF_BASE,'-U0','--',f])` call) + `catch { diff = ''; }` at ~:284 · HIGH.** Node's default `maxBuffer` is 1 MiB and this call sets none — unlike X1's 16 MB `stagedContent` and X2's 64 MB `git()`. The catch conflates "git errored" with "no staged diff": if the diff exceeds 1 MiB, `execFileSync` throws, the catch sets `diff = ''`, and the file contributes zero added lines — guard exits 0 on a file it never judged. The X3 change makes this *more* likely, not less: in merge mode the diff is index-vs-origin/main, i.e. the whole branch divergence for that file (a rewritten minified bundle or vendored JSON blows past 1 MB), and those are precisely the token-heavy files. Fix: pass a large `maxBuffer`, and in the catch rethrow when `e.status !== 0 || e.signal` — only exit-0-with-empty-output may mean "no diff". (Rest of A5 verified closed: X1's `gitOut`→null keeps the file in the checked set; X2 has no swallow and `die()`s on unreadable input; X1's crash path exits nonzero = blocked.)

**A7/B4 — other git states staging unauthored content**

**2. All three — constitution-guard.mjs:~487 (`MERGING`), frontend-guards.mjs:~66 (`MERGE_IN_PROGRESS`), token-registry-check.mjs:~270 (`DIFF_BASE`) · MEDIUM.** `git merge --squash origin/main` stages every carried byte but writes **no `MERGE_HEAD`** (only `.git/SQUASH_MSG`), so all three guards see "not a merge", keep HEAD baselines, and the exact incident that motivated today's work reproduces verbatim: a squash-sync of main reports "13 rules REVERTED, stale-copy signature", X1 exempts nothing, X3 bills main's lines to this commit. The availability bug the change exists to fix silently doesn't cover its closest sibling. Fix: `MERGING = MERGE_HEAD || existsSync(gitDir/SQUASH_MSG)` in all three; share one helper.

**3. frontend-guards.mjs:~69 (`verbatimCarryFrom`) · MEDIUM.** The exemption anchors to `origin/main` only, so any merge whose source isn't main gets zero relief. `git subtree pull` is a real merge (`MERGE_HEAD` set) carrying upstream vendored bytes whose blobs never equal origin/main's → every vendored file re-enters G1–G5; one galaxy-hex, MUI or styled-components hit inside vendored code makes dependency updates unlandable — and G6's existing vendored skip concedes the codebase already knows vendored paths need an exemption that G1–G5 lack even under X1. Same shape for merging `origin/release` or an integration branch. Fix: exempt when the staged OID matches the blob in **either** `origin/main` **or** `MERGE_HEAD`'s tree, and add a vendored-path allowlist for G1–G5 mirroring G6's.

**4. constitution-guard.mjs:~487 · LOW.** Cherry-pick, revert, `git am`, and `pull --rebase` (`CHERRY_PICK_HEAD`/`REVERT_HEAD`/rebase-merge) stage content authored elsewhere with no `MERGE_HEAD`, so X2 attributes it fully to this commit: cherry-picking a rule-removal/renumber commit across diverged branches false-trips removal/reversion blockers, and `git revert` of the commit that *introduced* a rule — the sanctioned rollback — now requires the `SWAN_ALLOW_RULE_REMOVAL` hatch. Direction is closed (it blocks, never passes), hence LOW; the cost is attribution lying — "exists in HEAD and is GONE" for a foreign edit trains operators that the message is wrong and `--no-verify` is the tool. Fix: detect sequencer state and name it in the blocker ("carried by cherry-pick of abc123") or skip non-merge sequencer ops.

A5 otherwise: nothing. A7/B4 otherwise: nothing beyond the addendum's already-named `diff --cached` selection sites, which I did not re-report.
