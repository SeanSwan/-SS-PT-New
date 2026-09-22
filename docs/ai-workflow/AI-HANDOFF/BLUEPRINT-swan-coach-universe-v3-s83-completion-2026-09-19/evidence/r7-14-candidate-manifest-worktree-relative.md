# R7-14 — the candidate manifest is WORKTREE-RELATIVE and silently changes meaning across worktrees

**Discovered:** 2026-09-22, by direct accident during R7-09 work.
**Severity:** MEDIUM for the entry-count half; **HIGH for the digest half** (§2b), where a
committed manifest produces **406 violations** against a tree that has not drifted at all.
**Status:** recorded, **not** repaired. Repairing it is a design decision, not a bug fix.

**Two halves, one missing field:** the entry **set** (§1) and the **digests** (§2b) are both
relative to the worktree they were taken in, and the artefact records no path that says which.

---

## What happened

While working R7-09 I ran the shipped manifest builder in the isolated worktree
`Z:/_ss-pt-r7-closure`:

```
$ node scripts/coach-completion-tools/c0-build-candidate-manifest.mjs
wrote docs/ai-workflow/AI-HANDOFF/BLUEPRINT-…/evidence/candidate-manifest.json (1 entries, self excluded)
```

**One entry.** The committed manifest in the very same directory has **402** entries.

```
$ git diff --stat …
 …/evidence/candidate-manifest.json  | 2835 +-------------------
 1 file changed, 10 insertions(+), 2825 deletions(-)
```

The single surviving entry was the one file I had just created (`r7-09-…md`, `trackedStatus: "??"`).
I reverted the file with `git checkout --` and confirmed the restoration:

```
entries restored: 402 (expect 402)
```

**No damage persisted.** The near-empty manifest existed only between two shell commands.

---

## Why it happened — and why it is not a bug

The builder enumerates the **dirty candidate set** (`git status --porcelain`) and hashes
each entry. That is the correct definition of a candidate manifest: *the set of paths this
commit intends to change.*

In the **source worktree** the coach-completion work is **entirely untracked**, so the dirty
set is ~400 paths and the manifest is meaningful at 402 entries.

In the **isolated worktree** that same work is **already committed** (`3aeda5ad4`). The
working tree is clean, so the dirty set is one path. The builder is not wrong — it is
answering its question **correctly** and getting a **near-empty** answer, because I had just
committed the thing it was built to describe.

The command is identical. The worktree differs. The output changes from 402 meaningful
entries to 1.

---

## Why this is worth recording rather than shrugging off

This is the same defect class as the findings already closed in this cycle — **an artefact
whose meaning depends on context it does not state**:

| Finding | The unstated context |
|---|---|
| R7-02 | active ids vs historical ids — the join assumed overlap that did not exist |
| R7-04 | a count with no enumeration — completeness assumed, not measured |
| R7-11 | `rawByteLength` recorded but never compared |
| R7-06 | `baseHead` hardcoded against a live `headAtManifest` |
| **R7-14** | **the candidate set is worktree-relative, and the manifest does not say which worktree** |

A reader opening `candidate-manifest.json` cannot tell from its contents whether it describes
the full 402-path delivery or a one-file side effect. The file records `baseHead`,
`baseHeadSource`, `headAtManifest` and `branch` — but **not the provenance that determines
the entry count**: whether the described work was dirty or committed at build time.

Concretely, the failure mode is: an agent in the wrong worktree regenerates this artefact,
sees exit 0 and a written file, and commits a manifest that appears authoritative and
describes almost nothing. The gate would pass it — `checkCandidateManifest` verifies the
entries it is **handed**, which is exactly the R7-03 limitation Astra named (*"the candidate
gate cannot establish completeness or confinement"*).

---

## 2b. The much bigger half: the manifest is bound to ONE worktree's bytes

Investigating the near-empty rebuild led somewhere worse. The committed 402-entry manifest
does **not** verify in the isolated worktree — the gate reports **406 violations**, every
entry "DRIFTED". Before concluding anything, I measured which worktree the manifest actually
describes, hashing all 402 entries against both checkouts:

```
$ node … (sha256 of disk bytes) vs entry.sha256, plus rawByteLength equality
entries: 402
SOURCE worktree matches: 394
differ: 5
absent: 3

(in the isolated worktree: 0 of 402 match)
```

**394/402 against the source worktree, 0/402 against mine.** The manifest is not corrupt and
not stale-by-neglect — **it is correct, and it is correct *about a different checkout*.**

I checked the obvious explanation first and eliminated it: this is **not** a CRLF artefact.
Neither checkout contains any CRLF at all (`grep -c $'\r'` → 0 in both), and the recorded
lengths are *larger* than mine (`.gitignore` 12569 vs 11703; `AGENTS.md` 215035 vs 213652)
because the source worktree holds **different, newer revisions** of the same tracked files.
The manifest's own `hashing` field is honest about what it hashes — *"sha256 of raw file
bytes as read from disk"* — but says nothing about **which disk**.

So R7-14 has two halves:

1. **The entry set** is worktree-relative (the near-empty rebuild in §1).
2. **The digests** are worktree-relative (this section), and the manifest records no path
   that would let a consumer tell.

Both are the same missing field. And the consequence is worse than the count problem: a
committed manifest whose digests describe another checkout will make `checkCandidateManifest`
report **406 violations on a perfectly good tree**, which is how a real drift signal gets
trained out of the reader. A gate that always says DRIFTED is as uninformative as one that
never does.

This is worth flagging explicitly against my own earlier work: I verified the R7-11
`rawByteLength` comparison as *load-bearing* by mutation-testing it (deleting it turned
exactly tests 13–14 red). It **is** load-bearing — and here it is the thing producing 402 of
the 406 violations, all of them correct observations about the wrong worktree. The mechanism
is right; the missing context is upstream of it.

---

## The minimal fix (not applied — this needs a decision)

Record the context that determines the count **and the digests**, so the artefact is
self-describing:

0. **`worktreePath` and `hashingScope`** — the highest-value field, and it fixes both halves.
   Record the absolute path the digests were taken against, and state in the `hashing` string
   that the digests are valid for that path only. Without it, a consumer cannot distinguish
   "the tree drifted" from "I am reading this from the wrong checkout" — which is precisely
   the 406-violation situation this finding documents.
1. **`dirtyOnly: true|false`** — or better, the *count of tracked paths not in the manifest*
   at build time, so a consumer can see the manifest is not the whole story.
2. **`worktreePath`** — which checkout produced it. `repoRoot` is already available; the
   manifest currently records `branch` but not the path.
3. **A floor check in the builder** — refuse (exit 3, INCOMPLETE) when the dirty set is
   smaller than a declared `--expected-min-entries`, so a regeneration in the wrong worktree
   cannot silently succeed. This is the same shape as `assertRoot` in
   `scripts/coach-completion-tools/_root.mjs`, which already refuses an unmarked root with
   exit 4, and it is the shape Astra prescribed for R7-05 (*"returning an explicitly
   unconfirmed outcome"* rather than reporting success from a request).

Option 3 is the one that actually closes the class: it converts "a command that silently
means something different here" into "a command that refuses and says why."

---

## What I did NOT do

I did not commit the 1-entry manifest, and I did not leave it on disk. It was reverted within
the same session and the 402-entry version verified back in place. I also did not "fix" the
builder by making it enumerate tracked files, because that would change what a candidate
manifest *means* for every existing consumer — a design change that belongs to whoever owns
the C0 admission contract, not a tidying edit.
