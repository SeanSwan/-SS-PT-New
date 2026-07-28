# Document Quality & Completeness — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 90.3s
> **Files:** docs/ai-workflow/AI-HANDOFF/NUTRITION-DECISION-LOGGER-FABLE-READY-BRIEF-2026-07-09.md
> **Generated:** 7/8/2026, 8:17:40 PM

---

# QA Report: NUTRITION-DECISION-LOGGER-FABLE-READY-BRIEF-2026-07-09.md

**Reviewer Role:** Technical Documentation Quality Reviewer
**Platform:** SwanStudios (sswanstudios.com)
**Review Date:** 2026-07-09
**Document Type:** Planning & Audit Packet (Pre-Implementation)

---

## Executive Summary

This is a substantively strong planning document with genuine repo-grounded evidence, honest scope boundaries, and a coherent product vision. However, it contains several documentation quality failures that would create ambiguity during implementation, sprint planning, and Fable review. The document reads as a hybrid of audit receipt, architecture proposal, and sprint brief — which is useful for context but creates structural problems for actionability. Several findings below are **CRITICAL** not because the plan is wrong, but because the documentation gaps could cause a developer or AI agent to make incorrect assumptions during implementation.

---

## 1. Methodology

### Finding 1.1 — No Direct Repo Access Is Disclosed But Not Consistently Applied
**Rating: HIGH**

The document correctly states in the header:

> *"the audit explicitly had no direct repo access. This brief separates repo-proven facts from external recommendations."*

However, this separation is not consistently maintained throughout the document. The "Canonical Surface Receipt" section presents line-number citations (e.g., `main-routes.tsx:708`, `FoodIntakeForm.tsx:163-169`) with the same confidence level as verified facts, but these were sourced from an attachment (`pasted-text.txt`) rather than live repo inspection. There is no systematic marker (e.g., a `[ATTACHMENT]` tag vs. `[LIVE REPO]` tag) distinguishing attachment-sourced citations from independently verified ones.

**What should have been done differently:**
- Every line-number citation should carry a provenance tag: `[source: attachment/pasted-text.txt]` or `[source: live grep]`.
- A methodology table should appear at the top of the Canonical Surface Receipt section stating: "All citations in this section are derived from the attached paste. Line numbers are accurate as of the attachment snapshot date and must be re-verified before implementation begins."
- The document should explicitly state whether the attachment was a full file dump, a partial grep output, or a curated paste — this affects how much trust to place in completeness of the citation set.

---

### Finding 1.2 — External Reference Validation Is Incomplete and Asymmetric
**Rating: MEDIUM**

The document refreshes FDA, USDA, Open Food Facts, and Google ML Kit references and provides source URLs. However:

- GS1 Sunrise 2027 and local-food directory claims are flagged as needing refresh, but no placeholder or tracking ticket is assigned.
- The Mobbin design reference is noted as unavailable, but no alternative design validation method is proposed (e.g., competitor audit, existing SwanStudios design system review).
- The external reference section does not state when the provided URLs were last accessed or whether the API versions cited are current.

**What should have been done differently:**
- GS1 and local-food gaps should have a named owner and a "block implementation of Slice 7 until resolved" note.
- The Mobbin gap should either be closed with an alternative or explicitly scoped out of this document's design direction claims.

---

### Finding 1.3 — No Regression Baseline Is Established
**Rating: HIGH**

The document identifies current behavior (e.g., scanner posts `servingSizeGrams: 100`, manual logger captures only four macros) but does not document what the current system's actual user-facing behavior is in a testable form. There is no:

- Screenshot or recorded behavior baseline for `NutritionWorkspace` as it exists today.
- List of currently passing tests for the nutrition surface.
- Known bug inventory for the existing surface.

This means "no regression" acceptance criteria in Slice 1 and Slice 2 have no documented baseline to regress against.

**What should have been done differently:**
- A "Current State Baseline" section should list: current tab count in NutritionWorkspace, current fields captured by FoodIntakeForm, current scanner save behavior, and any known existing bugs. Even a bulleted prose description would be sufficient.

---

## 2. Evidence Quality

### Finding 2.1 — Line-Number Citations Are Specific But Unverified
**Rating: HIGH**

The document's greatest strength is its specificity — citing `FoodScannerPage.tsx:472-475`, `DailyMacroLog.mjs:24-180`, `routes.mjs:632-634` etc. This is far above average for a planning document. However, the evidence quality is undermined by:

1. **No confirmation that the attachment was current.** The attachment filename contains no date. If the paste was taken from a branch, a stale local copy, or a pre-merge state, every line number could be offset.
2. **No cross-reference validation.** For example, the document states `FoodIntakeForm.tsx:4` documents manual `/api/macros` logging, and separately that `FoodIntakeForm.logic.ts:4-11` stores only six fields. These appear to be two different files (`FoodIntakeForm.tsx` vs `FoodIntakeForm.logic.ts`), but the relationship between them is never explained. A reviewer cannot tell if this is a component/logic split, a duplicate, or an error.
3. **The dormant scanner ambiguity is noted but not resolved.** `components/FoodTracker/BarcodeScanner.tsx` is flagged as "dormant/ambiguous" with "current grep found no JSX mount." This is honest, but the document does not state whether a grep was run on the attachment text or on a live repo. The distinction matters for how much confidence to place in the "dormant" classification.

