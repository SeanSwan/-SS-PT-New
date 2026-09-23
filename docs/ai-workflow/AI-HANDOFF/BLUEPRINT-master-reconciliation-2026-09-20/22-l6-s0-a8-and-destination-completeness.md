# 22 — L6 S0: A8 measured, and the destination-completeness question answered by measurement

**Date:** 2026-09-21, 20:00–20:35 PDT
**Repo:** `C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT`
**Branch (this record's commits):** `creator-brains-engine-r2-20260915`
**Build-queue position:** row 4 of `04-build-order.md` — *"L6 S0 closure only"*
**Predecessor:** `12-l6-s0-closure-admission-index.md`
**Scope:** this record closes the **two builder-actionable items** named in record 12 §5. It does
**not** alter S0's `pending` status, which is operator-owned (§5).

---

## 0. Summary

Record 12 §5 left two builder-actionable items and one narrowed operator question. Both builder
items are now **done and measured**:

| Record 12 §5 item | Result |
|---|---|
| 1. **A8** — stage the 83 manifest paths by explicit path; confirm the staged set matches | **PASS.** Exactly **83** staged; staged set **== manifest set exactly** (by path, not merely by count); **0** index-vs-disk mismatches |
| 2. **Destination-completeness** — verify the salvage worktree holds the fuller sets, since A3 does not cover this | **MEASURED — and it finds real divergence.** 14 of the 83 scope paths have content in the destination that does **not** match the S0 manifest, while the **source matches all 83** |

Item 2 is not a formality. It is the gap record 12 correctly said A3 **cannot** see, and measuring
it produced the first hard numbers on it — including one file that got **smaller**
(`app.css`), which is the only shape in this set that warrants a look rather than an assumption.

---

## 1. A8 — measured, not vacuous, on the destination

Record 12 §3.1 recorded A8 as **PASS vacuously**, because S0's own procedure moves files with
`cp -r` and never stages anything. That reading was correct *of the procedure*. It is not the
reading that matters, because record 12 §3.1 also notes A8 *"is retained because it is a real rule
for the **commit step**"*.

A8 is therefore measured **where it has teeth** — at the commit step, on the destination.

**Setup.** The salvage worktree, HEAD `53f93854b`, branch `swan-brain-console-v3-salvage-20260918`.
A **scratch index** was used throughout (`C:/tmp/idx-a8b`) so the worktree's real index was never
disturbed. This is the same discipline as §9/§10 of record 20: measure without mutating.

```
GIT_INDEX_FILE=C:/tmp/idx-a8b
git read-tree HEAD                                   # seed: exit 0, tree readable (15,158 entries)
git add --pathspec-from-file=C:/tmp/a8-paths.txt     # the 83 paths, explicit, from the manifest
git diff --cached --name-only | wc -l                # -> 83
```

**The path list was derived from the manifest, not written by hand** — 83 lines, one per manifest
entry, so it cannot silently drift from A1/A3. No glob, no `git add -A`, no `git add .`.

| Check | Result |
|---|---|
| Paths staged | **83** |
| `diff manifest-paths staged-paths` | **exact match** |
| Index blob vs on-disk file, per path | **0 mismatches** |
| `git add -A` / `git add .` used | **no** — `--pathspec-from-file` only |

**A8: PASS, and non-vacuously so at the commit step.**

### 1.1 One probe defect of my own, caught and corrected

My first attempt seeded the scratch index **empty**, so `git diff --cached` compared the whole
working tree against nothing and reported **15,241** staged paths. That number is meaningless —
it is the entire tree, not an A8 measurement. The correct seed was `read-tree HEAD`, which yields
the true **83**.

Recorded because it is the same class of error as record 20 §1.1 and §9.1: a probe that produces a
confident number which does not measure the thing it claims to. The first figure was discarded, not
reported.

---

## 2. Manifest integrity — re-confirmed from the live source

Record 12 §4.1 established A1/A3 by recomputing all 83 hashes. That is re-verified here,
independently and against the live tree:

| Measurement | Result |
|---|---|
| `wc -l` on `/tmp/S0-BEFORE.sha256` and `S0-AFTER.sha256` | **83** and **83** |
| `diff BEFORE AFTER` | **empty, exit 0** → A3 PASS |
| Path set, BEFORE vs AFTER | **identical** |
| All 83 SHA-256 values recomputed from the **live orphaned source** | **83 verified, 0 mismatches, 0 missing** |

So the blueprint's `77` is confirmed a stale miscount; the real manifest has always been **83**.
**No tree yields 77.**

---

## 3. The destination-completeness question — MEASURED

Record 12 §5 asked whether the registered salvage worktree actually holds the fuller sets, noting
that **A3 cannot cover this** because BEFORE and AFTER list the same 83 paths. Measured now.

### 3.1 Scope-path presence

| Tree | Registration | HEAD | of the 83 scope paths present |
|---|---|---|---|
| `brain-console-20260913` (declared source, orphaned) | **none** | git link DEAD | **83** |
| `brain-console-salvage-20260918` (destination) | registered | `53f93854b` | **83** |

Both trees hold all 83. **Tracked status:** **0 tracked / 83 untracked** in the destination — which
reproduces record 12 §4.4 exactly, and independently: the three-worlds tree exists as loose files
only, in every checkout.

### 3.2 Content divergence — the new finding

Comparing each of the 83 files' **raw SHA-256** against the manifest, per tree:

| Tree | Matches manifest | Diverges |
|---|---|---|
| Source `brain-console-20260913` | **83** | **0** |
| Destination `salvage-20260918` | **69** | **14** |

**All 14 divergences resolve the same way: the source matches the manifest, the destination does
not.** No file was "not in source", and no file was "manifest stale". The classification is
unambiguous.

| # | Path | Source bytes | Dest bytes | Δ |
|---|---|---|---|---|
| 1 | `.github/workflows/three-worlds-fleet.yml` | 5,186 | 7,310 | + |
| 2 | `…/three-worlds/__tests__/runtime.contract.test.ts` | 21,766 | 23,793 | + |
| 3 | `…/three-worlds/renderSlots.ts` | 3,113 | 5,132 | + |
| 4 | `…/three-worlds/scenes/familiesA.ts` | 7,487 | 7,981 | + |
| 5 | `scripts/swan-brain-console/app/app.css` | 11,056 | **9,109** | **−** |
| 6 | `scripts/swan-brain-console/app/app.js` | 10,612 | 13,316 | + |
| 7 | `scripts/swan-brain-console/app/index.html` | 11,251 | 16,345 | + |
| 8 | `scripts/swan-brain-console/console-verify.mjs` | 8,374 | 14,498 | + |
| 9 | `scripts/swan-brain-console/doctrine.mjs` | 4,585 | 6,360 | + |
| 10 | `scripts/swan-brain-console/fleetData.mjs` | 4,660 | 7,334 | + |
| 11 | `scripts/swan-brain-console/gallery-verify.mjs` | 28,147 | 30,320 | + |
| 12 | `scripts/swan-brain-console/server-contract.test.mjs` | 4,387 | 6,485 | + |
| 13 | `scripts/swan-brain-console/server.mjs` | 7,575 | **14,511** | + |
| 14 | `scripts/swan-brain-console/verify-all.mjs` | 7,073 | 14,198 | + |

**13 of 14 are larger in the destination.** mtime confirms direction: `server.mjs` source is
2026-09-19 16:09 and destination 2026-09-20 17:12; `doctrine.mjs` 2026-09-12 23:57 vs 2026-09-20
04:02.

**Interpretation, stated as measurement then inference, separately:**

- **Measured:** the destination holds content for 14 scope paths that differs from the manifest,
  and the source does not.
- **Inferred (not measured):** this is *newer development in the destination*, consistent with
  record 12 §4.2's statement that 6 files were added to the console after Sep 19. The size and
  mtime evidence supports it; no source-level diff has been done to prove *what* changed.
- **Flagged, not assumed:** `app.css` is the **one file that shrank** (11,056 → 9,109). Every
  other divergence is growth, which reads as accretion. A shrink is a different shape and could be
  a legitimate rewrite, a minification, or a truncation. **It has not been examined**, and it
  should be before S0 closes.

### 3.3 What this means for A3

**A3 remains PASS** — it asks BEFORE-vs-AFTER byte-identity, both of which describe the *source*,
and both are confirmed. §3.2 does not contradict A3.

What §3.2 establishes is that **A3's guarantee is narrower than "nothing was stranded"**. A3
proves the manifest faithfully describes the source. It cannot and does not say the destination's
newer content was preserved. That content is **loose and untracked** (0 tracked, per §3.1), which
is precisely the exposure S0 exists to close.

---

## 4. Standing state after this record

| Criterion | Status |
|---|---|
| A1 source manifest exists/non-empty | **PASS** — 83 (blueprint's 77 is a miscount) |
| A2 destination registered worktree | **PASS** |
| A3 every file byte-identical (source) | **PASS** — verified two ways |
| A4 git can read destination | **PASS** |
| A5 scope untracked but visible | **PASS** — 67 three-worlds entries |
| A6 engine guard | **PASS** — 12/12 |
| A7 fleet + runtime suites | **PASS** — 126/126 |
| A8 no `git add -A`, explicit paths | **PASS — now measured at the commit step, not vacuous (§1)** |

**Seven of eight measured this session or re-verified; A8's vacuity resolved.** The substantive
set A2–A7 is unchanged and still passing.

---

## 5. What remains, and who owns it

**Builder-actionable: nothing further on A1–A8.** Both items record 12 §5 named are discharged
above. The staging recorded in §1 was performed in a **scratch index and left uncommitted** — this
record does not stage anything into the worktree's real index, and does not commit in the salvage
worktree. S0 declares **no source edits**, and none were made.

**Operator decisions, narrowed again:**

> Both builder items from record 12 §5 are now closed. What remains is a single question, and it is
> smaller than record 12's version of it:
> **the destination `brain-console-salvage-20260918` holds newer, untracked content for 14 of the
> 83 scope paths (13 larger, `app.css` smaller) that A3 provably cannot see. Does that content get
> its own preservation record before S0 closes — and does `app.css` get looked at first?**

**Point of order, per `00-README.md:20`:** this record reports a conflict/gap; it does not resolve
it. No lane package was edited. No review was filed. No file was moved.

---

## 6. Restraint

Nothing in this record modified product code, a lane package, or a worktree index. All staging was
done in `C:/tmp/idx-a8b`. The only writes are this document and the commit that carries it.

The one figure I discarded (15,241, §1.1) is recorded rather than quietly dropped, because a
hidden retracted number is worse than a visible one.

A8's earlier "vacuously PASS" is upgraded here to a measured PASS **only for the commit step**.
As a description of S0's `cp -r` procedure, the vacuity finding stands unchanged.
