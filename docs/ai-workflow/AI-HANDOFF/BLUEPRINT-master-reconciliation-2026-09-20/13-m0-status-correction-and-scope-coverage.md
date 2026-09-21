# M0 status correction — COMPLETE → PARTIAL, and the two coverage gaps it exposes

**Authority:** Astra round-3 decision ruling, findings `A1-01` and `A1-03`
(`Z:\HostileReviews\2026-09-21-104633-master-reconciliation-astra-round-3-decision.md`)
**Filed:** 2026-09-21, against HEAD `c1f91616d`
**Nature:** a **status correction**, not a slice rewrite. Per Astra D1a, no lane document changes.

---

## 1. The correction

**M0 was reported `COMPLETE`. It is `PARTIAL`.** This is a claim about a label, not about the
rescue: the rescue itself is sound and is preserved unchanged.

The package's own M0 exit condition is *"preservation records satisfy MR-01"* (`05-slices.md:5`).
The shipped record contradicts it:

```
evidence/r0001/preservation-records.json:3-4
  "provisional": true,
  "unverified": true,
```

A record that declares itself provisional and unverified cannot satisfy the exit condition that
depends on it. `05-slices.md:8` also names the recovery path for exactly this case: *"retain all
candidates and repeat stable capture after resolving the gap."* That is the state M0 is in.

**What is preserved and must not be disturbed:** the rescue's **424 preserved file hashes across two
copies, zero mismatches** — independently re-hashed by Astra this round and previously by the filer.
The content is good. Only the completion label was wrong.

### Ledger, corrected

| Slice | Before | After | Basis |
|---|---|---|---|
| M0 | ✅ COMPLETE | **🟡 PARTIAL** | `preservation-records.json:3-4` still provisional + unverified |
| M1 | ✅ COMPLETE | ✅ COMPLETE | unchanged; verified end-to-end 2026-09-21 |
| M2 | ⏳ blocked | **⏳ blocked on L6 S0's checkpoint** | see §3 — the acceptance criteria now pass; the *checkpoint* is what remains |
| M3 | ⬜ | ⬜ | unchanged |

---

## 2. Coverage gap A1-03 — the rescue does not cover S0's whole scope

M0's five inventories cover **the two directory candidates and one QA-baseline README**:

| Inventory | Files |
|---|---|
| `S-L6-ORPHANED-console` | 17 |
| `S-L6-ORPHANED-three-worlds` | 62 |
| `S-L6-REGISTERED-console` | 65 |
| `S-L6-REGISTERED-qa-baseline` | 1 |
| `S-L6-REGISTERED-three-worlds` | 67 |
| **Total** | **212** |

But S0's scope (`L6/05-slices.md:23–31`) is **two directories plus four standalone files plus two
document globs**:

```
scripts/swan-brain-console/                          -> 17
frontend/src/pages/HomePage/three-worlds/            -> 62
frontend/qa-worlds.html                              ->  1  NOT INVENTORIED
frontend/qa-worlds.tsx                               ->  1  NOT INVENTORIED
frontend/tsconfig.three-worlds.json                  ->  1  NOT INVENTORIED
.github/workflows/three-worlds-fleet.yml             ->  1  NOT INVENTORIED
docs/…/SWAN-BRAIN-CONSOLE-V3-*.md                    ->  4  NOT INVENTORIED
docs/…/ZCODE-HOSTILE-ROUND4-*.md                     ->     (included in 4)
```

**Reproduced by the filer, not accepted on assertion.** Grepping all five inventories for
`qa-worlds`, `tsconfig.three-worlds`, `three-worlds-fleet`, `SWAN-BRAIN-CONSOLE-V3` and
`ZCODE-HOSTILE-ROUND4` returns **no match in any inventory**. The four standalone files and the four
documents appear in **none** of them.

So the two scopes are:

- **Directories only (what M0 rescued):** `17 + 62 = 79` orphaned
- **Complete S0 copy scope:** `17 + 62 + 4 + 4 = 87` orphaned

Astra's decomposition, independently reproduced: `17 + 62 + 4 = **83**` filesystem files, plus four
documents = **87**. Note the arithmetic the original remit got wrong — the scope is **two directories
plus four standalone files**, not six standalone files.

**This is also the resolution of A1's `77`.** The recorded manifest is **83** filesystem files
(measured: both `/tmp/S0-BEFORE.sha256` and `/tmp/S0-AFTER.sha256` read 9,791 bytes / 83 lines after
their own ACL repair, their 83 paths are identical to the orphaned tree's contents, and all 83 hashes
recompute identically). `77` is stale; `83` is the filesystem scope; **87** is the complete copy scope
including documents.

### The registered candidate, same decomposition — every one of Astra's numbers reproduced

| Component | Astra's figure | Filer's measurement | Agree |
|---|---|---|---|
| `scripts/swan-brain-console/` | 109 | **109** | ✓ |
| `three-worlds/` | 67 | **67** | ✓ |
| standalone files | 4 | **4** | ✓ |
| **filesystem scope** | **180** | **180** | ✓ |
| documents | 6 | **6** | ✓ |
| **complete copy scope** | **186** | **186** | ✓ |

Reproduced on `tmp/worktrees/brain-console-salvage-20260918` (HEAD `53f93854b`) with S0's own scope
arguments. **Astra's decomposition is exact, and it is the basis for the M0 coverage gap above.**

---

## 3. What M2 now waits on, stated precisely

Astra D3: *"S0 passing tests without its checkpoint is not M2 completion."* The index's A1–A8
criteria are now **all measured PASS** (see `12-l6-s0-closure-admission-index.md`), but

- Row 3's deliverable is an **admission-preparation record**, not another implementation slice, and
- the record must carry: selected source and complete scope · stable preservation and destination
  identities · exact dependency and test configuration · A1–A8 evidence **with observation times** ·
  applicable reviewer order, final authority and budget · filed reviews and final admission.

The existing `12-l6-s0-closure-admission-index.md` is that entry point. It now needs completion, not
replacement.

---

## 4. What this document does NOT do

- **No lane document is edited.** `L6/05-slices.md:88` already provides *"77 (or the recorded count)"*,
  so the recorded-count provision applies without a rewrite (Astra D1a).
- **No candidate is reconciled into a synthetic S0 revision** — forbidden (D1b). The registered tree's
  additions remain a separate candidate for their own later slices.
- **No rescue record is altered.** The 212 entries stand; this adds coverage, it does not revise it.
- **No review is claimed as filed by Astra.** Astra's session was read-only; the filing is the
  filer's and is recorded as such.
