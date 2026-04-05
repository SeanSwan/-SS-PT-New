# Smart Escalation (MiniMax M2.7) — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.7 | **Duration:** 70.0s
> **Files:** docs/ai-workflow/blueprints/BOARD2-EXERCISE-MODIFICATIONS-PLAN.md
> **Generated:** 4/4/2026, 3:53:18 PM

---

# Deep-Dive Analysis: Critical Gap Evaluation

## Summary Assessment

| Finding | Truly Critical? | Classification Verdict | Blocker? |
|---------|-----------------|------------------------|----------|
| Population script → DB | **Partially** | **Over-classified (PII/PHI)** but principle valid | Yes (with caveat) |
| react-markdown XSS | **YES** | **Accurate** | Yes |
| Apply loading/error states | **NO** | **Over-classified** | No |

---

## Finding 1: Population Script → Production DB Without Validation

### 1. Is This Truly Critical or Over-Classified?

**Verdict: PARTIALLY OVER-CLASSIFIED**

| Claim | Assessment |
|-------|------------|
| PII/PHI Leakage | **OVER-CLASSIFIED** — Exercise modifications are generic strings ("Goblet Squat", "Leg Press"). No PII/PHI exists in this data domain. |
| XSS | **NOT APPLICABLE** at write-time — XSS is a render-time vulnerability |
| Data Integrity | **VALID CONCERN** — Gemini may return malformed JSON, wrong field mappings, or nonsensical content |

**The Real Risk:** Gemini 2.5 Flash returning:
- Malformed JSON causing script crashes
- Wrong field populated (e.g., `easyVariation` contains content meant for `kneeMod`)
- HTML/Markdown injection if future rendering changes

### 2. Specific Mitigation Strategy

```javascript
// scripts/populate-exercise-variations.mjs - ADD THIS

import { z } from 'zod';

// Validation schema
const VariationSchema = z.object({
  easyVariation: z.string().max(200),
  hardVariation: z.string().max(200),
  kneeMod: z.string().max(200).or(z.literal('N/A')),
  shoulderMod: z.string().max(200).or(z.literal('N/A')),
  backMod: z.string().max(200).or(z.literal('N/A')),
  ankleMod: z.string().max(200).or(z.literal('N/A')),
  wristMod: z.string().max(200).or(z.literal('N/A')),
  elbowMod: z.string().max(200).or(z.literal('N/A')),
  footMod: z.string().max(200).or(z.literal('N/A')),
  hipMod: z.string().max(200).or(z.literal('N/A')),
});

const BatchSchema = z.array(VariationSchema);

// After Gemini response, BEFORE database write:
const parsed = BatchSchema.safeParse(geminiResponse);

if (!parsed.success) {
  console.error(`Batch ${batchNum} validation failed:`, parsed.error.flatten());
  // Log to error tracking, skip batch, continue with others
  continue; 
}

// Sanitize strings (defense in depth)
const sanitized = parsed.data.map(variation => 
  Object.fromEntries(
    Object.entries(variation).map(([k, v]) => [k, sanitizeString(v)])
  )
);
```

**Additional safeguard:** Write to a `exercise_variations_staging` table first, add admin review flag, then promote to production.

### 3. Should This Block Implementation?

**YES, but only the population script execution, not the schema/migration.**

```
Migration + Schema    → PROCEED (already done)
Population Script     → BLOCK until validation added
Board 2 UI Changes    → PROCEED (independent of data)
```

### 4. Priority Order

| Step | Action | Priority |
|------|--------|----------|
| 1 | Add Zod schema validation | Immediate (1 hour) |
| 2 | Add string sanitization | Immediate (30 min) |
| 3 | Add staging table option | Deferred (nice-to-have) |
| 4 | Execute population | After Step 1 |

---

## Finding 2: react-markdown XSS Without Sanitization

### 1. Is This Truly Critical or Over-Classified?

**Verdict: ACCURATELY CRITICAL**

This is a legitimate stored XSS vulnerability:

```
Attack Vector:
1. Attacker finds exercise where Gemini returns: <script>evil()</script>
2. Content stored in database
3. Board 2 UI renders via react-markdown
4. Script executes in victim browser
```

**Why it's critical:**
- react-markdown can render arbitrary HTML
- Gemini output IS user-controlled content (via prompt injection potential)
- Board 2 is displayed in workout/logging context (authenticated users)

### 2. Specific Mitigation Strategy

**Option A (Recommended): Don't Use react-markdown for Plain Text**

If modifications are just exercise names (plain text), don't use a markdown renderer at all:

```tsx
// ClassPreviewPanel.tsx - Current (VULNERABLE)
<ReactMarkdown>{exercise.kneeMod}</ReactMarkdown>

// FIXED - Plain text rendering
<Text style={styles.modificationText}>
  {exercise.kneeMod}
</Text>
```

