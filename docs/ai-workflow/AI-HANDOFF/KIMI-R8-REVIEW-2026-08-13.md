# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/COORDINATION-R8-PACKET-2026-08-13.md
**Seed:** (none)
**Tokens:** 3113 in / 9566 out | **Cost:** ~$0.1528 | **Wall:** 378.8s | **finish_reason:** stop

---

# Hostile review — Round 8 evidence pass and approval document

**Verdict up front:** The pass caught nine reviews asserting without checking, then committed the same sin three times in one document: it asserts restorability without performing a restore, asserts "nothing is at risk" for 31 worktrees it admits it didn't inspect, and asserts corrected counts in a table whose rows don't sum to its total. The 403 finding is solid. The archive finding is not. Ranked by cost × likelihood:

---

## P0 — could cause irreversible loss

### 1. "Discard is safe, the archive makes it recoverable" is the most dangerous sentence in the document

This is the line a busy owner will skim, check "discard," and act on. It is not supported:

- **Ignored files are excluded by construction.** The 144/144 count was verified against `git ls-files --others --exclude-standard`. `--exclude-standard` *by definition* omits everything in `.gitignore`. Any `.env`, local config, credential file, or ignored-but-needed artifact in that worktree is **not in the archive and never was**. On a repo that already had a credential incident, the probability that a month-old feature worktree contains an ignored `.env` or local override is not low. The count match proves fidelity against a list that silently omits the highest-value-at-risk class.
- **The archive lives in `C:/tmp`.** A temp directory, on one machine, with no off-machine copy, no checksums, no git objects, no integrity protection. The same document correctly treated "ledger visible off-machine" (item 5) as worth doing — then parked the only copy of 212 files of unshipped work in tmp. Tmp gets cleaned. Disks die. "Recoverable" should mean "recoverable in six months," not "recoverable until the next temp purge."
- **No restore rehearsal was performed.** Nobody has ever restored this archive into a scratch directory and diffed the result against the source worktree. "Restorable" is a hypothesis, not a finding.
- **The dominant option was never offered.** The worktree is on its own branch, 0 commits ahead. `git add -A && git commit -m "WIP archive" && git push` captures modes, symlinks, deletions, and every tracked-and-untracked file as self-verifying git objects, server-side, in one minute. A `git bundle` is the offline equivalent. Patch-plus-`cp` is strictly inferior on every axis — weaker fidelity, weaker integrity, weaker durability — and the keep/discard framing hides the third option that dominates both. Note the inconsistency: Decision 3b prescribes "archive-then-remove" for class B, but the one worktree actually archived got the weakest possible archive method.

**Fix before this document goes to the owner:** push a WIP branch or bundle, run `ls-files --others` *without* `--exclude-standard` and diff the lists, hash-manifest the untracked copy, do one real restore into a scratch dir. Until then, strike the word "recoverable" from Decision 2.

### 2. Every `origin/main` comparison may be stale — fetch time is never stated

Claim 4 ("6 migrations verified absent from `origin/main`"), claim 6 ("177 unmerged commits," "class A merged & clean"), and the "0 commits ahead" figure all depend on the local `origin/main` ref. The worktree was last touched 2026-07-16. If the last fetch is anywhere near that old, then: migrations may have landed under different names since; "merged & clean" class-A worktrees may be misclassified in either direction; the 177-commit count is against a month-old upstream. The document that exists to drive irreversible keep/discard calls never says when it last fetched. One `git fetch --all` and a re-run; until then every origin-relative number carries an asterisk the document doesn't print.

### 3. Recommendation 3c asserts safety for 31 worktrees it admits it didn't inspect — and reflog expiry puts them on a clock

The table says class D is "not computable without inspection." The recommendation says "nothing is at risk while they sit there." Both cannot be true. Worse: detached-HEAD commits in class D are reachable only via HEAD reflogs, which **expire (default 90 days) and die on gc**. "Leave it indefinitely" is not a neutral option for class D — it is slow-motion deletion with no decision point. This directly inverts the document's own risk framing: the class it inspected least is the class with a built-in destruction timer, and it's the class the recommendation parks forever. 3c is defensible for A-adjacent tidiness reasons; as written, it is rationalized inaction for D specifically.

---

## P1 — wrong or misleading, but recoverable

### 4. The count-correction document contains a counting error

A=4 + B=44 + C=35 + D=31 = **114**. The table says **115 total**, and the review text says "leave 111" (115−4). Either a class is miscounted or the total is. In a document whose flagship credibility move is "191 was wrong, it's really 212," an internal off-by-one in the triage table is maximally damaging — and it propagates: if the true total is 114, "leave 111" is wrong too. Separately: the Decision 2 "spread" sums to 102+38+19+9+5+4 = **177 of 212**, leaving 35 files unaccounted for — where are they? And how were class B's "4,247 uncommitted files" counted? If via `git status --porcelain` — the same directory-collapse bug this very pass caught and fixed — then 4,247 is itself an undercount, and the document doesn't say which method was used.

### 5. `apply --check` is proof of applicability, not fidelity

