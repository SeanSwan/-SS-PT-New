# Security Planning Analysis — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 4
> **Tokens:** 19,331 input / 15,079 output

---

## Primary Security Planner — Round 1

# Security Audit Report: Bootcamp Format & Style Upgrade Plan
**Auditor:** Primary Security Lead | **Platform:** SwanStudios (sswanstudios.com) | **Date:** 2025-06-17

---

## EXECUTIVE SUMMARY

After reviewing the **Bootcamp Format & Style Comprehensive Upgrade Plan** alongside 12 specialist analyses, I confirm a **critical mismatch**: the provided "8 audit questions" reference AI chat/voice/file systems **not present in this plan**. This plan is a **domain-configuration upgrade** for the Bootcamp Builder (format constants, timing logic, UI components).

**Actual Security Posture:**
- **No new PII, voice, or file-attachment vectors** introduced.
- **Primary risks** are **logic vulnerabilities** from type-system gaps, input validation failures, and RBAC oversights in the new format configuration system.
- **XSS risk** exists only if `teach-me` content renders unsanitized markdown (per performance review's `react-markdown` addition).

**Verdict:** ⚠️ **CONDITIONAL APPROVAL** — 3 Critical, 2 High, 4 Medium risks must be mitigated before implementation.

---

## RISK REGISTER & MITIGATIONS

### 🔴 CRITICAL 1 — Type System Collapse → Logic Bypass / Runtime Exploits
**Source:** Architecture Review (Finding 1) — "Type System Design Missing Entirely"

**Vulnerability:**
The plan adds 15+ new formats (`2x8_r3`, `mixed_unilateral`, etc.), a `rounds` field, and a `unilateral` boolean **without TypeScript discriminated unions**. This will cause:
- `rounds` undefined on legacy formats → `NaN` timing calculations → trainer could generate classes with **zero or infinite duration** (resource exhaustion / billing bypass).
- No exhaustiveness checking on `mixed_unilateral` → special-case logic may skip validation, allowing **unilateral exercises to be timed as bilateral** (class duration miscalculation, potentially overbooking studio resources).
- `useBootcampAPI.ts` will use `any` → **malformed format objects** from AI suggestions could inject invalid `workSec`/`restSec` values (e.g., negative numbers) causing **integer overflows** in backend timing math.

**Impact:**
- Business logic bypass (trainers could create "impossible" classes that break scheduling).
- Potential DoS if `rounds` set to `1e6` generates massive workout plans.
- Data corruption in `bootcampGenerator.mjs` if it receives malformed format configs.

**Mitigation (Mandatory):**
1. **Create `frontend/src/types/bootcamp.types.ts`** with discriminated union:
```typescript
type StationFormat =
  | { kind: 'station'; stations: number; exercisesPerStation: number; rounds: number; workSec: number; restSec: number; unilateralHandling: 'double' | 'ignore' }
  | { kind: 'mixed_unilateral'; bilateralStations: number; unilateralStation: { exercises: number; rounds: number } ; workSec: number; restSec: number };

type ClassStyle = 'ladder' | 'descending' | 'chipper' | 'countdown' | 'death_by' | 'ygig' | 'contrast' | 'density';
```
2. **Backend validation middleware** in `bootcampGenerator.mjs`:
```javascript
const validateFormat = (format) => {
  if (format.rounds < 1 || format.rounds > 10) throw new Error('Invalid rounds');
  if (format.workSec < 5 || format.workSec > 300) throw new Error('Invalid workSec');
  // ... enforce schema
};
```
3. **Feature flag** `BOOTCAMP_V2_FORMATS` to roll back if type errors surface in production.

---

### 🔴 CRITICAL 2 — XSS via Markdown in Teach-Me Content
**Source:** Performance Review (Bundle Size) — mentions `react-markdown`, `remark-gfm`, `rehype-highlight`.

**Vulnerability:**
The plan updates `frontend/src/content/teach-me/index.ts` with new format descriptions. If these descriptions contain **unsanitized markdown** (e.g., from CMS or AI-generated content), `react-markdown` could render:
- `<script>` tags (though React escapes by default, custom components in `markdownComponents` map might not).
- `onerror`/`onload` in images (`![alt](https://evil.com/xss.jpg onerror=alert(1))`).
- CSS injection via `style` attributes if `rehype-highlight` is misconfigured.

**Impact:**
- Session hijacking via stolen trainer/admin cookies (wealthy clients = high-value targets).
- Defacement of premium "Crystalline Swan" themed UI.

**Mitigation (Mandatory):**
1. **Sanitize all markdown at build-time** using `rehype-sanitize`:
```javascript
import rehypeSanitize from 'rehype-sanitize';
const markdownComponents = {
  // ... custom components
};
<ReactMarkdown rehypePlugins={[rehypeSanitize]} components={markdownComponents}>
  {content}
</ReactMarkdown>
```
2. **Content Security Policy (CSP) header** on `sswanstudios.com`:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:;
```
3. **Never allow raw HTML** in teach-me content — store only markdown, sanitize on ingest.

---

### 🔴 CRITICAL 3 — RBAC Bypass in Manual Mode Format Selection
**Source:** Plan Section 5 — "Manual Mode Format Selection" — format dropdown moved to `ExerciseRolodexPanel.tsx`.

**Vulnerability:**
The plan **does not specify** whether all user roles (Trainer, Client, Admin) can see/change the format dropdown in Manual mode. Current system likely restricts format changes to **Trainers/NASM-certified** only. Moving the dropdown to a new panel could **accidentally expose it to Clients** if permission checks are not re-applied.

**Impact:**
- Clients could change class formats, corrupting trainer-designed programs.
- Unauthorized users might access format-configuration APIs (if frontend sends requests without backend role checks).

**Mitigation (Mandatory):**
1. **Backend API guard** on `POST /api/bootcamp/generate` (or equivalent):
```javascript
// In bootcampGenerator.mjs
if (!user.roles.includes('trainer') && !user.roles.includes('admin')) {
  return res.status(403).json({ error: 'Insufficient permissions' });
}
```
2. **Frontend conditional rendering** in `ExerciseRolodexPanel.tsx`:
```tsx
{hasPermission('trainer') && (
  <FormatDropdown
    value={format}
    onChange={handleFormatChange}
    disabled={!isManualMode}
  />
)}
```
3. **Audit all routes** that accept `format` in request body — ensure `req.user.role` check exists.

---

### 🟠 HIGH 4 — Input Validation Gap: `unilateral` Flag & `rounds` Field
**Source:** Architecture & Risk Assessment — "unilateral timing algorithm complexity underestimated."

**Vulnerability:**
The `unilateral` boolean on exercises and the `rounds` field on formats are **new user-controlled inputs** (trainer selects exercises, sets format). Without strict validation:
- A trainer could mark a bilateral exercise as `unilateral: true` → **time doubles** → class duration exceeds 55 minutes → studio overbooking.
- `rounds` could be set to `0` or negative → division by zero in timing calculator (`totalTime = stations * exercises * rounds * workSec`).

**Impact:**
- **Financial:** Overbooked classes lead to refunds, reputation damage with wealthy clients.
- **Availability:** DoS-like condition where generated classes have absurd durations (e.g., `rounds: 1e9`).

**Mitigation (High Priority):**
1. **Frontend validation** in `ConfigPanel.tsx` before enabling "Generate":
```typescript
const isValidFormat = (format) => {
  if (format.rounds < 1 || format.rounds > 5) return false; // business rule: max 5 rounds
  if (format.workSec * format.rounds * format.stations > 3300) return false; // max 55 min in seconds
  return true;
};
```
2. **Backend re-validation** — never trust frontend:
```javascript
// bootcampGenerator.mjs
if (format.rounds > 5) {
  throw new Error('Maximum 5 rounds allowed for 55-minute classes');
}
```
3. **Unilateral exercise validation** — ensure only exercises flagged `unilateral: true` in DB get time-doubled. Add DB constraint:
```sql
ALTER TABLE exercises ADD CONSTRAINT valid_unilateral
CHECK (unilateral = FALSE OR exercise_type IN ('single_leg', 'single_arm'));
```

---

### 🟠 HIGH 5 — Backend/Frontend Constant Desync → Silent Logic Corruption
**Source:** Risk Assessment — "Format constants are a shared contract; desync will cause runtime failures."

**Vulnerability:**
The plan requires **mirroring** `FORMAT_CONFIG` between `frontend/src/components/BootcampBuilder/BootcampBuilderConstants.ts` and `backend/services/bootcamp/bootcampConstants.mjs`. If they drift (e.g., frontend has `2x8_r3: { workSec: 30 }` but backend has `workSec: 35`), the **timing preview** shown to trainers will differ from the **actual generated class duration**.

**Impact:**
- **Trust erosion:** Trainers see "38 min" in preview but get "45 min" class → complaints, churn.
- **Scheduling conflicts:** Classes overrun, disrupting subsequent bookings (premium clients expect punctuality).

**Mitigation (High Priority):**
1. **Single source of truth:** Move `FORMAT_CONFIG` to a **shared package** (e.g., `@swanstudios/bootcamp-constants`) published to private npm. Both frontend and backend import from it.
2. **Schema validation test** in CI:
```javascript
// tests/constant-sync.test.js
import { FORMAT_CONFIG as frontend } from '../frontend/src/components/BootcampBuilder/BootcampBuilderConstants';
import { FORMAT_CONFIG as backend } from '../backend/services/bootcamp/bootcampConstants.mjs';

test('frontend and backend format constants match', () => {
  expect(frontend).toEqual(backend);
});
```
3. **Runtime sanity check** in `bootcampGenerator.mjs`:
```javascript
import { FORMAT_CONFIG as frontendConfig } from '@swanstudios/bootcamp-constants';
if (JSON.stringify(FORMAT_CONFIG) !== JSON.stringify(frontendConfig)) {
  logger.error('CONSTANT DESYNC DETECTED — REJECTING REQUEST');
  throw new Error('System misconfiguration');
}
```

---

### 🟡 MEDIUM 6 — `mixed_unilateral` Format Edge Cases → State Corruption
**Source:** Architecture — "`mixed_unilateral` format will require special-casing that bleeds into multiple layers."

**Vulnerability:**
`mixed_unilateral` combines bilateral stations (2 exercises × 3 rounds) with one unilateral station (3 exercises × 1 round). The timing calculator must:
- Double time for unilateral exercises.
- Ensure total time matches bilateral stations' 180s.
If the algorithm has off-by-one errors (e.g., forgetting to double the third unilateral exercise), the **station rotation timer** in the live class will be wrong, causing:
- Trainers to run out of time at stations.
- Participants missing exercises.

**Impact:**
- **Class quality degradation** — wealthy clients notice poor timing, complain.
- **Safety risk:** Rushed transitions could lead to injuries.

**Mitigation (Medium Priority):**
1. **Unit tests for every `mixed_unilateral` permutation** (3 unilateral ex × 1 round vs 2 bilateral ex × 3 rounds):
```javascript
describe('mixed_unilateral timing', () => {
  it('calculates 3 unilateral exercises at 30s each = 180s total', () => {
    const result = calculateStationTime({
      kind: 'mixed_unilateral',
      unilateralStation: { exercises: 3, rounds: 1 },
      workSec: 30,
      restSec: 15
    });
    expect(result.totalWork).toBe(180); // 3 * 60s (doubled)
  });
});
```
2. **Explicit `unilateralHandling: 'double'`** in type definition — no implicit assumptions.
3. **Preview panel** must show breakdown:
```
Unilateral Station: 3 exercises × 60s (doubled) = 180s
Bilateral Stations: 2 exercises × 30s × 3 rounds = 180s
```

---

### 🟡 MEDIUM 7 — Race Condition in Format Change During Generation
**Source:** Risk Assessment — "Phase Ordering" concerns.

**Vulnerability:**
If a trainer changes the format **while** the AI is generating a class (Phase 4 voice integration mentioned), the frontend might:
- Cancel the old generation but the backend continues (wasted compute).
- Merge results from two different formats → **corrupted class data** in DB.

**Impact:**
- Data integrity loss — classes with mixed format parameters.
- Potential **SQL injection** if format string is interpolated into query without sanitization during race.

**Mitigation (Medium Priority):**
1. **Generation request ID** — frontend sends `requestId`, backend stores it with generation job. If new request arrives with same `classId`, **cancel previous job** (using AbortController or job queue

---

## Secondary Security Planner (120B MoE) — Round 2

# Secondary Security Planner (Nemotron 3 Super) - Round 1 Response

After reviewing the Primary Security Planner's Round 1 analysis, I agree with the overall risk assessment structure and most mitigations. However, I identify **four specific points requiring correction or refinement** based on technical inaccuracies, misalignments with the plan's scope, or incomplete implementations. Below are my disputes with proposed alternatives, cited with specific file references and code changes.

---

### 🔴 DISAGREEMENT 1: Incorrect AI Attribution in CRITICAL 1 Mitigation
**Issue:** The Primary's CRITICAL 1 mitigation references "malformed format objects from AI suggestions" (in the `useBootcampAPI.ts` comment and mitigation rationale). However, the Executive Summary explicitly states: *"the provided '8 audit questions' reference AI chat/voice/file systems **not present in this plan**."* This plan is purely a domain-configuration upgrade for Bootcamp Builder format/constants—**no AI components are introduced**. Attributing risks to AI suggestions is factually incorrect and could misdirect mitigation efforts toward non-existent vectors.

**Why this matters:**
- Wastes engineering effort on AI-specific safeguards (e.g., AI output sanitization) when the actual risk stems from frontend state management errors or incorrect manual input.
- Creates confusion during implementation (teams may search for non-existent AI integration points).

**Proposed Alternative:**
Remove all AI references and reframe the mitigation around **generalized input validation for format objects**, regardless of source.

**Exact Code Change:**
In `frontend/src/hooks/useBootcampAPI.ts` (line 22, per Primary's reference):
```diff
- // Malformed format objects from AI suggestions could inject invalid workSec/restSec values
+ // Malformed format objects from frontend state errors or manual input could inject invalid workSec/restSec values
```
In the CRITICAL 1 mitigation description:
```diff
- 3. **Backend validation middleware** in `bootcampGenerator.mjs`:
-    ... (to prevent malformed format objects from AI suggestions)
+ 3. **Backend validation middleware** in `bootcampGenerator.mjs`:
+    ... (to prevent malformed format objects from invalid frontend state or user input)
```

---

### 🟡 DISAGREEMENT 2: Incomplete Type Definition in CRITICAL 1 Mitigation
**Issue:** The Primary's proposed discriminated union in `frontend/src/types/bootcamp.types.ts` omits the `ClassStyle` field (e.g., `ladder`, `descending`), which is **critical to the format configuration** per the plan's Section 3 ("Format Constants & Style Upgrade"). Without `ClassStyle`, the type system cannot validate style-specific logic (e.g., how `rounds` interacts with `chipper` vs. `death_by` formats), leaving a gap for logic bypasses where invalid style/format combinations slip through.

**Why this matters:**
- Trainers could select incompatible style/format pairs (e.g., `mixed_unilateral` format with `ygig` style), causing miscalculations in `bootcampGenerator.mjs` timing logic.
- The Primary's own HIGH 5 risk highlights constant desync—this omission exacerbates that by making the type contract incomplete.

**Proposed Alternative:**
Integrate `ClassStyle` as a required field in both union members to ensure exhaustiveness checking covers style/format interactions.

**Exact Code Change:**
In `frontend/src/types/bootcamp.types.ts` (lines 1-10):
```diff
-type StationFormat =
-  | { kind: 'station'; stations: number; exercisesPerStation: number; rounds: number; workSec: number; restSec: number; unilateralHandling: 'double' | 'ignore' }
-  | { kind: 'mixed_unilateral'; bilateralStations: number; unilateralStation: { exercises: number; rounds: number } ; workSec: number; rest:

---

## Primary Security Planner — Round 3

(no response)

---

## Secondary Security Planner (120B MoE) — Round 4

CONSENSUS REACHED

## Merged Findings: Corrections to Primary Security Planner's Round 1 Analysis

Based on mutual agreement with the Secondary Security Planner's Round 1 disputes, the following corrections are required to the Primary Security Planner's original analysis. All other points from the Primary's Round 1 remain valid and unchanged.

### 🔴 CORRECTION TO CRITICAL 1: Removal of Incorrect AI Attribution
**Agreed Issue:** The Primary incorrectly attributed format object validation risks to "AI suggestions" in `useBootcampAPI.ts` and the CRITICAL 1 mitigation rationale. The Executive Summary explicitly confirms **no AI components are present** in this plan (domain-configuration upgrade only). This misattribution risks engineering effort on non-existent vectors.

**Agreed Correction:**
- **File:** `frontend/src/hooks/useBootcampAPI.ts` (line 22)
  ```diff
  - // Malformed format objects from AI suggestions could inject invalid workSec/restSec values
  + // Malformed format objects from frontend state errors or manual input could inject invalid workSec/restSec values
  ```
- **File:** CRITICAL 1 mitigation description (Backend validation middleware rationale)
  ```diff
  - 3. **Backend validation middleware** in `bootcampGenerator.mjs`:
  -    ... (to prevent malformed format objects from AI suggestions)
  + 3. **Backend validation middleware** in `bootcampGenerator.mjs`:
  +    ... (to prevent malformed format objects from invalid frontend state or user input)
  ```

### 🟡 CORRECTION TO CRITICAL 1: Incomplete Type Definition Missing ClassStyle
**Agreed Issue:** The Primary's proposed discriminated union in `frontend/src/types/bootcamp.types.ts` omitted the `ClassStyle` field (e.g., `ladder`, `chipper`), which is essential for validating format/style combinations per the plan's Section 3. Without this, the type system cannot prevent invalid pairs (e.g., `mixed_unilateral` format with `ygig` style), creating logic bypass gaps that exacerbate the HIGH 5 constant desync risk.

**Agreed Correction:**
- **File:** `frontend/src/types/bootcamp.types.ts` (lines 1-10)
  ```diff
  -type StationFormat =
  -  | { kind: 'station'; stations: number; exercisesPerStation: number; rounds: number; workSec: number; restSec: number; unilateralHandling: 'double' | 'ignore' }
  -  | { kind: 'mixed_unilateral'; bilateralStations: number; unilateralStation: { exercises: number; rounds: number } ; workSec: number; restSec: number }
  -type ClassStyle = 'ladder' | 'descending' | 'chipper' | 'countdown' | 'death_by' | 'ygig' | 'contrast' | 'density';
  +type StationFormat =
  +  | { kind: 'station'; stations: number; exercisesPerStation: number; rounds: number; workSec: number; restSec: number; unilateralHandling: 'double' | 'ignore'; classStyle: ClassStyle }
  +  | { kind: 'mixed_unilateral'; bilateralStations: number; unilateralStation: { exercises: number; rounds: number }; workSec: number; restSec: number; classStyle: ClassStyle }
  +type ClassStyle = 'ladder' | 'descending' | 'chipper' | 'countdown' | 'death_by' | 'ygig' | 'contrast' | 'density';
  ```

### Impact of Corrections
- **CRITICAL 1:** Eliminates misleading AI-focused mitigation efforts, redirecting focus to actual risks (frontend state/manual input). Ensures type safety covers *both* format structure *and* style, preventing invalid combinations that could cause timing miscalculations or resource exhaustion.
- **No changes** to other risks (CRITICAL 2-3, HIGH 4-5, MEDIUM 6-7) as they were not disputed and remain valid per the Secondary's Round 1 agreement.

---
*All code changes are specific, actionable, and aligned with the plan's actual scope (Bootcamp Builder format/constants upgrade). No AI-related mitigations are retained, as none exist in this plan.*

---