**Option B: If Markdown Formatting IS Required**

```tsx
import Markdown from 'react-markdown';
import { sanitize } from 'dompurify'; // For web
// Or for React Native, use: react-native-render-html with sanitize

// Or use remark-gfm with rehype-sanitize
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

const customSchema = {
  ...defaultSchema,
  tagNames: ['p', 'strong', 'em', 'code'], // Whitelist only safe tags
};

<Markdown rehypePlugins={[[rehypeSanitize, customSchema]]}>
  {exercise.kneeMod}
</Markdown>
```

**Option C: Strict Input Validation (Defense in Depth)**

```javascript
// In population script - strip any HTML before storage
function sanitizeForStorage(input) {
  return input
    .replace(/<[^>]*>/g, '')  // Remove HTML tags
    .replace(/javascript:/gi, '')  // Remove JS protocols
    .trim();
}
```

### 3. Should This Block Implementation?

**YES.** This is a genuine security vulnerability that must be fixed before Board 2 goes live.

### 4. Priority Order

| Step | Action | Priority |
|------|--------|----------|
| 1 | Audit: Are modification fields plain text or formatted markdown? | Immediate |
| 2a | If plain text: Replace react-markdown with simple Text component | Immediate |
| 2b | If markdown needed: Add rehype-sanitize | Immediate |
| 3 | Add input sanitization to population script | Immediate |
| 4 | Security review of all AI→DB→Render paths | High |

---

## Finding 3: Missing Loading/Error States for "Apply"

### 1. Is This Truly Critical or Over-Classified?

**Verdict: OVER-CLASSIFIED**

This is a **UX defect**, not a security or data integrity issue. It should be labeled "High Priority" or "Important", not "Critical".

| "Critical" Criteria | Applies Here? |
|---------------------|---------------|
| Security vulnerability | ❌ No |
| Data loss/corruption | ❌ No |
| Feature completely broken | ❌ No |
| UX degradation | ✅ Yes |
| User confusion possible | ✅ Yes |

### 2. Specific Mitigation Strategy

```tsx
// Add to useExerciseSearch.ts or create useApplyModifications.ts

interface ApplyState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
}

const [applyState, setApplyState] = useState<ApplyState>({ 
  status: 'idle', 
  error: null 
});

const handleApply = async (exerciseId: string, modType: string, value: string) => {
  setApplyState({ status: 'loading', error: null });
  
  try {
    await api.applyModification(exerciseId, modType, value);
    setApplyState({ status: 'success', error: null });
    // Auto-reset after 2s
    setTimeout(() => setApplyState({ status: 'idle', error: null }), 2000);
  } catch (err) {
    setApplyState({ 
      status: 'error', 
      error: err instanceof Error ? err.message : 'Failed to apply modification' 
    });
  }
};
```

### 3. Should This Block Implementation?

**NO.** Implement in parallel as part of the Board 2 UI work.

### 4. Priority Order

| Step | Action | Priority |
|------|--------|----------|
| 1 | Add ApplyState interface | Medium |
| 2 | Add loading spinner to Apply button | Medium |
| 3 | Add error toast/message | Medium |
| 4 | Add success feedback | Low (nice-to-have) |

---

## Revised Priority Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXECUTION ORDER                             │
├─────────────────────────────────────────────────────────────────────┤
│ PHASE 1: Security Fixes (BLOCKING)                                  │
│  ├─ 1.1 Add Zod validation to population script                     │
│  ├─ 1.2 Add string sanitization to population script                │
│  └─ 1.3 Fix react-markdown XSS (replace with plain text or sanitize)│
├─────────────────────────────────────────────────────────────────────┤
│ PHASE 2: Population Execution (after Phase 1)                       │
│  └─ 2.1 Run population script with 883 exercises                    │
├─────────────────────────────────────────────────────────────────────┤
│ PHASE 3: UI Implementation (can start now, merge after Phase 1)      │
│  ├─ 3.1 Board 2 modification table component                        │
│  ├─ 3.2 Apply button + loading/error states                         │
│  └─ 3.3 Color scheme + styling                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Classification Correction Summary

| Original Label | Corrected Label | Reason |
|----------------|-----------------|--------|
| Critical: Population script | **Valid Concern (not PII/PHI)** | Data integrity yes, PII/PII no |
| Critical: react-markdown XSS | **Correctly Critical** | Genuine stored XSS risk |
| Critical: Apply states | **Over-classified** | UX issue, not security/data issue |

The plan is solid overall. The two genuinely critical items (validation + XSS) are straightforward fixes that shouldn't significantly impact timeline.

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
