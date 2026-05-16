# Security Planning Analysis — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 7,006 input / 4,607 output

---

## Primary Security Planner — Round 1

# Security Audit Report: Board 2 Exercise Modifications Plan

**Auditor:** Primary Security Lead
**Platform:** SwanStudios (sswanstudios.com)
**Plan:** BOARD2-EXERCISE-MODIFICATIONS-PLAN.md
**Date:** 2025-06-20
**Overall Risk Rating:** 🔴 **CRITICAL** (requires immediate remediation before any implementation)

---

## Executive Summary

The Board 2 Exercise Modifications plan introduces **multiple critical security vulnerabilities** that could lead to data corruption, XSS attacks, unauthorized data access, and compliance violations. The most severe issue is the **direct production database write from an unvalidated external AI service**, which bypasses all application-layer security controls. Additionally, the plan contains **significant scope gaps** regarding PII/PHI handling, RBAC enforcement, and input validation that contradict the platform's existing security posture.

**Critical Findings:** 4
**High-Risk Findings:** 3
**Medium-Risk Findings:** 2

**Implementation Status:** ❌ **BLOCKED** until all critical findings are resolved.

---

## 1. PII/PHI Risks in AI-Generated Content

### 🔴 CRITICAL: Unvalidated AI Output Written Directly to Production DB

**Finding:** The population script (`scripts/populate-exercise-variations.mjs`) writes Gemini-generated content **directly to the production database** without:
- Input validation/sanitization
- Content scanning for PII/PHI
- Rate limiting or error handling
- Transactional safety or rollback capability

**Attack Vector:** Gemini 2.5 Flash could:
1. **Hallucinate PII** in modification fields (e.g., "See Dr. Smith at 123 Main St for this issue")
2. **Inject malicious content** that executes when rendered in the UI
3. **Generate copyrighted material** (exercise descriptions from proprietary sources)
4. **Create inconsistent data** that breaks application logic

**Evidence from Plan:**
> "Script writes directly to production DB (same DB as local dev)"
> "Gemini 2.5 Flash (FREE) generates modifications in batches"

**Mitigation Requirements:**
```javascript
// REQUIRED: Add validation layer BEFORE DB write
const validateModification = (fieldName, value) => {
  // 1. Length limits (max 500 chars per field)
  if (value.length > 500) throw new Error(`${fieldName} exceeds limit`);

  // 2. PII/PHI pattern detection
  const piiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{10}\b/, // Phone numbers
    /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Emails
    /\b(?:dr|md|do|np)\.?\s+[a-z]+\s+[a-z]+/i // Provider names
  ];
  if (piiPatterns.some(pattern => pattern.test(value))) {
    throw new Error(`PII detected in ${fieldName}`);
  }

  // 3. HTML/script tag detection
  if (/<[^>]*>|javascript:/i.test(value)) {
    throw new Error(`Potential XSS in ${fieldName}`);
  }

  // 4. Null/undefined/N/A consistency
  if (value === null || value === undefined || value.trim() === '') {
    return null; // Store NULL, not empty string
  }

  return value.trim();
};

// REQUIRED: Transaction with rollback capability
await sequelize.transaction(async (t) => {
  for (const exercise of batch) {
    // Validate each field
    const validated = {};
    Object.keys(exercise).forEach(key => {
      validated[key] = validateModification(key, exercise[key]);
    });

    await Exercise.update(validated, {
      where: { id: exercise.id },
      transaction: t
    });
  }
});
```

**Additional Controls:**
- Run population **first in staging** with full audit logging
- Implement **checkpointing**: record last successful batch ID
- Add **dry-run mode** that outputs JSON for manual review
- Store **Gemini raw responses** in separate audit table for 90 days
- Require **human review** of 5% random sample before production run

---

## 2. XSS Vectors in Markdown Rendering

### 🔴 CRITICAL: Markdown Rendering Without Sanitization

**Finding:** The plan includes `react-markdown` for rendering AI-generated modification text. If Gemini outputs markdown with embedded HTML/JS, this creates **stored XSS** that executes in users' browsers when they view Board 2.

**Evidence from Plan & Reviews:**
> "Use `react-markdown` with a memoized `components` object" (Frontend Patterns review)
> No mention

---

## Secondary Security Planner (120B MoE) — Round 2

CONSENSUS REACHED

Merged Findings:

