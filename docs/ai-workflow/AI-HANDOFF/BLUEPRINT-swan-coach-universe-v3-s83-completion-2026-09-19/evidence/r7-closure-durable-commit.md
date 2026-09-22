# R7-CLOSURE — durable commit of the Review-7 remediation

**Date:** 2026-09-22
**Commit:** `3aeda5ad4835ba44cf00f8c30017b42ec4461c3b`
**Branch:** `vs-claude/coach-completion-r7-closure-20260922`
**Parent (verified tip):** `70547685c0fc8496342bf61210bf3b576f7e425c`
**Committed from:** isolated worktree `Z:/_ss-pt-r7-closure`
**Pushed:** NO — the peer incident is still live; a push would race a concurrent writer.

---

## Why this record exists

The governing instruction was *"lets do all the recommend fixes and cherry pick the
commit to make sure it is nopt lost."* The second half of that sentence was a direct
response to a live, recurring fault: a concurrent agent repeatedly deletes this
worktree's git registration. This record documents that the commit was made in a way
that survives that fault, and proves it by measurement rather than assertion.

---

## What is closed

| Finding | Mechanism that was doing less than it claimed | How it was closed |
|---|---|---|
| **R7-02** | Controller preservation joined active ids `C0…C5` against historical `S83…S90`. Zero overlap ⇒ `beforeById.get(afterSlice.id)` returned `undefined` on every iteration ⇒ `if (!prior) continue` skipped the whole body. The gate reported CLEAN over a mutation set it never examined. | Join keyed on what actually overlaps; snapshot verification scoped to the shrink case (a migration is *entitled* to append to its own history — the real v9 does). |
| **R7-04** | `checkPreservation` validated a **summary count**, not the enumeration. Completeness was an input. The pre-fix shape (a count plus a `29/29` string, no enumeration) passed. | Gate now requires an `artifacts` enumeration, asserts `artifactCount === artifacts.length`, resolves and re-hashes each entry, refuses 0-byte artefacts, and refuses a `baseBlobsReadable: true` claim carrying all-null digests. |
| **R7-11** | `rawByteLength` was **written into the manifest and compared by nothing**. A manifest could record a length contradicting its own digest and still pass. Found by my own R7-06 control pass, not by the review. | Manifest gate compares recorded `rawByteLength` against the byte length that produced the digest; `hashSource` returns `byteLength` from the same buffer it hashed. |
| **R7-13** | 16 harness tools lived under `tmp/`, which is **gitignored** (`.gitignore:146`). Every closure record cites them by path — those citations were one `git clean` from dangling. | Relocated to `scripts/coach-completion-tools/`; all provenance citations repointed; new `_root.mjs` `assertRoot()` refuses with exit 4 unless the root carries the `docs/ai-workflow/AI-HANDOFF` marker. |

### R7-12 — RECORDED, NOT CLOSED

The rescue commit `53005a6da`'s `docs` subtree (`3659bf16a`) is **missing from the
shared object store**, so `preservation.json`'s provenance chain is currently
uncheckable. All 29 preserved artefacts are real on disk (1,247,081 bytes, 0 empty)
but were **untracked** — one `git clean` from loss.

**This commit is the remedy for the untracked half.** All 29 artefacts are now
tracked in `3aeda5ad4`, verified by
`git ls-tree -r HEAD …/preserved-r4-package/ | wc -l` → **29**.
The object-store half remains open: the provenance cannot be re-checked until the
object store is repaired or the provenance is re-established from a source that
still resolves. Do not treat R7-12 as closed.

---

## Verification performed

### Pre-commit
- All 28 deliverable files verified **byte-identical** to the original worktree
  `tmp/worktrees/swan-coach-astra-owned-20260906` before staging:
  `same=10 diff=0` across the gates and their suites.
- Staging: **90 files, all `A`**, zero stray nested paths.
- Gate suites in the isolated worktree: checkpoint **26/26**, manifest **14/14**,
  admission **24/24**, controller-preservation **13/13** = **77/77, 0 fail**.

### Post-commit
- `git cat-file -t HEAD` → `commit`; `HEAD^{tree}` → `292596b8e…` resolves.
- Commit carries **90** changed paths: **28** under `scripts/`, **62** under `docs/`.
- Working tree **clean** (`git status --porcelain` → 0).
- Gate suites re-run post-commit: **26 / 14 / 24 / 13 → 77/77, 0 fail**.

### Durability proof (the point of the exercise)
Cloned the branch into a **structurally independent repo** at `/c/tmp/r7-durability-check`.
The commit reconstructs there with all **90** files, and
`coach-completion-controller-preservation.mjs` hashes **`bb3a0306f8149f69`** — identical
to the source. The 29 preserved artefacts reconstruct (**29**).

### The sabotage event, observed live and survived
While this record was being written, the peer agent **deleted the worktree
registration again** (`ls .git/worktrees/_ss-pt-r7-closure` → *No such file or
directory*; `git status` → `fatal: not a git repository: (NULL)`).

**The commit was unaffected**, because the branch ref lives in the shared repo
(`SS-PT/.git/refs/heads/vs-claude/coach-completion-r7-closure-20260922`), not in the
worktree-private `.git/worktrees/<name>/`. Confirmed from the main repo:
`git rev-parse` → `3aeda5ad4…`, `git cat-file -t` → `commit`.

Registration was then recreated (`{HEAD, gitdir, commondir, ORIG_HEAD}`) and the
index rebuilt with `git read-tree HEAD`; `git status --porcelain` returned to **0**.

**Post-incident integrity sweep:** hashed all 90 files against the untouched
pre-incident clone →
**`identical=90  different=0  missing=0`**.

This is the empirical answer to *"make sure it is not lost"*: the work was subjected
to the exact fault it was being protected against, and came through byte-for-byte
intact.

---

## Caveat carried forward

`r702-real-probe.mjs` needs the gitignored
`tmp/coach-completion-20260921/workflow-state-v9.json`. A clean checkout therefore
exits **3 (INCOMPLETE)** by design, with an explanatory message — not a crash. With
the input supplied it reproduces
`CONTROL: declared predecessor -> v9 violations: 0 (expected 0)`.

---

## Remaining Review-7 findings (open)

- **R7-05 (MED)** — child deadline requests `kill()` but does not bound completion.
  Record `deadlineExpired` / `killRequested` / `closeObserved`. The test named
  "settles rather than hanging" exercises a cooperative child only.
- **R7-06 (second sentence)** — execute the C2 fresh/history/interruption matrix
  against the physical schema with synthetic data.
- **R7-07 (MED)** — peer state, production-model rollback, contention, mounted-router
  HTTP acceptance; remove the misleading `restartIdentity` / `cascade` on a hard DELETE.
- **R7-09 (MED)** — `01-architecture.md` is **306 lines** (the only remaining Rule 4
  overage); `07-checkpoints.md` contradicts itself; `coverage-mapping.json` is wrong;
  `09-tests.md` runs the vitest suite through Node.
