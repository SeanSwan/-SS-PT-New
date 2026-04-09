# OPUS-CODEX DEBATE: 6.5 Phase 3 — Ingredient Safety UI (Scanning & Safety)
**Date:** 2026-04-08 | **Status:** CONSENSUS REACHED (Round 3)  
**Commits:** `10c124e9` (Phase 3), `3bdaec48` (R2), `4a0d7a9c` (R3)  
**Full transcript:** `debate-archive/OPUS-CODEX-DEBATE-6.5-PHASE3-2026-04-08-FULL.md`

---

## OUTCOME SUMMARY

Feature ships. 3-round debate resolved all blockers before production enablement.

### What was built
Ingredient safety UI layer on the barcode scanner — `IngredientSafetyPanel`, `IngredientDetailModal`, and `BarcodeScanner` wired together. Pure frontend; backend (FoodIngredient model + seed + scan endpoint) was already present from Phase 1.

### Blockers resolved

| # | Blocker | Fix |
|---|---------|-----|
| B1 | `hasSections` false empty-state — ignored `description` and `researchUrls` | Added both to `hasSections` OR chain |
| B2 | Modal not truly modal — no focus trap, no focus restore, no background inerting | Focus trap (`handleKeyDown`), `triggerRef` restore on unmount, `inert` loop over `document.body.children`, `createPortal` to make inert loop correct |
| B3 | Touch targets below 44px (ExpandBtn 32px, ShowMore 32px, IngredientRow 36px, CloseBtn 36px) | All raised to 44px minimum |
| B4 | Ingredient safety panel renders without legal gate | `VITE_INGREDIENT_SAFETY_ENABLED=true` env var required; defaults off |
| C3 | `ProductCard` hover `transform: translateY(-2px)` clips `position: fixed` modal | `createPortal(..., document.body)` moves backdrop outside transformed ancestor — same fix as B2 |

### Key architecture decisions
- **`createPortal`** — solves both inerting (B2) and transform clipping (C3) in one move
- **`VITE_INGREDIENT_SAFETY_ENABLED`** — build-time env gate; feature is inert in production until Sean flips it on Render after legal sign-off on IARC/FDA phrasing
- **`hasSections`** includes all 7 rendered sections: `iarcInfo`, `isEUBanned`, `description`, `healthConcerns`, `healthierAlternatives`, `bannedRegions`, `researchUrls`

### Deferred (not blocking)
- C1: `IngredientSafety` type owned by Panel — acceptable today, refactor to shared types file if surface grows
- C4: `researchUrls` zero protocol validation — acceptable while seed-only; add HTTPS validation if admin editing is added
