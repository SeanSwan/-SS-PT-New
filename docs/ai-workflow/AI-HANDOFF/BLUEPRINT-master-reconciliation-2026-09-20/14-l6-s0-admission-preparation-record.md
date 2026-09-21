# L6 S0 — admission-preparation record

**Slice under admission:** L6 `S0 — SALVAGE`
**Master slice:** M2 (`05-slices.md:20`) — *"admit one lane slice"*
**Build-queue position:** row 4 of `04-build-order.md` — *"L6 S0 closure only"*
**Nature:** the **admission-preparation record** Astra D3 requires (row 3's deliverable)
**Prepared:** 2026-09-21 against branch tip `144ca8c56`; index at `12-l6-s0-closure-admission-index.md`
**Companion:** `13-m0-status-correction-and-scope-coverage.md` (the M0 correction this record depends on)

**Status: PREPARED — awaiting the L6 checkpoint decision. Not admitted. Not `pending`-cleared.**

> Astra D3, verbatim: *"S0 passing tests without its checkpoint is not M2 completion."* This record
> exists so the checkpoint has something to decide **against**, and so that decision is made on
> bound bytes rather than on a description.

---

## 1. Selected source and complete scope

**Source of record: the ORPHANED tree** — `tmp/worktrees/brain-console-20260913/`.

Authority: **Astra round-3 ruling D1 = (a)**, and independently reproduced by measurement. The
recorded manifest's paths are identical to this tree's contents and all 83 of its hashes recompute
identically against it.

```bash
# from Astra D1: two directories plus four standalone files, plus two document globs
scripts/swan-brain-console/                       -> 17
frontend/src/pages/HomePage/three-worlds/         -> 62
frontend/qa-worlds.html                           ->  1
frontend/qa-worlds.tsx                            ->  1
frontend/tsconfig.three-worlds.json               ->  1
.github/workflows/three-worlds-fleet.yml          ->  1
docs/…/SWAN-BRAIN-CONSOLE-V3-*.md + ZCODE-HOSTILE-ROUND4-*.md -> 4
                                     filesystem scope = 83 · complete copy scope = 87
```

| Identity | Value |
|---|---|
| **Filesystem scope** | **83** files |
| **Complete copy scope** (incl. documents) | **87** files |
| Recorded manifest | `/tmp/S0-BEFORE.sha256` — 9,791 B, 83 lines |
| Manifest sha256 (content) | recomputed and byte-identical to the recorded copy, 83/83 |

**A1's `77` is a stale miscount.** The manifest has always held 83 filesystem entries, the two `*.md`
globs contribute 4 further documents, and no tree yields 77. `05-slices.md:88` already provides
*"77 **(or the recorded count)**"*, so **the recorded-count provision applies and no lane document
needs rewriting** (Astra D1a, A1-02).

**Frozen base commit** — pinned, per Astra's *"no moving `origin/main` reference in the receipt"*:

```
53f93854b3148b24c0dc2d2b6107b8e431237c87    2026-09-16 07:26:35 -0700
```

Resolved by `git rev-parse origin/main` at preparation time and independently confirmed as the
salvage worktree's HEAD. **This is the pinned value the receipt carries; `origin/main` is not cited as
authority because it moves.**

---

## 2. Stable preservation and destination identities

### 2.1 Preservation (M0) — **PARTIAL, and that is the honest state**

`13-m0-status-correction-and-scope-coverage.md` records this in full. Summary:

| Item | State |
|---|---|
| Rescue content — 212 entries across two copies | **SOUND.** 424 hashes re-verified by Astra, **zero mismatches** |
| `preservation-records.json` | **`provisional: true`, `unverified: true`** — not closed |
| Coverage of S0's complete scope | **INCOMPLETE** — the 4 standalone files and 4 documents appear in **no** inventory (Astra A1-03, reproduced) |
| Writer quiescence / stable reconciliation | **OPEN** (`VERIFICATION-NOTES.md:119–123`) |

**Consequence for this record:** M0 is **PARTIAL**, so S0's admission cannot rest on M0's completion.
The rescue is good; its label was wrong; its scope was short. Both are now recorded rather than
assumed — and neither is repaired by this document, because closing them is M0 work, not admission work.

### 2.2 Destination — proposed, and **not** the populated salvage worktree

Astra D1 requires a **new, unoccupied, registered worktree**; overwriting the populated salvage tree
is forbidden.

| | Value |
|---|---|
| **Existing registered tree (must NOT be overwritten)** | `tmp/worktrees/brain-console-salvage-20260918`, HEAD `53f93854b`, branch `swan-brain-console-v3-salvage-20260918` — holds **180**/186 |
| **Proposed S0 destination** | a **new** registered worktree at a path that does not yet exist, branched from the pinned base `53f93854b` |
| **Path selection** | **DELEGATED (Astra PART C: "new, unoccupied, registered worktree")** — deliberately not chosen here, because choosing it is the operator/owner action that creates the artifact |

The 180-vs-83 divergence is **not** an error in either tree. The registered tree holds **109**
console files and **67** three-worlds files against the orphaned tree's **17** and **62** — i.e. it
contains **later work**. Per **Astra D1b**, those additions are a **separate candidate to be evaluated
under their applicable later L6 slices**, and **must not be reconciled into a synthetic S0 revision.**

---

## 3. Exact dependency and test configuration

Astra D2 requires this recorded, and specifically warns that a *resolved* version satisfying a caret
range does **not** establish an identical dependency environment.

| Item | Orphaned (source) | Registered (existing dest) | Note |
|---|---|---|---|
| `@vitest/utils` requested | `^4.0.18` | `^4.0.18` | **not** proof of identity |
| `@vitest/utils` resolved | — | `4.0.18` | record the resolved value per checkout |
| Vitest runner reported | — | `v4.1.10` (A7 run) / `v4.0.18` (main checkout) | **runner versions differ between checkouts** |
| `three` / `@types/three` | separately declared | separately declared | Astra: same caveat applies |
| Node | `v22.22.2` | `v22.22.2` | observed |
| Lockfile | unchanged | unchanged | **install from this; never copy an installed `node_modules`** |

**Astra D2's mandatory steps for the A7 route:**

1. Create a **full registered checkout** at the captured, approved S0 base.
2. Copy **only** the frozen S0 scope into its original relative locations.
3. **Install dependencies from that checkout's unchanged lockfile** in a writable, authorized
   environment. **Do not copy the unreadable dependency tree.**
4. Record Node, package-manager, lockfile and resolved dependency identities.
5. Run **A6 and the entire A7 directory** from that checkout.
6. Record **every** collected case, failure, skip and import error.
7. Obtain the L6 checkpoint decision against **those exact bytes**.

**Astra explicitly notes:** *"An in-place ACL repair is unnecessary for this route."* The repair the
filer performed (below) is therefore **evidence that the environment could run A7**, not a substitute
for D2's steps. Astra's words: *"The recorded denial supports 'this environment cannot execute A7 with
these dependencies.' It does not establish 'no invocation or environment can ever execute it.'"*

### 3.1 What was measured, and by whom

| Criterion | Result | Where | By |
|---|---|---|---|
| **A1** | 83 fs / 87 complete; manifest readable, paths and hashes identical | orphaned tree | filer |
| **A2** | destination registered — `…salvage-20260918 53f93854b` | `git worktree list` | filer |
| **A3** | `diff BEFORE AFTER` **empty, exit 0**; all 83 hashes recomputed identical | both manifests | filer |
| **A4** | `git rev-parse HEAD` resolves in the destination | destination | filer — **proxy only, Astra A1-08 requires the direct `git status`** |
| **A5** | **67** untracked scope files, not gitignored, untracked in both trees | registered tree | filer |
| **A6** | `# tests 12 / # suites 2 / # pass 12 / # fail 0` (313.9 ms) | registered tree `53f93854b` | filer — **Astra D1c: MUST be rerun at the actual destination** |
| **A7** | `Test Files 4 passed (4)` / **`Tests 126 passed (126)`**, `19+17+62+28`, confirmed twice | registered tree, after ACL repair | filer — **Astra D2: rerun per §3** |
| **A8** | **vacuous** — S0's procedure contains no `git add` of any form | `05-slices.md:38-80` | filer |

**Observation times.** Astra requires them. All A1–A8 measurements above were taken
**2026-09-21, between 09:27 and 11:00 PDT**, against `53f93854b` for A6/A7 and the orphaned tree for
A1/A3. **They are one session's observations, not a stable-capture series** — which is precisely why
M0's designation is `PARTIAL`.

**Three stale expectations in this lane's own documents**, recorded rather than silently re-based:
A1's `77` (real: 83/87), A7's `Tests 66 passed` (real: 126), and A7's implied two-file suite (real:
four files, only two of which exist in the orphaned tree).

