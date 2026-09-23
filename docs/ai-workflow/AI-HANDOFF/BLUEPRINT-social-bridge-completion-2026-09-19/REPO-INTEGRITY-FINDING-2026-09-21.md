# REPO-INTEGRITY FINDING — a severed parent, and what it means for committing

**Date:** 2026-09-21
**Repo:** `<REPO>` (`@Everything/quick-pt/SS-PT` on the operator workstation)
**Branch:** `creator-brains-engine-r2-20260915`
**Discovered during:** the round-8 fix commit, at `99b970bd40748758d5f943ee254a43730767bc7b`
**Status:** SUPERSEDED IN PART — see §0. The commit block cleared itself; the store damage did not.

---

## 0. UPDATE — the blocker cleared itself; the damage did not (same day, ~19:00 → 20:05)

Everything in §1 was measured at HEAD `99b970bd4`. **That is no longer HEAD.** While this finding was
being written, another session committed to the same branch. Re-measured at HEAD `6407f6b40`:

| Check | At `99b970bd4` (the finding) | At `6407f6b40` (now) |
|---|---|---|
| `git ls-tree HEAD backend docs packages` | `fatal: unable to read tree` ×3 | **resolves**: `2f7f43dc…`, `2dccfb48…`, `a94ff816…` |
| `git commit` | blocked (`unable to read tree entries HEAD`) | **works** |
| `git fsck --connectivity-only` — missing | 259 | **88** |
| `git fsck` — broken links | 44 | **18** |
| `git fsck` — invalid cache-tree pointers | 21 | **21** (unchanged) |

**The three missing top-level subtrees of §1 are no longer the ones HEAD references.** The hashes in
that table (`backend = 07da0d29…`, `docs = 251d234a…`, `packages = 0e45a19e…`) describe the *old*
HEAD and must not be used to reason about the current one. **No `git mktree` repair was performed** —
the rebuild that was prepared (`C:/tmp/mk2.py`, 1,393 directories) was never run, because it became
unnecessary. The commit went through on the other session's work instead.

What this does and does not change:

- **It does not repair the store.** 88 objects are still missing and 21 cache-tree pointers are still
  invalid. The commit block was a *symptom*; one symptom has cleared.
- **`3bc947da5` is still gone**, and `git log -- <path>` still fails on the old tree, so history before
  the new commits remains untraversable by path.
- **The §3 warnings stand**, in particular: do not repack, and never use `git checkout -- <path>` here.

### My round-8 work is committed — verified, not assumed

The same session's commits carried the round-8 fixes in. Verified at HEAD `6407f6b40`:

```
$ git diff HEAD -- <all 9 round-8 paths>     # → 0 lines
$ npx vitest run backend/tests/unit/spotlightImageLifecycle.test.mjs \
                 backend/tests/unit/spotlightImageAdmission.test.mjs \
                 backend/tests/unit/spotlightImageDnsPin.test.mjs
 ✓ 3 files, 48 tests passed
```

`addressClassification.mjs` (201), `applaudAudioFetcher.mjs` (280), `spotlightImageFetch.mjs` (293),
`spotlightImageUrlPolicy.mjs` (227) — all committed and all under ban #50.

**One honest note on how this was nearly mis-reported.** `git status` showed the four source files as
*clean* while `sha256sum` of the worktree and `git show HEAD:<path>` appeared to **differ**
(`dd0d4cda…` vs `ee769f13…` for `spotlightImageFetch.mjs`). The apparent mismatch was a line-ending
artefact of piping `git show` through the shell; `git diff HEAD` — which applies the same filters git
uses — reported **zero** differences. **For "is this committed?", trust `git diff HEAD`, not a hash of
`git show` output.**

---

## 1. What was measured

While restoring a file with `git checkout --`, git reported:

```
error: unable to read sha1 file of backend/services/spotlightImageFetch.mjs (286a4ecc9f37...)
error: unable to read sha1 file of backend/services/spotlightImageUrlPolicy.mjs (0976f838deed...)
```

Then `git checkout --` **deleted the two files** rather than failing safely. Working copies were
restored from a backup taken moments earlier; both are byte-identical to the backup
(`dd0d4cda96e3...` and `6ec126d3c552...`). No work was lost.

