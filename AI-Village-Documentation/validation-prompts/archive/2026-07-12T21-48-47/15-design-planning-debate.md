# UX/UI Design Planning Debate (Phase 2C) — Validation Report

> **Status:** PASS | **Model:** z-ai/glm-5.2 ↔ gemini-3.1-pro-preview | **Duration:** 136.4s
> **Files:** AI-Village-Documentation/PLAN-INPUT-jarvis-swan-os-village-2026-07-12.md
> **Generated:** 7/12/2026, 2:48:47 PM

---

CONSENSUS REACHED

Your logic regarding the Dual-Button Glow hierarchy is flawless. "Allow" is indeed a primary commit action and must utilize the Purple → Cyan pattern to maintain systemic consistency. Furthermore, your additions for the Deny button's interactive affordance and the strict reduced-motion compliance on the sync animation are excellent UX/A11y catches. 

Below is the finalized, merged UX/UI Design Specification for all four primary surfaces, incorporating all agreed-upon layouts, tokens, accessibility standards, and motion rules.

---

### MERGED UX/UI DESIGN SPECIFICATION: "Enchanted Apex: Crystalline Swan"

#### 1. Smart Lens Lab (Style-mode Detail Card & Catalog)
**Files:** `src/components/SmartLens/Catalog.tsx`, `src/components/SmartLens/DetailCard.tsx`
*   **Layout (Mobile):** Single-column vertical scroll. Catalog container includes `padding-bottom: calc(env(safe-area-inset-bottom) + 120px)` to prevent obscuration. Detail Card is a fixed bottom-sheet (`z-index: 40`).
*   **Layout (Desktop):** Left sidebar catalog (`width: 320px; height: 100vh;`), right-docked Detail Card panel (`width: 400px;`).
*   **Tokens & States:**
    *   Background: `var(--ss-bg-obsidian, #0A0A0F)` | Surface: `var(--ss-surface-graphite, #1A1A24)`
    *   Catalog Chip (Active): `background: var(--ss-accent-sapphire); box-shadow: 0 0 12px var(--ss-accent-wing);` *(Blue → Purple)*
    *   Apply Button (Primary): `background: var(--ss-accent-wing); box-shadow: 0 0 12px var(--ss-accent-arctic);` *(Purple → Cyan)*
*   **Motion:** Apply button scales `1.0 -> 0.95 -> 1.0` (200ms). Background pulses opacity `1.0 -> 0.8 -> 1.0` (400ms). Confirmation chip slides up (300ms). All disabled via `prefers-reduced-motion`.
*   **A11y:** Chips use `role="radio"`. Detail Card uses `aria-live="polite"`. Confirmation chip uses `aria-live="assertive"`.

#### 2. Workout Logger (Quick Log Mode)
**Files:** `src/components/WorkoutLogger/SetRow.tsx`, `src/components/WorkoutLogger/Logger.tsx`
*   **Layout (Mobile):** Single horizontal axis grid to ensure immediate tap access.
    ```css
    .set-row-mobile {
      display: grid;
      grid-template-columns: 32px 1fr 1fr 48px; /* Set# | Weight | Reps | LogBtn */
      gap: 8px;
      align-items: center;
      min-height: 56px;
    }
    ```
*   **Layout (Desktop):** Max-width `800px` centered. 4-column grid.
*   **Tokens & States:**
    *   Inputs (Focus): `border-color: var(--ss-accent-arctic); outline: 2px solid var(--ss-accent-arctic);`
    *   Log Check (Active): `background: var(--ss-accent-sapphire); box-shadow: 0 0 8px var(--ss-accent-wing);` *(Blue → Purple)*
    *   Add Exercise (Primary): `background: var(--ss-accent-wing); box-shadow: 0 0 12px var(--ss-accent-arctic);` *(Purple → Cyan)*
*   **Motion:** Log Check scales `1.0 -> 0.9 -> 1.0` (150ms). New rows slide in `translateY(10px) -> 0` (200ms). Disabled on reduced-motion.
*   **A11y:** Inputs use `role="spinbutton"` with min/max/now values. Log Check uses `aria-pressed="true/false"`.

#### 3. Swan Coach "Jarvis" Chat Interface
**Files:** `src/components/SwanCoach/ChatBubble.tsx`, `src/components/SwanCoach/ChatInterface.tsx`
*   **Layout:** Mobile full viewport (minus header) with sticky bottom input (`height: 64px`). Desktop max-width `600px` centered.
*   **Tokens & States:**
    *   User Bubble: `background: var(--ss-accent-sapphire); box-shadow: 0 0 10px var(--ss-accent-wing);` *(Blue → Purple)*
    *   Coach Bubble: `background: linear-gradient(145deg, var(--ss-surface-graphite), var(--ss-surface-carbon)); border-left: 2px solid var(--ss-accent-wing);` *(Gradient + Left Border to reduce visual noise)*
    *   Mic Button (Listening): `background: var(--ss-accent-arctic); box-shadow: 0 0 16px var(--ss-accent-wing);`
    *   Mic Button (Thinking): `background: var(--ss-accent-wing); box-shadow: 0 0 16px var(--ss-accent-arctic);` *(Purple → Cyan)*
*   **Motion:** Mic pulse expands box-shadow (1000ms infinite alternate). Thinking spinner rotates (800ms linear infinite). Disabled on reduced-motion.
*   **A11y:** Transcript container `aria-live="polite"`. Mic button dynamically updates `aria-label` ("Listening...", "Processing..."). Inline charts use `role="img"` with descriptive `aria-label`.

#### 4. Wearable Integration Consent (Fitbit)
**Files:** `src/components/Wearable/ConsentModal.tsx`
*   **Layout:** Centered Modal Dialog (`max-width: 400px`). Header with logos and sync icon. Sticky bottom footer for actions.
*   **Tokens & States:**
    *   Backdrop: `rgba(10, 10, 15, 0.8)` with `backdrop-filter: blur(4px)`.
    *   Modal Surface: `var(--ss-surface-graphite)` with `1px solid var(--ss-surface-carbon)`.
    *   Allow Button (Primary): `background: var(--ss-accent-wing); box-shadow: 0 0 12px var(--ss-accent-arctic);` *(Purple → Cyan)*
    *   Deny Button (Ghost):
        ```css
        .deny-button {
          background: transparent;
          color: var(--ss-text-ice, #60C0F0);
          border: 1px solid var(--ss-surface-carbon, #141419);
          border-radius: 8px;
          min-height: 44px;
          width: 100%;
          transition: border-color 150ms ease-out;
        }
        .deny-button:hover, .deny-button:focus-visible {
          border-color: var(--ss-text-ice, #60C0F0);
          outline: none;
        }
        ```
*   **Motion & A11y:** Modal scales `0.95 -> 1` and fades in (200ms). Sync icon pulses opacity `0.4 -> 1` infinitely.
    ```css
    @media (prefers-reduced-motion: reduce) {
      .sync-icon { animation: none; opacity: 1; }
    }
    ```
    Modal uses `role="dialog"` and `aria-modal="true"`.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
