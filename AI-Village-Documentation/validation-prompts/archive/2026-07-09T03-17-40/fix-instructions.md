# Document Review — Technical Accuracy Consensus

> Generated from Phase 2 recursive debate (Gemini CTO ↔ Claude CEO)
> Consensus: YES

---

CONSENSUS REACHED

**To:** CEO, SwanStudios
**From:** Chief Technology Officer
**Date:** 2026-07-09
**Subject:** CTO Final Sign-off: Nutrition Decision Logger Brief

You are absolutely correct on both remaining points. 

As CTO, I concede that I overstepped into product strategy regarding trainer visibility. Your framing of Open Question #5 perfectly balances the technical implementation with the business/enterprise revenue implications. Furthermore, your critique of the Redis single-point-of-failure is spot on; the dual-layer idempotency pattern (Redis fast-path + Postgres unique constraint) is the exact level of system resilience we need for a production-grade fitness application. 

We are in full alignment. Below is the finalized, merged set of architectural directives to be appended to the Fable prompt.

---

### FINAL MERGED DIRECTIVES FOR FABLE PROMPT

**1. Implementation Sequencing (Strict Order)**
*   **Slice 1A (Contract Lock):** Define and lock the `NutritionEntryDraft` TypeScript interface in `src/types/nutrition.ts`. This must explicitly include top-level NASM-aligned macros: `fiberG`, `sugarG`, `sodiumMg`, and `saturatedFatG` (not buried in a `Record`).
*   **Slice 1B (Backend Proxy):** Build the Node.js/Express proxy service against the locked contract. This is mandatory to secure the USDA API key, prevent quota exhaustion, and enable server-side rate limiting.
*   **Slice 2 (UI Shell):** Build the frontend UI consuming the proxy.

**2. Database & Schema Architecture**
*   **Pristine Catalog:** `FoodProduct` will NOT be extended with user-specific OCR/Voice data. It remains a pristine, global catalog of verified barcodes.
*   **User Provenance:** Create a new `NutritionSourceRecord` table to hold messy, user-generated OCR/Voice provenance.
*   **Data Integrity:** The scanner write path (`FoodScannerPage.tsx`) must explicitly capture `servingBasis`. The current 100g hardcode is a critical bug and must be removed.

**3. System Resilience & Idempotency**
*   All POST requests to `/api/v1/nutrition/log` must include an `x-idempotency-key` (UUID v4) header.
*   **Dual-Layer Implementation:** Implement the CEO's graceful degradation pattern in `src/middleware/idempotency.ts` (Redis cache fast-path, falling back to Postgres on Redis failure).
*   **Required Migration:** 
    ```sql
    ALTER TABLE "DailyMacroLog" 
    ADD COLUMN "idempotencyKey" UUID,
    ADD CONSTRAINT "uq_macroLog_idempotency" 
      UNIQUE ("userId", "idempotencyKey");
    ```

**4. UI/UX & Theme Constraints**
*   **Tech Stack:** All charts must use `Victory`. All styling must use `styled-components`.
*   **Error States:** The UI must include honest empty/loading states (skeleton loaders) and a manual entry fallback for when the Express proxy/USDA API times out.
*   **Strict Contrast Enforcement:** New components (e.g., `src/components/Nutrition/ConfidenceChip.tsx`) must use the following locked token pairings to maintain the "Crystalline Swan" aesthetic while passing WCAG 4.5:1:
    *   *Primary text:* `--token-pure-white` on `--token-obsidian-black`
    *   *Confidence chip (Verified):* `--token-obsidian-black` on `--token-ice-wing`
    *   *Confidence chip (Unverified):* `--token-obsidian-black` on `--token-warning-amber`
    *   *Source label:* `--token-swan-lavender-light` on `--token-obsidian-black`

**5. Scope & Liability**
*   **Data Privacy:** `userId` and identifying metadata must be stripped before any payload reaches external AI/OCR services.
*   **OCR Deferral:** Label-Photo OCR is deferred to v2. This is not just due to schema-mapping complexity, but due to allergen misread liability. Fable must design a mandatory human-review UX gate before OCR can be shipped.

**6. Escalated Product Decision (Open Question #5)**
*   Trainer draft visibility is a product-tier decision. Fable must architect for two defined technical paths to be selected post-stakeholder review:
    *   **Path A (v1 default):** Drafts are ephemeral Zustand state (`src/stores/useNutritionDraftStore.ts`). Trainers see committed `DailyMacroLog` only. Zero backend complexity.
    *   **Path B (Enterprise tier):** Drafts are persisted to a new `NutritionDraftSession` table with a 4-hour TTL and soft-delete on commit. Trainer dashboard polls or subscribes via existing WebSocket infrastructure.

**CTO Sign-off:** The brief is now bulletproof. It protects our database, secures our external API quotas, enforces strict UI accessibility, and provides clear business optionality for the enterprise tier. Ready for Fable generation.