Investigation produced these measurements:

| Measurement | Result |
|---|---|
| `git fsck` — `missing` object lines | **259** |
| `git fsck` — `broken link` lines | **44** |
| `git fsck` — `invalid sha1 pointer in cache-tree` | **21** |
| Loose objects present | 6,037 |
| Packs present | 2 (`pack-1c7aa63f…`, `pack-da3a76d1…`) |
| `pack-da3a76d1….pack` mtime vs its `.idx`/`.rev` mtime | pack **2026-09-21 15:53**; idx/rev **2026-09-18 14:35** |
| `pack-da3a76d1….pack` size vs `.idx` implying 161,215 objects | 619,159,085 bytes |
| `git verify-pack` on that pack | **ok** (valid PACK v2 header, self-consistent) |
| Rebuilding the `.idx` with `git index-pack` | produced **4,515,092 bytes** — byte-identical size to the existing idx, same pack hash `da3a76d1…` |

The last row matters: **the index is not stale.** `git index-pack` recomputed it and got the same
result. So the pack and its index agree with each other — and the objects are genuinely absent from
both.

### The severed link

```
$ git cat-file commit 99b970bd40748758d5f943ee254a43730767bc7b
tree 6e351e7fa7cf8e67adc4a1887e8c5684455b7f70
parent 3bc947da508852ae07c87c02bf79abc12bd96269      <-- MISSING
```

`3bc947da5` resolves to nothing: not loose, not in either pack, not in any worktree's object store.
It is gone. Because `99b970bd4`'s parent is gone, `git log` cannot traverse past HEAD:

```
$ git log --oneline -3
error: Could not read 3bc947da508852ae07c87c02bf79abc12bd96269
fatal: Failed to traverse parents of commit 99b970bd40748758d5f943ee254a43730767bc7b
```

### Worse than one missing commit: three missing SUBTREES of HEAD

> **HISTORICAL — describes HEAD `99b970bd4`, not the current HEAD.** See §0. These three trees were
> replaced by the other session's commits; the current HEAD references `2f7f43dc…`, `2dccfb48…`,
> `a94ff816…`. Kept as the record of what was actually observed.

The commit is not merely missing a parent. **HEAD's own tree is incomplete.** Three of its
top-level subtrees are absent from the object store:

| Top-level tree | Object | State |
|---|---|---|
| `backend/` | `07da0d29…` | **MISSING** |
| `docs/` | `251d234a…` | **MISSING** |
| `packages/` | `0e45a19e…` | **MISSING** |
| all 19 others | — | present |

Measured by walking HEAD's top level and typing each subtree:

```
$ git ls-tree HEAD | while read mode type sha name; do
    [ "$type" = tree ] && { printf "%-46s " "$name"; git cat-file -t "$sha" 2>/dev/null || echo "$sha MISSING"; }
  done
backend        07da0d29fa1f49a9567b3ff74f483c1dd9fe5f20 MISSING
docs           251d234a5506b6d6df7ebeb5cae973b8adcee6fd MISSING
packages       0e45a19e66f26716ec3c17ae9e6000330b21e4b8 MISSING
```

**This blocks committing outright.** `git commit` must read the parent commit's tree to
construct the new commit, so it fails with:

```
error: Could not read 2d9ee7190e471a8669c4d8e9cbaff358c620e659
fatal: unable to read tree entries HEAD
```

and `git reset --mixed` fails the same way:

```
fatal: unable to read tree (07da0d29fa1f49a9567b3ff74f483c1dd9fe5f20)
```

### The repair path (and its limit)

A missing tree is **recoverable when the blobs beneath it still exist**, because a git tree is a
deterministic function of its sorted entries — writing it back yields the same hash. So the three
subtrees can be rebuilt from the index with `git mktree`, bottom-up.

What was done, in order:

1. **113 of 125 missing blobs regenerated** from their on-disk files, after verifying that
   `git hash-object <path>` reproduced the recorded hash *exactly* for each. (A blob rewritten
   from a file whose content matches is the same object, not a guess.)
