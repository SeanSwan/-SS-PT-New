# Design Recommendations — UX/UI Consensus

> Generated from Phase 3 recursive debate (Gemini Creative Director ↔ Claude Collaborator)
> Consensus: YES

---

CONSENSUS REACHED

**THE CREATIVE DIRECTOR SPEAKS.**

Claude, you have executed this flawlessly. Your addition of the Liability Protection audit log is a masterstroke—it bridges the gap between luxury UX and enterprise-grade risk management. Furthermore, your proactive inclusion of an automated Accessibility Test Suite ensures that the Crystalline Swan will not degrade over time at the hands of careless commits. 

We have successfully aligned the backend architecture with the premium frontend vision. There are no further disputes. 

Here is the final, authoritative blueprint for the Engineering Team. Execute this exactly as specified.

***

### THE CRYSTALLINE SWAN: FINAL ENGINEERING & DESIGN BLUEPRINT

#### 1. Theme & Accessibility Architecture
**Files:** `theme/accessibility.ts`, `database/migrations/xxx_add_accessibility.sql`
*   **Database:** Add `accessibility_preferences` (JSONB) to the `users` table to store `highContrast`, `reducedMotion`, `fontSize`, and `animationSpeed`.
*   **OLED-Safe High Contrast Tokens:** 
    *   Background: Soft Void `#050505`
    *   Surface: Elevated Void `#0F0F0F`
    *   Text: Anti-Glare Frost `#F0F4F8`
    *   Border: Arctic Cyan `#50A0F0`
*   **System Fallback:** Implement `@media (prefers-contrast: more)` to respect OS-level settings automatically.

#### 2. Safety-First Fallback & Liability Systems
**Files:** `clientIntelligenceService.mjs`, `auditLogger.mjs`, `components/CoachDashboard.tsx`
*   **Intelligent Timeouts:** Replace `Promise.all` with a custom `withTimeout` wrapper (3000ms-5000ms). If a subsystem times out, return fallback data with `status: 'timeout'`.
*   **Degraded Intelligence Mode:** If `injuries` or `formAnalysis` times out, the `ClientContext` must return `intelligenceDegraded: true` and an array of `degradationReasons`.
*   **UI Treatment:** The dashboard wrapper receives a 1px solid Gilded Fern `#C6A84B` border. The primary CTA strips the Ice Wing glow, turns solid Gilded Fern, and reads: *"Generate Standard Workout (Limited Context)"*.
*   **Liability Audit Log:** If a trainer proceeds in degraded mode, fire an event to `auditLogger.mjs` (`type: 'DEGRADED_INTELLIGENCE_WORKOUT_GENERATION'`) capturing the missing data and trainer ID.

#### 3. AI Transparency & Exercise Context
**Files:** `workoutBuilderService.mjs`, `exerciseMetadataService.mjs` (NEW)
*   **Structured AI Rationale:** The workout generator must inject a `rationale` object into every exercise, containing a `primary` reason string, an array of `factors` (e.g., equipment, progression, recovery), and a `confidence` score.
*   **Exercise Metadata Database:** Do not bloat `EXERCISE_REGISTRY`. Create a new `exercise_metadata` Postgres table for `display_name`, `description`, `biomechanics`, `common_mistakes`, and `video_url`.
*   **UI Treatment:** Frontend will render an "AI Insight" accordion (Royal Depth `#003080`, Wing Purple `#8B5CF6` border) and a "Deep Context" tooltip for biomechanical descriptions.

#### 4. Centralized UI Constants
**Files:** `backend/config/intelligenceConstants.mjs`, `api/routes/config.mjs`
*   **Pain Thresholds:** Centralize thresholds (`safe: max 3`, `caution: 4-6`, `critical: 7-10`) and map them to our design tokens (Ice Wing `#60C0F0`, Gilded Fern `#C6A84B`, Wing Purple `#8B5CF6`).
*   **Endpoint:** Expose `GET /api/v1/config/ui-constants` so the frontend React components dynamically render heatmaps without hardcoded magic numbers.

#### 5. Real-Time Feedback Loop (Workout Reflection)
**Files:** `api/routes/workouts.mjs`, `components/WorkoutReflectionModal.tsx`
*   **Reflection API:** Create `POST /api/v1/workouts/:id/reflection` to capture exercise-specific difficulty ratings and trainer notes, feeding back into the client's intelligence profile.
*   **Context-Aware Modal UI:** 
    *   *Standard Mode:* Midnight Sapphire `#002060` background with Cosmic Nebula gradient overlay.
    *   *High-Contrast Mode:* Soft Void `#050505` background, 2px Arctic Cyan `#50A0F0` border. Gradients stripped. Ice Wing stars receive a 1px solid `#000000` stroke to prevent visual bleed.

#### 6. Automated Accessibility QA
**Files:** `tests/accessibility/*.spec.ts` (NEW)
*   **Visual Regression:** Implement Playwright + Percy tests to ensure no gradients or glows leak into High-Contrast mode.
*   **Contrast Validation:** Integrate `axe-core` to programmatically enforce our >7:1 contrast ratios across all text nodes.
*   **Screen Reader/ARIA:** Automate focus-trap and `aria-labelledby` testing for all modals and dynamic tooltips.

***

**To the Engineering Team:** 
This is the standard. We are building a biomechanically-aware, highly accessible, luxury coaching vault. Implement this blueprint, and the Crystalline Swan is ready for launch.
