# Repository ref-store repair — 2026-09-22

**Branch:** `creator-brains-engine-r2-20260915`
**Seat:** WorkBuddy agent session
**Status:** REPAIRED — history intact, working tree intact, no content lost.

---

## 1. Presenting symptom

Every git command failed outright:

```
$ git rev-parse HEAD
fatal: not a git repository (or any of the parent directories): .git
```

The repository was undiscoverable. No commit, cherry-pick, review or fetch was
possible from this seat.

---

## 2. Root cause

**`.git/refs/` did not exist.** `.git/HEAD` still contained
`ref: refs/heads/creator-brains-engine-r2-20260915`, but the directory that
ref points into was gone, so git failed its discovery precondition before it
could read anything else.

Corroborating evidence that this was a **ref-packing operation that over-pruned**:

| Artifact | mtime | Meaning |
|---|---|---|
| `packed-refs.bak-sable-round30` | 11:41 | A `.bak` taken by an agent named "sable" |
| `packed-refs` | 11:42 | Repacked one minute later |
| `.git/logs/refs/` | 11:43 | Recreated (lost its per-ref files) |
| `.git/worktrees/ss-media-api/` | 11:43 | Recreated |
| `.git/.probe-write` | 11:44 | A write-probe by that agent |

A `git pack-refs --all --prune` moves loose refs into `packed-refs` and then
removes the now-empty loose ref directories. The refs themselves survived in
`packed-refs` (74,829 B, all of them present) — only the directory was gone.

## 3. Secondary symptom: `HEAD` had advanced

At the start of this window `HEAD` resolved to `887e62e6d`. After the repair it
resolved to `4c93db148`. A concurrent workstream had committed and pushed in the
interim; `4c93db148` is both the local `HEAD` and the origin tip. Not corruption.

## 4. Repair applied

Two additive steps. Nothing was deleted, moved or rewritten in `refs` or `objects`.

```
mkdir -p .git/refs/heads .git/refs/tags .git/refs/remotes
git fetch origin creator-brains-engine-r2-20260915:refs/remotes/origin/creator-brains-engine-r2-20260915
git update-index --refresh          # re-derive stat info from disk
git read-tree HEAD                  # rebuild cache-tree from HEAD
```

Rollback copies (taken before the first edit):

```
C:/tmp/git-repair-20260922/packed-refs.bak
C:/tmp/git-repair-20260922/index.bak
C:/tmp/git-repair-20260922/HEAD.bak
C:/tmp/git-repair-20260922/index.before-cachetree
```

## 5. Object-store damage, measured before and after

| Metric | Before | After | Reached |
|---|---|---|---|
| `git rev-parse HEAD` | fatal | `4c93db148` | fixed |
| cache-tree errors | 8 | **0** | fixed |
| `missing` objects (fsck) | 181 | **9** | reduced |
| staged phantom deletions | 1 | **0** | fixed |

The initial fetch of 172 blobs was the recovery mechanism: those blobs existed
on `origin` and were re-downloaded. The remaining 9 are the residue.

### The remaining 9 — and why they are not a problem

```
missing blob   338eb856b72cd19566b6684246ddb2c086a2e6e6
missing blob   2c1d536f57c12ec7e136cbc59ecd8c2b18876110
missing blob   08db7607a99764c3b686ffde316d3832a1292e59
missing tree   1272aa7a7fef8f576e87f7903676015b8c55db0b
missing tree   2dd1923f584c57dbb0ca1eeed58b44d7912abe7f
missing tree   2354fb58411dbd2798bbf1d1715315db4a9ce34c
missing tree   3506bdc5e34015c5570ef2801a06f1968234c0d3
missing tree   23bbdea00368990bce4dddcd25e9f8c44f2374c3
missing commit 4698de0e410581046592f1d7c2868fed86030ba8
```

**Verified properties of this set:**

- **Intersection with `HEAD`'s tree: 0.** Not one of them is reachable from the
  current commit. `git ls-tree -r HEAD` walks all **13,192** entries with exit 0.
- **Intersection with the index: 0** after `read-tree`.
- The missing commit `4698de0e` is contaminated: an object that *references* it
  was itself pruned, so `git cat-file` reports `malformed object name` rather
  than the usual lookup failure. It is a partially-repaired dangling commit —
  almost certainly owned by the same interrupted packing operation as §2.
- They are referenced only by **dangling** commits/trees (1,117 dangling objects
  were present), i.e. work that was never committed to a ref.

## 6. Content-safety proof

The 181→9 reduction is a *ref-store* figure. The question that matters is
whether any **file content** was lost. It was not:

- All **172** paths whose index blob was missing were checked on disk:
  **172 present, 0 absent.**
- Spot hash check on a file the fsck flagged:

  ```
  path : packages/creator-brains-console/lib/repair.mjs
  disk : 606c85f92bf23a88b97c6fc71c3cd30475fc6783   (6,933 B)
  ```

  Content on disk is byte-intact. The stale hash was an *index* artifact: the
  index recorded a blob id that no longer had an object, while the real content
  sat on disk the whole time. `read-tree HEAD` re-synchronised it.

## 7. Final verified state

```
HEAD              : 4c93db148fcee179385cb44b83953a49e9061af4   (== origin tip)
branch            : creator-brains-engine-r2-20260915
git rev-list -c HEAD : 4542 commits, walkable
git ls-tree -r HEAD  : 13192 entries, exit 0
staged changes    : 0
cache-tree errors : 0
```

## 8. Standing recommendation

The repository has **no `core.fsmonitor`-independent protection** against this
recurrence, and the concurrent-agent pattern that caused it is still active.
Two things worth doing, neither of which this seat should do unilaterally at
this moment:

1. **Do not run `git pack-refs --prune` while multiple agent workstreams are
   live.** The prune half is what removed `refs/`. If refs must be packed, pack
   without `--prune`, or run it with all other seats stopped.
2. **The 9 residual objects will re-appear on every fsck.** They are expected,
   attributable, and unreachable from `HEAD`. An fsck-driven gate that treats
   *any* `missing` line as failure will red-flag this repo forever on a
   condition that cannot be fixed locally. Any such gate needs the exclusion
   set above written into it, or it will be a permanently-red gate that people
   learn to ignore.

## 9. Note on scope

This repair was **not** part of the S5 BrainConstellation work. It was
discovered while attempting to start that work, and was done first because
committing or cherry-picking on a repository that cannot resolve `HEAD` cannot
produce anything another seat can use.