**What should have been done differently:**
- Add a "Citation Confidence" column to the Surface Classification table: `HIGH (live-verified)`, `MEDIUM (attachment-sourced, plausible)`, `LOW (inferred)`.
- Clarify the `FoodIntakeForm.tsx` vs `FoodIntakeForm.logic.ts` relationship explicitly.
- State the grep methodology for the dormant scanner finding.

---

### Finding 2.2 — Schema Drift Finding Is Well-Evidenced
**Rating: LOW (positive note)**

Gap 8 (schema drift in scanner admin edit) is one of the best-evidenced findings in the document:

> *"`foodScannerRoutes.mjs:375-376` updates `nutritionFacts`, `healthScore`, and `allergens`, while `FoodProduct.mjs:50/:55` uses `nutritionalInfo` and `overallRating` and has no first-class `allergens` field."*

This is a specific, falsifiable, actionable claim with dual-file evidence. This is the standard all other gap findings should meet. Several other gaps (1, 3, 9, 10) are stated as architectural observations without equivalent file-level evidence.

---

### Finding 2.3 — Gap 4 (USDA Key Exposure) Is Asserted Without Direct Evidence of Actual Key Presence
**Rating: MEDIUM**

Gap 4 states:

> *"`FoodSearchPanel.logic.ts:148` fetches the external API from the browser. USDA states API keys must not be publicly exposed."*

This correctly identifies a structural risk, but the document does not state whether an actual USDA API key is currently present in the frontend code, or whether the call is keyless/using a public endpoint. The severity of this gap is very different depending on whether:

- (a) A real API key is currently exposed in browser code — **CRITICAL security issue requiring immediate action.**
- (b) The call is made without a key to a public endpoint — **architectural smell but not an active security breach.**

The document treats this as a planning concern when it may be a production security incident.

**What should have been done differently:**
- This finding should have been escalated with a direct question: "Does `FoodSearchPanel.logic.ts` currently contain or reference a USDA API key? If yes, this is a CRITICAL security finding requiring immediate remediation outside the slice plan."

---

### Finding 2.4 — `NutritionEntryDraft` TypeScript Contract Is Presented Without Validation
**Rating: MEDIUM**

The `NutritionEntryDraft` type is the centerpiece of the architecture proposal. It is presented as a complete contract, but:

- `nutrientsReported` and `nutrientsCalculated` are typed as `Record<string, number | null>`. This is extremely loose. There is no documentation of what keys are expected, whether they must match `DailyMacroLog` field names, or how unknown keys are handled.
- `items: Array<Record<string, unknown>>` is a typed escape hatch with no documented schema. This will cause implementation divergence across slices.
- `rawPayloadRef?: string` is optional with no documentation of what it references (a database ID? a file path? a hash?).
- There is no versioning on this contract. If Slice 2 ships and Slice 4 changes the schema, there is no migration path documented for existing draft objects.

**What should have been done differently:**
- Add an inline comment block to the TypeScript type explaining each field's purpose, valid values, and relationship to `DailyMacroLog` fields.
- Define the expected nutrient keys explicitly or reference the `DailyMacroLog` field list as the canonical key set.
- Document `rawPayloadRef` as a specific reference type.
- Add a contract version field: `contractVersion: '1.0'`.

---

## 3. Bias Detection

### Finding 3.1 — Document Is Optimistically Scoped Toward the New System
**Rating: MEDIUM**

The document is well-balanced in acknowledging what exists and what is missing. However, there is a consistent framing bias toward the proposed system being the right answer, with insufficient critical examination of:

- **Why the current fragmentation exists.** The document treats tab sprawl and separate routes as pure technical debt, but does not consider whether the separation was intentional (e.g., `/food-scanner` as a separate route may have been a deliberate PWA/camera-permission isolation decision).
- **Migration risk for existing users.** The document does not address what happens to existing `DailyMacroLog` entries that were saved with the current minimal field set. Phase A says "no migration," but existing entries will have null values for all the new fields. The document does not state how the UI should handle these legacy entries.
- **The complexity cost of the North Star system.** The `NutritionEntryDraft` contract has 17 fields before `items` and `rawPayloadRef`. The document acknowledges UX complexity risk in the design directions section but does not apply the same scrutiny to the data contract complexity.

---

### Finding 3.2 — The "What Not To Do Yet" Section Is Appropriately Conservative
**Rating: LOW (positive note)**

The explicit prohibition list is a strong bias-correction mechanism. Statements like "Do not treat AI/photo/voice estimates as verified" and "Do not broaden into unrelated dashboard redesign work" show awareness of scope creep risk. This section should be expanded, not contracted.

---

### Finding 3.3 — Free AI Village Review Prompt Contains an Undisclosed Constraint
**Rating: MEDIUM**

