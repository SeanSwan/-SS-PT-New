# Code Quality & Architecture — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 5
> **Tokens:** 37,270 input / 6,822 output

---

## CTO (Chief Technology Officer) — Round 1

As the CTO, I have reviewed the `WorkoutPlannerPage.tsx` implementation against the `WORKOUT-PLANNER-V2-MASTER-BLUEPRINT.md`. 

While the product vision is strong, the current implementation is unacceptable for production. The engineering team has completely ignored the architectural constraints defined in the blueprint, introduced severe runtime crash risks, and written unsafe database migration patterns. 

If we deploy this to `sswanstudios.com`, we will face UI crashes, state corruption, and massive technical debt. Here is my Round 1 analysis. I expect you to review these carefully—I will defend each of these findings.

---

### 1. Architectural Drift & God Component Violation
*   **Severity:** **CRITICAL**
*   **File & Line:** `WorkoutPlannerPage.tsx` (Entire File) & `WORKOUT-PLANNER-V2-MASTER-BLUEPRINT.md` (Line 230)
*   **What's Wrong:** The blueprint explicitly mandates a **"No-Monolith Rule: ≤300 lines each"** and requires a specific component decomposition (`ExerciseRolodex3D.tsx`, `WorkoutBuilder.tsx`, etc.). The developer ignored this entirely. `WorkoutPlannerPage.tsx` is a 650+ line God Component. Furthermore, the highly touted "3D Rolodex" from the blueprint is completely missing—the code falls back to a standard flat `.map()` list. We are paying for a premium Crystalline Swan experience but delivering a basic MVP list.
*   **Proposed Fix:** Reject the PR. Force the team to break this file into the exact component tree specified in the blueprint (System 1 & Component Decomposition sections) and implement the Framer Motion 3D logic.

### 2. Destructive SQL Migration Pattern
*   **Severity:** **CRITICAL**
*   **File & Line:** `WORKOUT-PLANNER-V2-MASTER-BLUEPRINT.md` (Lines 150-155)
*   **What's Wrong:** The blueprint instructs developers to run raw `ALTER TABLE` statements to add JSONB columns. There is no transaction wrapper, no `down()` rollback method, and no safety checks. If a database lock occurs between the first and second `ALTER` statement, the schema is left in a corrupted, unrecoverable half-state in production.
*   **Proposed Fix:** Remove raw SQL from the blueprint. Require a proper Sequelize migration file:
    ```javascript
    module.exports = {
      up: async (queryInterface, Sequelize) => {
        return queryInterface.sequelize.transaction(t => {
          return Promise.all([
            queryInterface.addColumn('workout_plans', 'exerciseGroups', { type: Sequelize.JSONB, defaultValue: [] }, { transaction: t }),
            // ... other columns
          ]);
        });
      },
      down: async (queryInterface) => { /* drop columns */ }
    };
    ```

### 3. Runtime Crash Risk in Equipment Parser
*   **Severity:** **HIGH**
*   **File & Line:** `WorkoutPlannerPage.tsx` (Lines 102-117)
*   **What's Wrong:** The `parseEquipment` function attempts to parse a JSON string. If the database contains a malformed JSON array of objects (e.g., `[{"name": "Dumbbell"}]`), `JSON.parse` succeeds, and `eq.filter(Boolean)` allows the objects through. Later, on line 178, the code runs `eqArr.some(e => e.toLowerCase().includes(norm))`. Because `e` is an object, `e.toLowerCase` is undefined, throwing a `TypeError` and **crashing the entire React tree**.
*   **Proposed Fix:** Enforce string types during the parse phase:
    ```typescript
    if (Array.isArray(parsed)) {
      return parsed.filter(e => typeof e === 'string' && e.trim() !== '');
    }
    ```

### 4. State Corruption via React Key Collision
*   **Severity:** **HIGH**
*   **File & Line:** `WorkoutPlannerPage.tsx` (Line 229)
*   **What's Wrong:** The ID generation for new exercises uses `id: ${ex.id}-${Date.now()}`. `Date.now()` has millisecond precision. If a user double-clicks the "Add" button, or if a macro/script triggers rapid additions, multiple exercises will receive the exact same ID. This causes React key collisions, resulting in silent UI bugs, dropped elements, and corrupted workout plan state.
*   **Proposed Fix:** Use a cryptographically secure UUID or a reliable unique identifier:
    ```typescript
    import { v4 as uuidv4 } from 'uuid';
    // ...
    id: `${ex.id}-${uuidv4()}`,
    ```

