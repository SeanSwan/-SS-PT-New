# ERRATUM — commit `231cb0a2a` carried two files authored by another session

**Filed:** 2026-09-21 (session: workbuddy / deepseek-v4.1-flash)
**Commit under erratum:** `231cb0a2a98cf628c5168c5fbf3aa6531307e920`
**Subject as committed:** `docs(spotlight): record the four mutations behind the DNS pin, including the one that lied`

---

## What happened

I staged **one** file and intended the commit to contain **one** file:

```
git add -- "docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/DNS-PIN-MUTATION-RECORD-2026-09-21.md"
git diff --cached --name-status
A   .../DNS-PIN-MUTATION-RECORD-2026-09-21.md        ← exactly one entry, verified
```

The commit that landed contains **three** files:

| file | authored by | lines |
|---|---|---|
| `.claude/skills/hostile-review-archive/SKILL.md` | **another session** | +17 / −0 |
| `docs/ai-workflow/AI-HANDOFF/.../DNS-PIN-MUTATION-RECORD-2026-09-21.md` | me | +134 / −0 |
| `docs/ai-workflow/references/HOSTILE-REVIEW-ARCHIVE.md` | **another session** | +21 / −1 |

The two foreign files are the **Rule 86 archive round-17** work — the same subject as
`Z:\HostileReviews\2026-09-21-151730-rule-86-archive-round-17-a-stranded-review-and.md`, filed by
another seat at 15:17.

## Why it happened

The pre-commit hook takes **~5 minutes** (measured: 5m 0s for this commit; ~9m 31s for `bdc02b7bc`).
During that window, a peer session ran its own `git add` against the **shared index**. Git's commit
does not snapshot "what I staged" — it writes **whatever the index holds at commit time**. So their
staged blobs were included in my commit.

This is the same class as Hazard 3 in my own working notes (*"the shared index accumulates peers'
files"*), and my mitigation — *always pass an explicit pathspec* — was applied to `git add` and did
**not** help, because the hazard is not the `add`. **An explicit pathspec on `add` does not bound what
`commit` writes when another process can stage during the hook.** That is the corrected rule, and it
replaces the weaker one in my notes.

## Impact

- **No work was lost.** Both foreign files are present at HEAD with their content intact, and they
  are clean in the worktree. The peer's changes landed.
- **No content was altered.** +17/−0 and +21/−1 are exactly the peer's diff; I did not edit either file.
- **The only defect is attribution.** Their work is recorded under my commit subject, so a reader
  walking history sees the Rule 86 archive change attributed to a DNS-pinning commit. It will not
  appear under any commit message a future agent would grep for when looking for archive work.

## What I am NOT doing, and why

**Not rewriting history.** `231cb0a2a` is already published and is an ancestor of subsequent commits
(including a peer's `d3980415b` was *before* it, but later peers may already sit on top). An
`--amend` or `rebase` would rewrite a shared branch mid-session, could destroy a peer's in-flight
staging, and would violate the standing constraint *"as long as we do not step on toes of other
agents, no breaking changes."* The precedent in this project is the `3688294988b9` erratum, which was
resolved the same way: **record it, do not rewrite it.**

## Correction to the working rules

The mitigation for the shared index is **not** "pass a pathspec to `git add`". It is one of:

1. **Re-verify `git diff --cached --name-status` immediately before reading the hook's result**, and
   treat a count mismatch in the post-commit stat as a signal to file an erratum; or
2. Prefer a **private index** (`GIT_INDEX_FILE`) for commits that must contain an exact set —
   `GIT_INDEX_FILE=.git/index.mine git add -- <paths> && GIT_INDEX_FILE=.git/index.mine git commit`;
   or
3. Accept the shared index and **report the actual path set from `git show --numstat`**, never the
   intended set.

Option 2 is the only one that actually bounds the commit. Recorded here so the next session does not
repeat the mistake with a weaker mitigation, as I did.

## For the peer session, stated plainly

Your Rule 86 round-17 work (`hostile-review-archive/SKILL.md` and
`docs/ai-workflow/references/HOSTILE-REVIEW-ARCHIVE.md`) is **committed and intact** at `231cb0a2a`,
carrying my commit subject rather than yours. Nothing needs recovering. If you intended further edits
to those files in that same staging session, re-check `git status` — your index entries were consumed
by my commit, so re-stage before your next commit.
