# Object-store damage — found while preparing the round-28 commit

**Date:** 2026-09-21 · **Worktree:** `C:\tmp\ss-media-api` · **Repo:** `…\Desktop\@Everything\quick-pt\SS-PT`

Found while preparing the round-28 commit, then re-found independently by a concurrent session, which
wrote `media-api/REPO-INTEGRITY-REPORT.txt` at 21:19 with the same conclusion. Recorded because it
changes what "verify against git" can mean here, and because it was **misdiagnosed once already** —
by round 3's fix log, which described it as "the base commit is missing" when the base commit was
present and the *object store* was incomplete.

## What is damaged

`git fsck` on the shared store reports **89 missing blobs, 3 missing commits, ~16 missing trees, 18
broken links**, plus invalid reflog entries and corrupt cache-trees in two worktrees. The concurrent
session's count was higher (218 blobs, 37 trees, 4 commits) taken an hour earlier.

Missing commits are all **ancestors** of the lane tip, never the tip itself:

| object | what |
|---|---|
| `4698de0e410581046592f1d7c2868fed86030ba8` | round 26's commit — blocks `git log` traversal |
| `054fec56243cc0982d82487f763153bac3f65659` | unknown ancestor |
| `3bc947da508852ae07c87c02bf79abc12bd96269` | unknown ancestor |

The load-bearing one is the missing tree **`2dd1923f584c57dbb0ca1eeed58b44d7912abe7f`**, which is
`HEAD:media-api` at `fb82c21a1`. That single object is why the lane subtree cannot be read from the
old HEAD, and why every `git diff` against it died.

## What this blocked, and how it was resolved

**Blocked:** `git diff --name-status HEAD`, `git diff-index HEAD`, `git log`, `git rev-list`.
The failure was **intermittent**, which is the worst property: five consecutive `git diff <base>`
runs succeeded (13,058 rows) while other invocations died on the missing tree.

**Root cause of the intermittency, and it was not the object store alone:** two sessions were writing
this worktree at the same time. Every flip of a gate between runs traced to the *other session
committing new files*, which changed the derived change set under a probe that was reading it. The
probe was right every time; the tree kept moving. This is worth stating plainly because "the suite is
non-deterministic" was the wrong first diagnosis, and the honest one is "two writers, one tree".

**NOT blocked, proven by execution:** `git write-tree` from the index succeeds; `git commit-tree`
succeeds; the resulting commit's lane tree walks.

## The 19 stale index blobs (repaired)

The index recorded blob hashes for 19 lane files whose objects are gone from the store. All 19
working-tree copies were intact. Method: back up `.git/index`, `touch` each affected file (so
`git add` cannot skip it on a stat match), then `git add --renormalize`. Verified: **0 missing index
blobs**, and the tree written from the index walks.

Affected: `hostile-http-probe.mjs`, `hostile-round2/4/5/7/8/11/14/16/20/22/25-probe.mjs`,
`routesCatalog.mjs`, `smoke-adapters.mjs`, `catalogue.mjs`, `comfyuiGraph.mjs`, and three
`forged-package/*.md` files.

## Leaked scratch fixtures (removed)

Three `.r35-untracked-control-*.scratch` files sat in `media-api/`, and a broad `git add` sweep
**staged them**. They are the R3-5b defect recurring: the fix's own cleanup path leaks under a kill,
and the `catch { /* already gone */ }` comment asserted a cleanup that had not happened. Removed from
the working tree and from the index. Verified: zero `.scratch` files tracked, zero remaining.

**They are also the flapping cause.** E3's `leftBehind` assertion catches its OWN leak, and it does so
correctly when run standalone — but a fixture left by a *concurrent* process carries a different
PID and timestamp, so it is indistinguishable from a legitimate untracked lane file to every other
gate. That is the same "litter indistinguishable from a diagnostician's litter" problem the probe's
own comment names.

## What was deliberately NOT done

- **No fallback derivation** in the probe to manufacture a green E1. A number recovered by a
  different question is not the number the document claims. The probe's refusal is correct.
- **No repository surgery** (`git gc`, repack, prune). The missing objects cannot be recovered
  locally: the base `2b3e7a62a` is local-only and the remote has never seen this branch, so they are
  not fetchable. Repair is Sean's call.
- **No fabricated receipt.** The stale `RECEIPT-after-R3-fixes.txt` (which claims "0 failed / 1228"
  for a tree that measured "1 failed / 1229") is left in place and contradicted here rather than
  quietly rewritten. It is a count stated in prose and derived nowhere — this lane's recurring class,
  appearing inside the very file written to close that class.