### 5. Unsafe Error Swallowing & Type Assertions
*   **Severity:** **MEDIUM**
*   **File & Line:** `WorkoutPlannerPage.tsx` (Lines 290 & 330)
*   **What's Wrong:** The error handling for AI generation uses a massive, unsafe inline type assertion: `const errData = (err as { response?: { data?: { error?: string; details?: string } } })?.response?.data;`. If `err` is a standard JavaScript `Error` object or a string, this assertion is invalid and masks the true error, making production debugging in Sentry nearly impossible.
*   **Proposed Fix:** Use Axios's built-in type guards:
    ```typescript
    import axios from 'axios';
    // ...
    if (axios.isAxiosError(err)) {
      const specificMsg = err.response?.data?.details || err.response?.data?.error;
      // handle specificMsg
    } else {
      // handle standard Error
    }
    ```

### 6. Hardcoded Colors Breaking the Design System
*   **Severity:** **MEDIUM**
*   **File & Line:** `WorkoutPlannerPage.tsx` (Lines 460, 580, 582, 608)
*   **What's Wrong:** The developer hardcoded hex values directly into inline styles (e.g., `border: '1px solid #C6A84B'`, `background: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, var(--bg-elevated, #1A1A24))'`). This completely bypasses the `styled-components` theme provider. If we ever need to tweak the Crystalline Swan palette or implement a light mode, these elements will remain stuck in the dark theme, creating a broken UI.
*   **Proposed Fix:** Move all inline styles to `WorkoutPlannerStyles.ts` and use the theme context:
    ```typescript
    border: 1px solid ${({ theme }) => theme.colors.luxuryAccent};
    ```

### 7. Uncontrolled Input UX Degradation
*   **Severity:** **LOW**
*   **File & Line:** `WorkoutPlannerPage.tsx` (Lines 504 & 522)
*   **What's Wrong:** The `MiniInput` for Sets and Rest uses `parseInt(e.target.value) || 1` (or `0`). If a user highlights the number "3" and presses backspace to type "12", the moment the input becomes empty, it instantly forces the value to "1" or "0". This is incredibly frustrating UX for data entry.
*   **Proposed Fix:** Allow the state to hold an empty string temporarily during typing, and only apply the fallback `|| 1` on the `onBlur` event, or use a proper controlled form library like `react-hook-form`.

---

**To the CEO:** The blueprint is visionary, but the code delivered is a fragile monolith. I recommend we halt merging this PR until the God Component is broken down and the runtime crash risks (Items 3 and 4) are patched. Your thoughts?

---

## CEO (Chief Executive Officer) — Round 2

# CEO Response — Round 1

CTO, I appreciate the thorough technical review. Your findings demonstrate strong attention to detail and legitimate concerns about production readiness. However, I need to push back on severity classifications and prioritization strategy. Let's address each point:

---

## AGREEMENTS

### ✅ Item #3: Runtime Crash Risk in Equipment Parser
**AGREED - CRITICAL**. This is a production-breaking bug. The type coercion failure will crash the UI. Your proposed fix is correct:
```typescript
if (Array.isArray(parsed)) {
  return parsed.filter(e => typeof e === 'string' && e.trim() !== '');
}
```
**Action Required:** Implement immediately before any deployment.

### ✅ Item #4: State Corruption via React Key Collision  
**AGREED - HIGH**. `Date.now()` collisions are a real risk with rapid user interactions. UUID implementation is the correct solution:
```typescript
import { v4 as uuidv4 } from 'uuid';
id: `${ex.id}-${uuidv4()}`,
```
**Action Required:** Fix before production deployment.

### ✅ Item #5: Unsafe Error Swallowing
**AGREED - MEDIUM**. The type assertion pattern is indeed unsafe. Your Axios type guard approach is cleaner and more maintainable for production debugging.

---

## DISAGREEMENTS

### ⚠️ Item #1: Architectural Drift — SEVERITY DOWNGRADE

**Your Assessment:** CRITICAL  
**My Assessment:** MEDIUM (Technical Debt)

**Why I'm Downgrading:**

1. **The 300-line rule is a guideline, not a hard contract.** The blueprint states "≤300 lines each" as an *ideal*, but doesn't mandate rejection of a 650-line component if it's functionally cohesive. This is a monolith, yes—but it's a *working* monolith with clear logical sections.

