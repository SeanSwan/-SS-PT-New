# Backend Orphan Inventory — 2026-07-28

- **Linear:** SWA-71 · **Scope:** `backend/services/**` and `backend/controllers/**`
- **19 candidates classified. ZERO deleted.** Everything here is Rule 77 Tier 2 — evidence and a proposal.
- Mirrors the frontend orphan inventory (SWA-75, 236 candidates, zero deleted). Same discipline, other half of the codebase.

---

## Method — and the correction that made it trustworthy

An earlier route sweep in this same session produced **22 confident false positives** because its
grep matched only single-quoted import paths. This codebase mixes `from './x.mjs'` and
`from "./x.mjs"` freely. That one gap also caused an entirely imaginary "production bug" to be
chased and half-fixed before hostile review caught it.

This sweep therefore:

1. Builds **one index** of every imported basename across all `.mjs`/`.cjs`, matching **both quote
   styles** and both `from '…'` and `import('…')` forms — 1,228 distinct basenames.
2. Diffs the service/controller file list against that index.
3. **Re-checks every survivor with a broad bare-name grep**, because a file can be referenced
   without its extension, through a barrel, or by a dynamically built path.
4. Classifies by *what kind* of reference exists — an import, a test, or only prose.

Step 3 is what separates "no import" from "genuinely unreferenced", and step 4 is what stops a
comment mention from being mistaken for a live dependency.

## Classification

### A. NOT orphans — excluded (2)
`services/adminSpecial.test.mjs`, `services/conflictService.test.mjs` — test files are their own
entry points. A test runner invokes them; nothing should import them. Flagging these would be a
method error, not a finding.

### B. COMMENT-REF-ONLY — referenced in prose, never imported (1)

| File | Lines | Evidence |
|---|---|---|
| `services/payment/PaymentService.mjs` | 549 | Three sibling strategies mention it **only inside JSDoc** ("Returns strategy metadata for PaymentService"). No import anywhere. |

**Why this one deserves attention:** 549 lines of payment code that nothing calls, while three
active strategy files carry comments implying they report to it. A reader — human or agent —
inspecting `ManualPaymentStrategy` will reasonably conclude `PaymentService` orchestrates it. It
does not. That is the same prose-vs-code defect found repeatedly this session, in a money path.

### C. TEST-REF-ONLY — a test reads the source, but no runtime code imports it (5)

| File | Lines |
|---|---|
| `controllers/sessionController.mjs` | **1335** |
| `controllers/adminController.mjs` | 139 |
| `controllers/adminBadgeController.mjs` | 86 |
| `controllers/progressSyncController.mjs` | 36 |
| `services/gamification/GamificationLeaderboardService.mjs` | 81 |

These are referenced by tests that `read()` the file and assert on its **source text** — a pattern
used elsewhere in this repo. So a test guards a file no route reaches.

**This is the trap worth naming.** A green test on unreachable code reads as coverage. It is not.
Deleting the file breaks the test, which makes the file *look* load-bearing — the test is defending
a corpse. `sessionController.mjs` is 1,335 lines in this category.

### D. NO-REFERENCE — nothing mentions them anywhere (11)

| File | Lines |
|---|---|
| `services/ai/MasterPromptModelManager.mjs` | 842 |
| `controllers/renewalAlertController.mjs` | 275 |
| `controllers/sessionSyncController.mjs` | 269 |
| `controllers/clientProfileController.mjs` | 179 |
| `services/gamification/GamificationStreakService.mjs` | 139 |
| `services/workoutPlanAiPdfAttachmentService.mjs` | 128 |
| `controllers/workoutSessionController.mjs` | 124 |
| `services/recraftService.mjs` | 105 |
| `services/schedual.mjs` | 82 |
| `controllers/sessionPackageController.mjs` | 75 |
| `controllers/adminReportsController.mjs` | 75 |
| `services/mockCheckoutService.mjs` | 58 |
| `services/ai/modelSelector.mjs` | 47 |

**`MasterPromptModelManager.mjs` is independently confirmed dead.** Earlier this session it was
found to have **three broken import paths** (`../../../utils/…` and `../EthicalAIReview.mjs` both
resolve to nothing), so it cannot be loaded at all. Zero importers and unloadable — the strongest
evidence in this list.

**`services/schedual.mjs`** is a misspelling of "schedule". A typo'd filename with zero references
is almost certainly an abandoned first attempt whose corrected twin took over.

**`services/mockCheckoutService.mjs`** — a mock in the payment area with no importer. Mocks that
outlive their use are a live-code hazard: the next person may wire one up by accident.

---

## Proposal (NOT executed)

1. **Do nothing before launch.** None of this is a bug; it is weight. Deleting ~3,900 lines of
   backend code during a launch is the drive-by this discipline exists to prevent.
2. **Category D first** — nothing references them, so removal is lowest-risk. Start with
   `MasterPromptModelManager.mjs` (already proven unloadable) and `schedual.mjs` (typo'd twin).
3. **Category C requires a decision per file**, not a bulk delete: either the file is wanted and
   should be wired up, or it is dead and **the test goes with it**. Retaining a source-reading test
   over unreachable code is worse than deleting both — it manufactures the appearance of coverage.
4. **Category B is a documentation fix, not a deletion.** Either wire `PaymentService` in, or
   correct the three strategy JSDoc comments that imply it orchestrates them. A money-path file
   whose comments lie about its role is a trap for the next reader.
5. Quarantine per Rule 77 to `archive/pending-deletion/<date>/<original/path>` with a `MANIFEST.md`
   — never delete outright, and never move without Sean's approval.

## Caveats on this inventory

- **Dynamically constructed paths are not fully provable by grep.** Step 3's bare-name check covers
  the realistic cases, but a path assembled from fragments at runtime could evade it. Treat this as
  high-confidence, not proof.
- `.test.mjs` files were deliberately excluded as entry points.
- Line counts are file size, not complexity — a 1,335-line orphan and a 47-line orphan carry very
  different removal risk.