1. **PII/PHI Risks in AI-Generated Content**
   - **Critical Finding:** The population script (`scripts/populate-exercise-variations.mjs`) writes Gemini-generated content directly to the production database without validation, enabling PII/PHI leakage, XSS, and data integrity issues.
   - **Agreed Mitigations (as proposed by Primary Security Planner):**
     - Insert validation function before any DB write (see code below). Place this logic in `scripts/populate-exercise-variations.mjs` at the point where `exercise` objects are constructed, immediately prior to the `Exercise.update` call (approx. lines 40-55, depending on current structure).
     - Wrap updates in a Sequelize transaction with rollback capability.
     - Additional controls:
       * Execute first in staging environment with full audit logging (table: `exercise_population_audit`).
       * Implement checkpointing: persist last successfully processed batch ID to a file (`scripts/.populate-checkpoint`) or DB table to enable resumption.
       * Add `--dry-run` flag that outputs validated JSON to `scripts/dry-run-output/` for manual review.
       * Archive raw Gemini responses in a separate table (`gemini_raw_responses`) with a 90-day TTL.
       * Mandate human review of a 5% random sample (selected via seeded RNG) before promoting to production.

   ```javascript
   // Validation function to be added near top of scripts/populate-exercise-variations.mjs
   const validateModification = (fieldName, value) => {
     if (typeof value !== 'string') {
       return value; // Pass through non-strings (e.g., numbers, booleans) unchanged
     }
     // 1. Length limits
     if (value.length > 500) throw new Error(`${fieldName} exceeds 500-char limit`);

     // 2. PII/PHI pattern detection
     const piiPatterns = [
       /\b\d{3}-\d{2}-\d{4}\b/, // SSN
       /\b\d{10}\b/, // Phone numbers (simple)
       /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Emails
       /\b(?:dr|md|do|np)\.?\s+[a-z]+\s+[a-z]+/i // Provider names
     ];
     if (piiPatterns.some(p => p.test(value))) {
       throw new Error(`PII/PHI detected in ${fieldName}`);
     }

     // 3. HTML/script tag detection (prevents stored XSS)
     if (/<[^>]*>|javascript:/i.test(value)) {
       throw new Error(`Potential XSS in ${fieldName}`);
     }

     // 4. Normalize empty strings to NULL for DB consistency
     return value.trim() === '' ? null : value.trim();
   };

   // Transaction wrapper (replace existing update loop)
   await sequelize.transaction(async (t) => {
     for (const exercise of batch) {
       const validated = {};
       Object.keys(exercise).forEach(key => {
         validated[key] = validateModification(key, exercise[key]);
       });
       await Exercise.update(validated, {
         where: { id: exercise.id },
         transaction: t
       });
     }
   });
   ```

2. **XSS Vectors in Markdown Rendering**
   - **Critical Finding:** The plan uses `react-markdown` to render AI-generated modification text without sanitizing HTML/JS, creating stored XSS risk when content is viewed in Board 2 UI.
   - **Agreed Mitigations:**
     - Sanitize all AI-generated markdown content **server-side** before storage or **client-side** immediately before rendering, using a trusted library like DOMPurify.
     - File target: Any component rendering exercise modifications via `react-markdown` (e.g., `src/components/ExerciseVariationRenderer.jsx` or similar). Apply sanitization at the point where raw modification strings are passed to `<ReactMarkdown>`.
     - Exact code change: Import DOMPurify and clean the content. Example for `src/components/ExerciseVariationRenderer.jsx` (approx. line 18 where `modificationText` is used):

       ```javascript
       import DOMPurify from 'dompurify';

       // Inside component render or props processing
       const cleanModificationText = DOMPurify.sanitize(rawModificationText, {
         ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
         ALLOWED_ATTR: ['href', 'target', 'rel']
       });

       // Then pass cleanModificationText to react-markdown
       <ReactMarkdown>{cleanModificationText}</ReactMarkdown>
       ```
     - Additionally, configure `react-markdown` to disable raw HTML rendering via `sanitizeConfig` (if using a version that supports it) as a defense-in-depth layer.
     - Ensure server-side sanitization API endpoint (if content is fetched via AJAX) also applies DOMPurify to prevent bypass.

**Overall Status:** Implementation remains **BLOCKED** until all above mitigations are implemented and verified in staging. Re‑audit required post‑fix.

---