2. **The 3D Rolodex is explicitly marked as a future enhancement** in the blueprint (Line 245: "Phase 2: Advanced Animations"). The current `.map()` implementation is the correct MVP approach. We should not block a PR for missing a Phase 2 feature when Phase 1 is the current milestone.

3. **Business Reality:** Forcing a complete rewrite to extract 6+ components will delay launch by 2-3 weeks. The current code is testable, debuggable, and maintainable *enough* for v1.0.

**Proposed Compromise:**
- **Immediate:** Ship current implementation with Items #3 and #4 fixed
- **Sprint +1:** Create refactoring tickets to extract `ExerciseRolodex3D.tsx`, `WorkoutBuilder.tsx`, and `AIGenerationPanel.tsx`
- **Sprint +2:** Implement Framer Motion 3D carousel as enhancement

This is a **ship-then-improve** strategy, not technical negligence.

---

### ⚠️ Item #2: Destructive SQL Migration — DISAGREE ON SEVERITY

**Your Assessment:** CRITICAL  
**My Assessment:** MEDIUM (Operational Risk)

**Why I'm Disagreeing:**

1. **The blueprint SQL is documentation, not executable code.** Lines 150-155 are *instructions for developers*, not a migration file to be run directly. Any competent backend engineer would wrap this in a proper migration framework.

2. **Your proposed fix is correct**, but this isn't a "reject the PR" issue—it's a "ensure the backend team follows best practices" issue. The frontend PR doesn't contain migration code.

3. **Actual Risk:** If the backend team *did* run raw SQL without transactions, that's a process failure, not a code failure in `WorkoutPlannerPage.tsx`.

**Proposed Action:**
- Add a `migrations/` folder with your transactional Sequelize migration template
- Update blueprint Line 150 to reference the migration file instead of raw SQL
- Require backend PR review before any schema changes hit production

This is a **process fix**, not a code blocker.

---

### ⚠️ Item #6: Hardcoded Colors — SEVERITY DOWNGRADE

**Your Assessment:** MEDIUM  
**My Assessment:** LOW (Design Debt)

**Why I'm Downgrading:**

1. **The hardcoded colors use CSS custom properties as fallbacks** (e.g., `var(--accent-secondary, #8B5CF6)`). This means they *will* respect theme changes if we update the CSS variables in the global stylesheet.

2. **The `color-mix()` function is a progressive enhancement** that degrades gracefully. This is actually *good* CSS architecture for a luxury brand that wants cutting-edge visual effects.

3. **Light mode is not in the current roadmap.** The blueprint explicitly targets a "Crystalline Swan Dark Theme" (Line 89). Building for a hypothetical light mode is premature optimization.

**Proposed Action:**
- Document the hardcoded values in `WorkoutPlannerStyles.ts` with comments explaining the `color-mix` logic
- Create a "Theme Audit" ticket for Sprint +2 if light mode becomes a priority

This is **acceptable technical debt** for v1.0.

---

### ⚠️ Item #7: Uncontrolled Input UX — AGREED ON PROBLEM, DISAGREE ON PRIORITY

**Your Assessment:** LOW  
**My Assessment:** LOW (but needs user testing validation)

**Why I'm Modifying:**

Your diagnosis is correct—the `parseInt || 1` pattern is frustrating. However:

1. **This is a UX issue, not a crash risk.** Users can work around it by typing quickly or using arrow keys.
2. **The `onBlur` fix is simple** and can be implemented in < 30 minutes.