---

## 4. Applicable reviewer order, final authority and budget

Per L6 `07-checkpoints.md:53-62`, reused verbatim — **this record invents no chain**:

```
builder
  → Gemini (review)
    → Codex (HOSTILE review — MANDATORY INPUT, advisory only)
      → FABLE = FINAL DECIDER + COMMIT GATE   (fallback: next best Claude model)
```

- **Codex's verdict is advisory to Fable, never the gate itself.**
- **Budget:** Fable is **metered** — `07-checkpoints.md:65` requires **asking Sean before spending**.
  Free-first ladder (Rule 16) applies before any paid seat: GLM / ZCode are $0 marginal on the Z.ai plan.
- **Route:** Fable via `SWAN_FUSION_JUDGE_MODEL`, **not** by editing a committed policy file.
- Astra's own ruling is **Astra**, not Fable: it is decision authority for this dispatch, and it
  **does not substitute** for the L6 checkpoint.
- **Astra PART C:** *"Paid review — no new authorization."*

---

## 5. Filed reviews and final admission

| Item | State |
|---|---|
| Astra round-3 ruling (decision authority for D1–D5) | **FILED** — `Z:\HostileReviews\2026-09-21-104633-master-reconciliation-astra-round-3-decision.md`, indexed; round 2 reads as superseded |
| Astra round 1 / round 2 | filed, `DEFECTS-FOUND`, round 2 superseded by round 3 |
| L6 S0 **checkpoint** | **PENDING** — `07-checkpoints.md:87` |
| **Final admission** | **NOT GRANTED** — and not grantable by the builder |

