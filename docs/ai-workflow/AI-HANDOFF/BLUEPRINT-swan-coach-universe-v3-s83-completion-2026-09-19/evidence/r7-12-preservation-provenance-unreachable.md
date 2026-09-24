# R7-12 — the preservation receipt's provenance is UNREACHABLE (found 2026-09-22)

**Severity: HIGH — evidence integrity.** Found while executing R7-04, not looked for.

## What happened

`preservation.json` states its method as:

> `"extractedFrom": "git cat-file blob <base>:<path>"`
> `"verified": "29/29 preserved artifacts byte-identical to base blobs"`
> `"verifier": "scripts/coach-completion-tools/c0-verify-snapshot.mjs"`

Running that verifier today **fails before it verifies anything**:

```
$ node scripts/coach-completion-tools/c0-verify-snapshot.mjs
error: Could not read 3659bf16a29e52b18b9e079f7f91af287e80b2cc
Error: Command failed: git ls-tree -r --name-only 53005a6da… docs/ai-workflow/…
exit=1
```

`53005a6da` is the rescue commit the receipt names as `base.head`. The commit object itself is
present (`git cat-file -t` → `commit`), its root tree `a5d39362d` is present and traverses **2,399
paths** — but one of its **subtrees is missing from the object store**:

```
git ls-tree 53005a6da docs
040000 tree 3659bf16a29e52b18b9e079f7f91af287e80b2cc    docs      <- MISSING
git cat-file -t 3659bf16a
fatal: git cat-file: could not get object info
```

Measured by path:

| subtree of the rescue commit | paths reachable |
|---|---|
| `scripts/` | 580 |
| `frontend/` | 3 |
| `docs/` | **0** |
| `backend/` | **0** |

So the loss is not scoped to the blueprint package — **every path under `docs/` and `backend/` of
that commit is unreachable**, and the blueprint package specifically resolves to **no paths at all**.

## Why this matters more than a broken verifier

1. **The receipt's central claim is now uncheckable, by anyone, ever.** "29/29 byte-identical to base
   blobs" depends on reading those base blobs. They cannot be read. The signature is not merely
   stale — its referent is gone.
2. **The base was never an ancestor of HEAD** (`git merge-base --is-ancestor 53005a6da HEAD` → NO),
   and the package **was never committed on any reachable ref** (`git ls-files <PKG>` → **0**;
   `git log --all -- <PKG>` → empty). This is the *same shape* as the worktree-registration incident
   earlier in this session, one level down: work that git could not see, made visible only by a
   rescue that has itself partially rotted.
3. **The 29 artefacts are UNTRACKED.** They are `??` in `git status`. Nothing under the package is in
   the index.

## What is NOT lost — measured, so this is a warning and not a eulogy

```
preserved-r4-package files on disk : 29
total bytes                        : 1,247,081
zero-byte files                    : 0
comparable .tmp file present       : .packet-review3-check.tmp.md (191,242 bytes)
```

**All 29 artefacts are real on disk with real bytes.** The content survives. What does not survive is
the **provenance chain**: the snapshot can no longer be shown to correspond to any committed state,
which was the entire thing the receipt existed to certify.

## The only way this gets safer

The snapshot's own gate says the receipt *"does not by itself authorize replacing them; that is the
integration step, and the replacement must be recorded as a supersession rather than an edit."*
Untracked work whose provenance is gone is **one `git clean` from being unrecoverable** — and this
session has already seen one concurrent-agent incident destroy a worktree registration. Committing
the 29 artefacts (as `A`) is what converts the disk copy into a durable one; **the commit is no longer
merely good practice, it is the only surviving evidence step available.**

## Gate consequence

`checkPreservation` returned `[]` for this receipt throughout, and **continues to**. It validates
`status`, `artifactCount > 0` and the *format* of the string `"29/29"`. It cannot observe that the
receipt's method, verifier and provenance are all inoperable, because it parses nothing the receipt
actually asserts (this is R7-04, closed separately) and it never runs the verifier. The R7-04 fix
binds enumeration + on-disk verification; this document records the **provenance** half, which no
gate can repair after the fact and which therefore has to be closed by **committing the bytes**.

---

*Recorded by: vs-claude@main-sd2b553e5, branch `creator-brains-engine-r2-20260915`.
Evidence: `scripts/coach-completion-tools/r711-manifest-byte-probe.mjs`, `scripts/coach-completion-tools/c0-verify-snapshot.mjs`, `git cat-file`/`ls-tree` above.*