**Proposed Action:**
- Implement your `onBlur` fallback solution in this PR (it's a 2-line change)
- If user testing reveals significant friction, upgrade to `react-hook-form` in Sprint +1

---

## FINAL DECISION

**Merge Status:** ❌ **BLOCK MERGE** (but not for the reasons you stated)

**Required Changes Before Merge:**
1. ✅ Fix Item #3 (Equipment Parser type safety)
2. ✅ Fix Item #4 (UUID for exercise IDs)
3. ✅ Fix Item #7 (onBlur fallback for inputs)
4. ✅ Add Axios type guard for error handling (Item #5)

**Post-Merge Technical Debt (Tracked in Jira):**
- Item #1: Component extraction (Sprint +1)
- Item #2: Migration file template (Backend team, Sprint +1)
- Item #6: Theme audit (Sprint +2, if needed)

**Estimated Delay:** 1-2 days for critical fixes, not 2-3 weeks for full rewrite.

---

**CTO, your turn:** Do you accept this prioritization, or do you believe the architectural issues are truly blocking? I need your commitment that the backend team will handle Item #2 properly if we proceed with this plan.

---

## CTO (Chief Technology Officer) — Round 3

I appreciate the pragmatic approach, CEO. We are aligned on the critical runtime fixes. I agree to implement the fixes for **Item #3 (Equipment Parser)**, **Item #4 (UUIDs)**, **Item #5 (Axios Type Guards)**, and the quick `onBlur` fix for **Item #7 (Input UX)** in this PR immediately. 

However, I cannot fully accept your downgrades on the architectural and styling fronts. "Ship-then-improve" is a valid business strategy, but only if we don't ship a concrete block that is impossible to chisel later. Here is my Round 2 stance.

---

### ⚠️ Item #1: Architectural Drift (The God Component)
**Status: PARTIAL DISAGREEMENT — Proposing a Middle Ground**

You are correct that the 3D Rolodex is a Phase 2 enhancement (Blueprint Line 245). I concede that point; we will ship the standard `.map()` list for v1.0. 

However, I strongly dispute your estimate that extracting components will take "2-3 weeks." Any competent React engineer can extract a component in a few hours. Leaving `WorkoutPlannerPage.tsx` at 650+ lines means the AI generation state, the drag-and-drop workout list state, and the UI rendering are entirely entangled. If we ship this, the Sprint +1 refactor will cause massive regression bugs because the state is tightly coupled.

**Proposed Compromise:**
I will not demand the full 6-component extraction. However, before merge, the developer **must** extract the AI logic into `AIGenerationPanel.tsx`. 
*   **Why:** The AI generation handles complex async state, error parsing (Item #5), and streaming UI. Isolating this drops the main file size by ~150 lines and protects the core workout builder state from AI-related re-renders.
*   **Delay:** 2-3 hours, not weeks. 

### ⚠️ Item #2: Destructive SQL Migration
**Status: AGREED ON UNBLOCKING PR, DISAGREE ON BLUEPRINT STATE**

I agree this is a frontend PR and the backend migration process shouldn't block this specific code deployment. 

However, the `WORKOUT-PLANNER-V2-MASTER-BLUEPRINT.md` is our engineering source of truth. If Lines 150-155 remain as raw `ALTER TABLE` statements, a junior backend developer *will* copy-paste them into production next week. 

**Proposed Action:**
I will unblock the frontend PR, but this PR **must include a documentation commit** updating Lines 150-155 of the blueprint to the Sequelize transaction template I provided. We fix the documentation now so the backend team doesn't fail later.

### ⚠️ Item #6: Hardcoded Colors & Theme Bypassing
**Status: DISAGREE ON TECHNICAL ASSUMPTION**

You argued that `var(--accent-secondary, #8B5CF6)` is acceptable because it uses CSS custom properties. This relies on a flawed assumption about our stack. 

We are using `styled-components`. Unless the theme provider is explicitly injecting `--accent-secondary` into the `:root` via `createGlobalStyle` (which it currently isn't; it passes a JS object via React Context), the browser will *always* fall back to the hardcoded `#8B5CF6`. If marketing requests a brand color tweak next week, updating the `styled-components` theme will do absolutely nothing to these inline styles.

**Proposed Action:**
I will accept keeping the `color-mix()` logic for the luxury visual effect, but we must map it to the React theme context, not a disconnected CSS variable.
Change Line 608 from:
`background: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, var(--bg-elevated, #1A1A24))'`
To:
``background: `color-mix(in srgb, ${({ theme }) => theme.colors.accentSecondary} 15%, ${({ theme }) => theme.colors.bgElevated})` ``
This takes 10 minutes to find-and-replace and ensures our design system remains intact.

---

### CTO's Updated Merge Conditions:
I will approve this PR today, with a delay of **< 1 day**, if the following are met:
1.  **Agreed Fixes:** Items #3, #4, #5, and #7 are implemented.
2.  **Item #1:** Extract `AIGenerationPanel.tsx` (leave the rest of the monolith for Sprint +1).
3.  **Item #2:** Update the blueprint markdown file to remove the raw SQL.
4.  **Item #6:** Replace the inline CSS `var()` fallbacks with proper `${({ theme }) => ...}` interpolations.

CEO, this protects our state architecture, secures our database schema documentation, and preserves the design system—all without impacting your launch timeline. Do we have a deal?

---

## CEO (Chief Executive Officer) — Round 4

# CEO Response — Round 2

CTO, I appreciate your willingness to find middle ground. Your revised conditions are far more reasonable than the initial "reject the PR" stance. Let's finalize this.

---

## ✅ FULL AGREEMENTS

### Item #3, #4, #5, #7: Critical Fixes
**CONSENSUS.** These are non-negotiable and will be implemented immediately. No further discussion needed.

### Item #2: Blueprint Documentation Fix
**AGREED.** You're absolutely right—the blueprint is our source of truth, and leaving raw SQL in documentation is a ticking time bomb. Including a documentation commit to update Lines 150-155 with your Sequelize transaction template is a **zero-risk, high-value change**. 

**Action:** Developer will update blueprint in this PR with proper migration example.

---

## ⚠️ PARTIAL AGREEMENT WITH MODIFICATION

### Item #1: AI Panel Extraction

**Your Proposal:** Extract `AIGenerationPanel.tsx` before merge (2-3 hours)  
**My Assessment:** AGREED IN PRINCIPLE, with scope clarification

You're correct that extracting the AI logic is lower risk than a full 6-component decomposition. However, I need clarity on the extraction boundary:

**What I'm Approving:**
- Extract lines 270-340 (AI generation form, streaming state, error handling) into `AIGenerationPanel.tsx`
- Pass `onGenerate` callback and `isGenerating` state as props
- Keep workout list state management in parent component

**What I'm NOT Approving (for this PR):**
- Extracting drag-and-drop logic into separate component (too risky for state coupling)
- Extracting exercise card rendering (minimal benefit, high refactor surface area)

**Rationale:** The AI panel is genuinely isolated—it's a form that emits a single event (`onGenerate`). The workout builder state is more entangled with drag-and-drop, local storage sync, and validation logic. Separating that requires careful state architecture planning, not a rushed pre-merge extraction.

**Estimated Delay:** 3-4 hours (including testing). Acceptable.

---

## ❌ DISAGREEMENT REQUIRING NEGOTIATION

### Item #6: Hardcoded Colors & Theme System

**Your Claim:** "Unless the theme provider is explicitly injecting `--accent-secondary` into `:root` via `createGlobalStyle`, the browser will always fall back to the hardcoded `#8B5CF6`."

**My Counter-Claim:** You're technically correct about the current implementation, but your proposed fix introduces a different architectural problem.

#### The Real Issue:
Our `styled-components` theme uses **JavaScript objects** for colors:
```typescript
theme.colors.accentSecondary = '#8B5CF6'
```

But `color-mix()` is a **CSS function** that requires CSS custom properties to work dynamically. Your proposed solution:
```typescript
background: `color-mix(in srgb, ${({ theme }) => theme.colors.accentSecondary} 15%, ...)`
```
...will compile to:
```css
background: color-mix(in srgb, #8B5CF6 15%, #1A1A24);
```

This is **statically baked at build time**. If we update the theme object at runtime (e.g., for A/B testing or user preferences), the `color-mix()` output won't update because it's already been interpolated into a static hex value.

#### The Correct Solution:
We need to inject theme colors as CSS custom properties in `GlobalStyles.ts`:
```typescript
// GlobalStyles.ts
import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  :root {
    --accent-secondary: ${({ theme }) => theme.colors.accentSecondary};
    --bg-elevated: ${({ theme }) => theme.colors.bgElevated};
    /* ... other theme colors */
  }
`;
```

Then the inline styles can safely use:
```typescript
background: 'color-mix(in srgb, var(--accent-secondary) 15%, var(--bg-elevated))'
```

**Why This Matters:**
- ✅ Preserves `color-mix()` dynamic behavior
- ✅ Allows runtime theme updates
- ✅ Maintains single source of truth (theme object)
- ✅ No hardcoded fallback values needed

#### My Counter-Proposal:
**Option A (Preferred):** Developer adds CSS custom property injection to `GlobalStyles.ts` in this PR (~30 minutes)  
**Option B (Acceptable):** We document this as "Theme System Debt" and create a Sprint +1 ticket, but we do NOT merge half-working `${theme}` interpolations that break `color-mix()` semantics

**CTO, which option do you prefer?** I will not accept merging the `${({ theme }) => ...}` pattern without the GlobalStyles foundation—it's trading one problem for another.

---

## 🤝 FINAL NEGOTIATED TERMS

**I will approve merge TODAY if:**

1. ✅ **Critical Fixes:** Items #3, #4, #5, #7 implemented (AGREED)
2. ✅ **Blueprint Update:** Item #2 documentation fix (AGREED)
3. ✅ **AI Panel Extraction:** Item #1 scoped to AI logic only (AGREED with clarification)
4. ⚠️ **Theme System:** Item #6 resolved via Option A or documented as Sprint +1 debt (PENDING YOUR CHOICE)

**Estimated Total Delay:** 4-5 hours of dev work

**CTO, final question:** Do you accept Option A (GlobalStyles injection) for Item #6, or do you want to defer this to Sprint +1 with proper documentation? I need your commitment that we won't merge a broken `color-mix()` pattern.

Your call. Let's close this out.

---

## CTO (Chief Technology Officer) — Round 5

CONSENSUS REACHED

CEO, excellent catch on the CSS custom properties architecture. You are absolutely correct that injecting the theme variables into `:root` via `GlobalStyles.ts` is the superior pattern. While `styled-components` would technically re-evaluate the interpolated hex strings on a theme state change, relying on native CSS variables avoids expensive React re-renders across the entire DOM tree during a theme toggle. I gladly accept **Option A**. 

I also agree with your scope boundary for **Item #1**. Isolating the volatile async state of the AI generation (lines 270-340) into `AIGenerationPanel.tsx` mitigates the highest risk of re-render lag. The drag-and-drop state can safely be deferred to Sprint +1.

We have a rock-solid execution plan. Here are the merged findings and the exact mandate for the engineering team to get this PR merged today:

### Final Execution Plan (Pre-Merge Requirements)

**1. Critical Runtime & UX Fixes (Items #3, #4, #5, #7)**
*   **`WorkoutPlannerPage.tsx` (Lines 102-117):** Implement the `typeof e === 'string'` type guard in `parseEquipment` to prevent the UI crash.
*   **`WorkoutPlannerPage.tsx` (Line 229):** Replace `Date.now()` with `uuidv4()` for exercise ID generation to prevent React key collisions.
*   **`WorkoutPlannerPage.tsx` (Lines 290 & 330):** Replace the unsafe inline type assertion with `axios.isAxiosError(err)` for proper Sentry error logging.
*   **`WorkoutPlannerPage.tsx` (Lines 504 & 522):** Move the `parseInt(e.target.value) || 1` fallback to the `onBlur` event to fix the uncontrolled input UX degradation.

**2. Scoped Component Extraction (Item #1)**
*   **`WorkoutPlannerPage.tsx` & `AIGenerationPanel.tsx`:** Extract the AI generation form, streaming state, and error handling (Lines 270-340) into `AIGenerationPanel.tsx`. Pass `isGenerating` and `onGenerate` as props. Leave the drag-and-drop and list rendering in the main file for Sprint +1.

**3. Theme System Architecture (Item #6 - Option A)**
*   **`GlobalStyles.ts`:** Add a `:root` block to `createGlobalStyle` that maps the JS theme object to CSS custom properties:
    ```typescript
    :root {
      --accent-secondary: ${({ theme }) => theme.colors.accentSecondary};
      --bg-elevated: ${({ theme }) => theme.colors.bgElevated};
    }
    ```
*   **`WorkoutPlannerPage.tsx`:** Clean up the inline styles to use the newly injected variables without hardcoded fallbacks:
    ```typescript
    background: 'color-mix(in srgb, var(--accent-secondary) 15%, var(--bg-elevated))'
    ```

**4. Blueprint Documentation (Item #2)**
*   **`WORKOUT-PLANNER-V2-MASTER-BLUEPRINT.md` (Lines 150-155):** Replace the raw `ALTER TABLE` SQL instructions with the transactional Sequelize migration template to ensure the backend team has safe, copy-pasteable documentation.

**Post-Merge Technical Debt (Sprint +1):**
*   Extract `WorkoutBuilder.tsx` (drag-and-drop logic) and `ExerciseCard.tsx`.
*   Backend team to execute the JSONB migration using the newly documented Sequelize pattern.

This is a massive win for both product velocity and platform stability. I will approve the PR the moment these specific commits are pushed. Great working with you to refine this.

---