It proves the patch applies to a clean tree at `62ce6207f`. It does not prove the patched tree *equals* the source worktree. And it tests only the 68-file tracked half — the 144-file untracked half (the majority, and the half containing all 6 migrations) is verified by **count only**. Count is a cardinality check, not an integrity check; the first attempt's silent 121-file shortfall was caught by luck of comparison, not by a systematic check, and the same class of silent omission (ignored files, symlinks copied as regular files by `cp` on Windows, empty directories, executable bits on untracked scripts) has no test that would catch it now. The honest claim is: "patch applies cleanly; untracked file count matches; content fidelity and ignored-file coverage unverified."

### 6. Yes — whole classes of at-risk data were missed

The survey classified *worktrees*. It did not survey:

- **Stashes** — stored in the common git dir, shared across all 115 worktrees, invisible to every count in the document. One `git stash list`.
- **Unpushed branches with no worktree** — `git branch --no-merged origin/main` (after fetching). The survey's frame structurally cannot see these.
- **Reflog-only commits** — see P0-3.
- **Tags and notes** — unpushed tags and `git notes` content, unexamined.
- **Ignored files in the 44 dirty class-B worktrees** — the 4,247 figure presumably has the same `--exclude-standard` blind spot as the comms archive.
- **The main tree's own uncommitted state** — three sessions are editing it live; is *its* dirty state archived anywhere? Not mentioned.

Each is a one-command check. Their absence means "full classification" in the Decision 3 header is overstated: it is a full classification of *worktree checkout state*, nothing more.

### 7. The 403 conclusion is sound; the framing around it is not

The billing-specific 403 message on both `protection` and `rulesets` is the plan gate, not a token-scope artifact — claim 1 stands, and the "nine passes never checked" meta-point is fair. But:

- **"The only path to a server-side gate" is overstated.** Pre-receive hooks are Enterprise-Server-only, required workflows need a paid org, fork protection protects the wrong repo — all correctly dead ends. But **Render-side gating is a real, free, untested partial control**: disabling auto-deploy on `main` severs the push→production path, which is the actual catastrophic outcome for a production SaaS. It doesn't stop pushes; it stops pushes from *mattering*. The pass asked "can we gate pushes?" and never asked "can we gate deploys?" — the second question is arguably the more important one and was in the reviewer's own attack list.
- **A and B are presented as alternatives in a pick-one table; they are sequential dependencies.** Pro without working CI buys a gate with nothing to enforce. A skimming owner can check "A" and believe the gap is closed. The recommendation line says "A then B," but the table invites "A."
- One sanity line is missing: confirm the `gh` token has admin scope on the repo, so "403 = plan gate" is fully pinned rather than 99% pinned.

---

## P2 — overstatements that erode trust

8. **"Three sessions genuinely live right now."** Evidence is file mtimes (17m, 1m) and lock presence. A crashed or abandoned session leaves recent mtimes and a stale lock — which is exactly the verdict given to the 12h lane. What's proven is "recently active"; "genuinely live" is inference. Low stakes because the recommendation (don't touch) is correct either way — but the same mtime logic produced "LIVE" for two lanes and "STALE" for the third, and the document doesn't acknowledge the asymmetry.
9. **"Secret scan CLEAN."** Scanner unnamed, scope unstated, on a repo with a prior credential incident. As written it's reassurance theater. Name the tool and the file set, or delete the claim.
10. **"Have never successfully started"** extrapolates from the 30 most recent runs to all history. If the workflows are older than 30 runs, that's unproven. Also: 30 consecutive `startup_failure` at `BuildFailed` is consistent with *one* broken workflow file — "CI is dead" may be "one YAML error," which changes Decision 1-B's cost estimate materially and was not investigated.
11. **"The source worktree was not touched."** `git status`/`git diff` refresh the index stat cache — the worktree *was* written to, harmlessly. Pedantic, but the document's absolute claims are its weakness; "no content was modified" is the defensible version.
12. **Holding the 4 class-A removals "because a live sibling session is active"** is decision inflation. The sibling is editing the main tree, not four merged, clean worktrees. This is precisely a call that did not need Sean, and punting it contradicts the "Done without needing you" philosophy one section later.

---

## The pattern

Round 7's indictment was: nine passes prescribed a control without checking it existed. This pass's version: it prescribed **discard** on the strength of an archive it never restored, parked in tmp, missing the ignored-file class by construction; prescribed **leave** for 31 worktrees it didn't inspect that are on a reflog-expiry timer; and published corrected counts in a table that doesn't sum. The evidence-gathering was real and the 403 finding alone justifies the pass. But the approval document's confidence register — "verified," "exactly," "CLEAN," "nothing is at risk," "recoverable" — runs ahead of its evidence in exactly the way it criticizes.

**Before Sean sees it:** (1) replace the archive with a pushed WIP branch or bundle and do one real restore rehearsal; (2) `fetch --all`, re-run every origin-relative number, print the fetch timestamp; (3) fix the 114/115 discrepancy and state the counting method for the 4,247; (4) run the five one-command checks for stashes, branches, tags, notes, and non-exclude-standard untracked files; (5) reword Decision 2 to remove "recoverable" until (1) is done, and reword 3c to exempt class D pending inspection; (6) add "disable Render auto-deploy" to Decision 1 as a free partial control; (7) downgrade "genuinely live" to "recently active." The decisions themselves are probably right. The document as written would let a busy owner execute them on evidence that doesn't yet exist.