**Explicitly not claimed:** no lane is admitted by Astra's dispatch (*"No lane is demonstrated admitted
by this dispatch"*), and this record does not admit S0 either. It prepares the decision.

---

## 6. Open items this record does NOT close

Named here so the checkpoint treats them as live, not as resolved by preparation:

1. **A4's direct command** — run `git status --short` in the destination; the `rev-parse` reading is a
   proxy (Astra A1-08).
2. **A5 before staging, then a committed clean state** — two **distinct** observations, both retained
   (Astra A1-08).
3. **A6 rerun at the actual destination** (Astra D1c) — the 12/12 above is historical evidence for its
   tested location and bytes.
4. **A7 per D2's seven steps** — from a complete checkout built off the unchanged lockfile.
5. **A8's action transcript** — retain the staging command transcript *and* verify the staged path set;
   do not infer history from the final set (Astra A1-09).
6. **M0's two gaps** — the provisional/unverified record, and the missing coverage of the 4 standalone
   files and 4 documents.
7. **The destination-completeness question** — A3 compares BEFORE-vs-AFTER on the **same 83 paths**, so
   it does **not** prove the destination received the source's newer 67/65 sets. This is the genuine
   remaining gap, and it is not an acceptance-criterion failure.
8. **Carried structural findings, still OPEN:** R2-06 / R2-08 / R2-10 checker defects. Astra A1-05 is
   explicit that the round-3 mutation runs **do not** close them, because the checker hashes evidence
   without interpreting its asserted meaning.

---

## 7. Freeze statement

**No product code changed. No lane document was edited. No file was moved. No review was filed by this
document.** The only filesystem changes this workstream made were `icacls` ACL repairs on files it
could not read — recorded in §3.1 and in `12-l6-s0-closure-admission-index.md`, and reversible in
principle. They changed *access*, not *content*; A3's 83 recomputed hashes are the proof.

**S0 remains `pending`.** This record is what the checkpoint decides against.