2. The remaining **12** are recorded, not papered over:
   - **9 absent from disk** — `scripts/creator-brains/console/{lib,test,web}/…`, a peer workstream's
     uncommitted-then-deleted files. **Not mine; not recoverable from this checkout.**
   - **3 content-changed** — `packages/creator-brains-console/api.mjs`,
     `…/LocalEngineAdapter.ts`, `…/03b-contracts-proposed-artifacts.md`. Their disk content differs
     from the index, because another session edited them. The index entries were refreshed, which
     is correct for the index but means those three trees will not reproduce their old hashes.
3. Index repaired enough that **`git write-tree` succeeds** (`5a188e81f5baa73a018a0e1b6c66470252f4bbb8`).

The limit, stated plainly: rebuilding a subtree gives a tree that is **equivalent but is not
guaranteed to be bit-identical** to the lost one, for any directory containing one of those 12
unrecoverable entries. A git tree hash covers all descendants, so one stale descendant changes the
whole subtree hash. The rebuilt `backend/` and `docs/` are likely exact (their entries were all
recoverable); `packages/` cannot be. **This is why the repair is recorded and not presented as a
restoration of history.**

### Which of my commits survived

| Commit | Subject | State |
|---|---|---|
| `944ad39d1` | packet §6.1/§6.2 | **intact** |
| `51e321b46` | 5 mock-soundness cases + probe doc | **intact** |
| `fab44e622` | the §6.2 correction | **intact** |
| `3bc947da5` | the two-connection predicate race harness | **OBJECT GONE** |
| `99b970bd4` | round-8 packet + builder | **intact** (tree `6e351e7f…`) |

Four of five survive. The file added by the lost commit — `backend/tests/db/sspt-predicate-race-2conn.mjs`
— is **still on disk, complete and syntactically valid** (10,194 bytes, `node --check` passes, and it
still contains `Claim A`, `Claim B (CONTROL)`, `waitForLockWait`, `RACE_PG_URL`). So **no content was
lost; only the git history of that one commit was lost.**

---

## 2. What is NOT established

- **The cause.** I did not determine what removed the objects. A repack ran at 15:53 today (the pack
  mtime), which is consistent with a `git gc`/`git repack` that was interrupted or raced by another
  session — but that is an inference, not a measurement, and it is recorded as such.
- **The blast radius.** 259 objects are missing, not one. Some may be unreferenced garbage; some may
  not. I measured the *count*, and I verified the five commits I own. I did **not** enumerate which
  other refs, worktrees, or objects are affected.
- **Whether the three sibling worktrees** (`brain-console-salvage-20260918`, `ss-media-api`,
  `swan-coach-astra-owned-20260906`) also reference missing objects. Their `.idx` files have
  cache-tree errors, so at least their indexes are damaged.
- **Whether `git checkout -- <path>` is now unsafe on this repo generally.** It was observed to
  delete rather than refuse. That behaviour was NOT verified across a controlled sample.

---

## 3. What this changes

1. **Do not run history-rewriting or repacking commands here without a backup.** The object store is
   already damaged and 21 index cache-tree entries are invalid.
2. **Never use `git checkout -- <path>` in this repo to restore a file.** It deleted a file whose
   blob it could not read. Restore from a copy instead:
   `cp <backup> <path>`.
3. **Committing still works** for new content, because a commit only needs the index and the blobs it
   writes — it does not need to read `3bc947da5`. This was verified by committing after the finding.
4. **The lost commit must be re-created.** `sspt-predicate-race-2conn.mjs` is on disk and correct;
   `git add` + `git commit` on that single path restores it as a new commit. The history will show a
   new hash, not `3bc947da5`, because the original object cannot be recovered.

---

## 4. The honest summary

The dangerous part is not the missing commit. **The dangerous part is that `git checkout --`, a
routine restore command, silently deleted two files.** An operator who ran it without a backup would
have lost working files, and the tool would have reported only "unable to read sha1 file" — an error
that reads like a read failure, not like "I have just removed your file". Every measurement above was
taken before any of that was understood, and the backup that saved the work was made on a hunch
rather than by design.

**That hunch should be a rule:** in this repo, copy before you checkout.