The Free AI Village Review Prompt instructs the reviewer:

> *"Use only file-line evidence from the packet or ask for more evidence."*

This is a reasonable constraint, but it is not disclosed to Sean/Fable as a limitation of the review output. If the free AI review returns "APPROVE PLAN" based only on the packet's own evidence, that is a circular validation — the packet is being reviewed against itself. The prompt should explicitly state: "This review is constrained to packet evidence and cannot independently verify repo state."

---

## 4. Actionability

### Finding 4.1 — Slice Definitions Are Well-Structured But Test Criteria Are Inconsistent
**Rating: MEDIUM**

Each slice has a description and a "Tests:" bullet. However, the test criteria vary significantly in specificity:

| Slice | Test Specificity | Assessment |
|-------|-----------------|------------|
| Slice 1 | "active mode transitions, Today next-action routing, existing log/search save callbacks still refresh macros" | Adequate — behavioral |
| Slice 2 | "manual/search draft normalization, serving-basis math, no regression in `/api/macros` payload shape" | Good — includes a specific API contract check |
| Slice 3 | "unmatched barcode fallback, 100g vs label-serving handling, scanner save refreshes Today" | Good |
| Slice 4 | "model migration, macro source normalization, scanner log-save preserves source/reconciliation" | Vague — "model migration" is not a test, it is a task |
| Slice 5 | "per-serving, per-100g, weighed grams, household measure, and label-rounded cases" | Good — specific calculation cases |
| Slice 6 | "reviewer RBAC, queue filters, audit receipt, verify action does not mutate unrelated rows" | Good |
| Slice 7 | "local produce draft, source tag persistence, review queue handoff" | Adequate |
| Slice 8 | "Responsive matrix: 414px, 768px, 1440p/QHD, 4K. Accessibility: focus states, 44px controls, color-token contrast, reduced motion." | Good but missing pass/fail criteria |

**What should be done differently:**
- Slice 4 test criteria should be rewritten as: "Migration runs without data loss on existing `DailyMacroLog` rows; new columns default correctly; existing `/api/macros` endpoints return unchanged response shapes."
- Slice 8 should specify what "verify at 414px" means — a manual checklist? An automated snapshot test? A specific tool?

---

### Finding 4.2 — Open Questions Are Listed But Not Prioritized or Assigned
**Rating: HIGH**

The five Open Questions for Sean/Fable are well-formed, but:

- None have a default answer if Sean/Fable does not respond before implementation begins.
- None are tagged as "blocks Slice X" — so a developer cannot determine which questions must be answered before which slice can start.
- Question 4 (trainer vs. admin verification authority) has direct RBAC implementation implications for Slice 6 but is not flagged as a Slice 6 blocker.
- Question 2 (label-photo OCR in v1) has direct Slice 3 scope implications but is not flagged as a Slice 3 decision gate.

**What should be done differently:**

```markdown
| Question | Blocks Slice | Default If No Answer By [Date] |
|----------|-------------|-------------------------------|
| 1. Scanner embed vs. separate route | Slice 1, Slice 3 | Separate route with return-path (lower risk) |
| 2. Label-photo OCR in v1 | Slice 3 | Defer to v2; barcode/search/manual only |
| 3. Local produce in v1 | Slice 7 | Defer; implement Slices 1-6 first |
| 4. Trainer vs. admin verify authority | Slice 6 | Admin-only until Sean decides |
| 5. Admin operation scope | Slice 6 | Lightweight queue only |
```

---

### Finding 4.3 — Acceptance Criteria Are Behavioral But Lack Measurable Thresholds
**Rating: MEDIUM**

The Acceptance Criteria section is one of the stronger parts of the document. However, several criteria are binary pass/fail statements that lack measurable thresholds:

- "Every capture lane produces a reviewable draft before save" — how is "reviewable" defined? What fields must be present for a draft to be considered reviewable?
- "Client-facing estimates are never silently presented as verified facts" — what is the UI treatment for unverified estimates? A chip? A warning banner? A disabled save button? The criterion is correct but not implementable without a UI specification.
- "UI follows Swan dark-first, styled-components, token fallback, 44px touch target, Victory chart, and responsive rules" — this is a reference to the project standard, not a nutrition-specific criterion. It should either be removed (assumed) or expanded with nutrition-specific token requirements.

---

## 5. Completeness

### Finding 5.1 — Performance Is Not Assessed
**Rating: HIGH**

The document proposes a significant increase in frontend complexity: a capture rail, draft panel, source truth panel, diary timeline, and multiple async data sources (USDA proxy, Open Food Facts proxy, barcode scanner, OCR). There is no discussion of:

- Bundle size impact of adding new capture components to `NutritionWorkspace`.
- Loading state strategy for the multi-source draft builder.
- Debounce/throttle requirements for food search (currently calling external APIs directly from the browser).
- Backend query performance for the new review queues (Slice 6) — no index strategy is mentioned for `DailyMacroLog` queries by `userId`, `date`, `reviewStatus`, and `confidenceScore`.
- Whether the `items: JSON` column on `

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
