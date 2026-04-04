# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 70.6s
> **Files:** docs/ai-workflow/blueprints/BOOTCAMP-FORMAT-COMPREHENSIVE-UPGRADE-PLAN.md
> **Generated:** 4/4/2026, 12:37:07 PM

---

# Architectural Review: Bootcamp Format & Style Comprehensive Upgrade Plan

**Reviewer:** Senior React/TypeScript Architect
**Date:** 2025
**Plan:** `docs/ai-workflow/blueprints/BOOTCAMP-FORMAT-COMPREHENSIVE-UPGRADE-PLAN.md`
**Verdict:** ⚠️ **Conditionally Approved — 6 Critical Issues, 8 Warnings, 4 Recommendations**

---

## Executive Summary

The plan correctly identifies real-world fitness class structure gaps and proposes sensible domain modeling. However, it has significant architectural gaps: no type system design, no state management strategy for the new `rounds` dimension, frontend/backend constant mirroring is a maintenance liability, and the `mixed_unilateral` format will require special-casing that bleeds into multiple layers. The timing calculator is underspecified. These must be resolved before implementation begins.

---

## Finding 1 — CRITICAL | Type System Design Missing Entirely

**File:** `frontend/src/components/BootcampBuilder/BootcampBuilderConstants.ts` + `frontend/src/hooks/useBootcampAPI.ts`

**Issue:** The plan adds 15+ new formats and 8 new styles but proposes no TypeScript type definitions. The current `ClassFormat` is described only as a "type union" with no structure. The new `rounds` field, `unilateral` boolean, and `restSec` are mentioned in prose but never typed. This will cause:
- Runtime errors when `rounds` is `undefined` on legacy formats
- No discriminated union to safely handle `mixed_unilateral` vs standard formats
- `useBootcampAPI.ts` will have `any`-typed format configs within one sprint

**Recommended Fix:**

```typescript
// frontend/src/types/bootcamp.types.ts  (NEW FILE — extract from constants)

// ─── Work/Rest Protocol ───────────────────────────────────────────────────────
interface TimingProtocol {
  workSec: number;
  restSec: number;
}

// ─── Station-Based Format (the new primary format type) ───────────────────────
interface StationFormatConfig extends TimingProtocol {
  kind: 'station';
  stations: number;
  exercisesPerStation: number;
  rounds: number;                    // NEW — times participants repeat at each station
  allowUnilateral?: boolean;         // NEW — enables unilateral time-doubling
}

// ─── Mixed Unilateral (Sean's exact class — needs its own discriminant) ────────
interface MixedUnilateralFormatConfig extends TimingProtocol {
  kind: 'mixed_unilateral';
  bilateralStations: number;
  bilateralExPerStation: number;
  bilateralRounds: number;
  unilateralStations: number;
  unilateralExPerStation: number;
  unilateralRounds: number;          // Will be 1 when bilateral is 3 (time-equalized)
}

// ─── Time-Domain Formats (EMOM, AMRAP, Tabata, etc.) ─────────────────────────
interface TimeDomainFormatConfig {
  kind: 'emom' | 'amrap' | 'tabata' | 'density';
  blockMin?: number;
  rounds?: number;
  workSec?: number;
  restSec?: number;
}

// ─── Style-Specific Formats (Ladder, Chipper, etc.) ──────────────────────────
interface StyleFormatConfig {
  kind: 'ladder' | 'descending' | 'chipper' | 'countdown' | 'death_by' | 'ygig' | 'contrast';
  repScheme?: number[];              // [2,4,6,8,10] for ladder
  timeScheme?: number[];             // [60,45,30,15] for countdown
  workSec?: number;
  restSec?: number;
}

// ─── Discriminated Union ──────────────────────────────────────────────────────
export type FormatConfig =
  | StationFormatConfig
  | MixedUnilateralFormatConfig
  | TimeDomainFormatConfig
  | StyleFormatConfig;

export type FormatId =
  | '2x8_r3' | '2x6_r3' | '2x7_r3' | '2x8_r2' | '2x10_r2'
  | '3x6_r2' | '3x5_r2' | '3x4_r3' | '3x8_r1' | '4x4_r2'
  | '4x5_r2' | '4x6_r1' | '5x4_r1' | '2x5_r4' | 'mixed_unilateral'
  | 'emom' | 'tabata' | 'amrap' | 'circuit' | 'partner' | 'hybrid'
  | 'full_group' | 'ladder' | 'descending' | 'chipper' | 'countdown'
  | 'death_by' | 'ygig' | 'contrast' | 'density';

export type ClassStyle =
  | 'standard' | 'ladder' | 'descending' | 'chipper' | 'countdown'
  | 'death_by' | 'ygig' | 'contrast' | 'density';

export interface FormatDefinition {
  id: FormatId;
  label: string;
  description: string;
  config: FormatConfig;
  estimatedWorkoutMin: number;       // Pre-calculated, not runtime-derived
  estimatedTotalMin: number;         // workoutMin + warmup/cooldown/demo buffer
  fitsBudget: (targetMin: number) => 'green' | 'yellow' | 'red';
}
```

**Severity:** 🔴 CRITICAL — Without this, every file in the plan will have type drift within 2 weeks.

---

## Finding 2 — CRITICAL | Frontend/Backend Constant Mirroring Is a Maintenance Bomb

**Files:** `frontend/src/components/BootcampBuilder/BootcampBuilderConstants.ts` + `backend/services/bootcamp/bootcampConstants.mjs`

**Issue:** The plan explicitly states "must mirror frontend" for the backend constants. With 15+ new formats, this manual mirroring will immediately diverge. The plan adds no mechanism to prevent this. The current backend uses `.mjs` (ESM) while the frontend uses `.ts` — they cannot share a file directly. This is the #1 source of production bugs in this codebase pattern.

**Recommended Fix:**

```
Option A (Preferred): Shared Package
packages/
  bootcamp-formats/
    src/
      formats.ts          ← Single source of truth
      timing.ts           ← calculateWorkoutTime() pure function
      index.ts
    package.json          ← { "name": "@swanstudios/bootcamp-formats" }

frontend/package.json     ← "dependencies": { "@swanstudios/bootcamp-formats": "*" }
backend/package.json      ← same

Option B (Acceptable if monorepo not feasible): API-driven constants
GET /api/bootcamp/formats → returns FormatDefinition[]
Frontend fetches on mount, caches in React Query
Backend is single source of truth
No duplication

Option C (Avoid): Current approach
Manual sync → guaranteed to diverge → production bugs
```

**If Option B is chosen, add to `useBootcampAPI.ts`:**

```typescript
// frontend/src/hooks/useBootcampAPI.ts
export function useBootcampFormats() {
  return useQuery({
    queryKey: ['bootcamp', 'formats'],
    queryFn: () => api.get<FormatDefinition[]>('/api/bootcamp/formats'),
    staleTime: Infinity,             // Formats don't change at runtime
    gcTime: 24 * 60 * 60 * 1000,    // Cache for 24h
  });
}
```

**Severity:** 🔴 CRITICAL — This is a production reliability issue, not a style preference.

---

## Finding 3 — CRITICAL | `calculateWorkoutTime()` Must Be a Pure Function, Not Inline Logic

**Files:** `frontend/src/components/BootcampBuilder/ConfigPanel.tsx` + `frontend/src/components/BootcampBuilder/ClassPreviewPanel.tsx` + `backend/services/bootcamp/bootcampGenerator.mjs`

**Issue:** The plan describes timing preview logic in prose ("show estimated total class time") but proposes no shared calculation function. This means:
1. ConfigPanel will implement timing one way
2. ClassPreviewPanel will implement it another way
3. The backend generator will implement it a third way
4. All three will diverge, especially for `mixed_unilateral` and unilateral time-doubling

The `mixed_unilateral` format is particularly dangerous: 7 bilateral stations (2 ex × 3 rounds × 30s work + 15s rest) + 1 unilateral station (3 ex × 1 round × 60s effective work + 15s rest) requires branching logic that will be copy-pasted incorrectly.

**Recommended Fix:**

```typescript
// frontend/src/utils/bootcamp/timingCalculator.ts  (NEW FILE)
// Also compiled/copied to backend or shared via package

import type { FormatConfig, FormatId } from '../../types/bootcamp.types';

interface TimingResult {
  workoutMinutes: number;
  totalClassMinutes: number;         // workout + 12min buffer (demo/stretch/clear)
  breakdown: StationBreakdown[];
  fitsBudget: (targetMin: number) => 'green' | 'yellow' | 'red';
}

interface StationBreakdown {
  stationIndex: number;
  exerciseCount: number;
  rounds: number;
  effectiveWorkSec: number;          // Accounts for unilateral doubling
  totalStationSec: number;
}

const CLASS_OVERHEAD_MIN = 12;       // Demo + stretch + station clear time

export function calculateWorkoutTime(
  config: FormatConfig,
  exerciseUnilateralFlags?: boolean[]  // Per-exercise unilateral flag
): TimingResult {
  switch (config.kind) {
    case 'station':
      return calculateStationTime(config, exerciseUnilateralFlags);
    case 'mixed_unilateral':
      return calculateMixedUnilateralTime(config);
    case 'emom':
    case 'amrap':
    case 'tabata':
    case 'density':
      return calculateTimeDomainTime(config);
    case 'ladder':
    case 'descending':
    case 'chipper':
    case 'countdown':
    case 'death_by':
    case 'ygig':
    case 'contrast':
      return calculateStyleTime(config);
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = config;
      throw new Error(`Unknown format kind: ${(_exhaustive as FormatConfig).kind}`);
  }
}

function calculateStationTime(
  config: Extract<FormatConfig, { kind: 'station' }>,
  unilateralFlags?: boolean[]
): TimingResult {
  const { stations, exercisesPerStation, rounds, workSec, restSec } = config;

  const breakdown: StationBreakdown[] = Array.from(
    { length: stations },
    (_, i) => {
      // Check if any exercise at this station is unilateral
      // (simplified: assumes exercises are assigned sequentially)
      const hasUnilateral = unilateralFlags?.slice(
        i * exercisesPerStation,
        (i + 1) * exercisesPerStation
      ).some(Boolean) ?? false;

      const effectiveWorkSec = hasUnilateral ? workSec * 2 : workSec;
      const totalStationSec =
        exercisesPerStation * rounds * (effectiveWorkSec + restSec);

      return {
        stationIndex: i,
        exerciseCount: exercisesPerStation,
        rounds,
        effectiveWorkSec,
        totalStationSec,
      };
    }
  );

  const workoutSec = breakdown.reduce((sum, s) => sum + s.totalStationSec, 0);
  const workoutMinutes = Math.ceil(workoutSec / 60);
  const totalClassMinutes = workoutMinutes + CLASS_OVERHEAD_MIN;

  return {
    workoutMinutes,
    totalClassMinutes,
    breakdown,
    fitsBudget: (targetMin) => {
      const buffer = targetMin - totalClassMinutes;
      if (buffer >= 5) return 'green';
      if (buffer >= 0) return 'yellow';
      return 'red';
    },
  };
}

// Hook wrapper for React components
export function useTimingCalculator(
  config: FormatConfig | null,
  unilateralFlags?: boolean[]
) {
  return useMemo(
    () => config ? calculateWorkoutTime(config, unilateralFlags) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, JSON.stringify(unilateralFlags)]  // unilateralFlags array needs stable ref
  );
}
```

**Severity:** 🔴 CRITICAL — Without this, timing will be wrong in at least one of the three places it's calculated.

---

## Finding 4 — CRITICAL | `mixed_unilateral` Format Requires Special-Casing Across All Layers

**Files:** `ConfigPanel.tsx`, `ClassPreviewPanel.tsx`, `ExerciseRolodexPanel.tsx`, `bootcampGenerator.mjs`

**Issue:** `mixed_unilateral` is not just another format — it's a composite format with two different station types (bilateral + unilateral) each with different `rounds` values. The plan treats it as a single dropdown entry but it requires:
- Two separate station groups in the data model
- Different exercise assignment UI (bilateral pool vs unilateral pool)
- Different timing calculation (as shown in Finding 3)
- Different backend generation logic
- Different preview rendering in `ClassPreviewPanel`

The plan does not address any of this. If `mixed_unilateral` is shoehorned into the same `FormatConfig` shape as `2x8_r3`, the backend generator will break silently.

**Recommended Fix:**

```typescript
// This format needs a dedicated sub-component in ClassPreviewPanel

// frontend/src/components/BootcampBuilder/preview/MixedUnilateralPreview.tsx
interface MixedUnilateralPreviewProps {
  config: MixedUnilateralFormatConfig;
  bilateralExercises: Exercise[];
  unilateralExercises: Exercise[];
  timing: TimingResult;
}

// And a dedicated section in ExerciseRolodexPanel
// frontend/src/components/BootcampBuilder/rolodex/UnilateralExerciseSection.tsx
// Shows exercises flagged as unilateral separately, with "(L+R)" badge

// Backend: bootcampGenerator.mjs needs explicit branch
function generateWorkout(formatId: FormatId, config: FormatConfig) {
  if (config.kind === 'mixed_unilateral') {
    return generateMixedUnilateralWorkout(config);  // Separate function
  }
  // ... rest of generation
}
```

**Also required:** Add `unilateral: boolean` to the Exercise model/type and seed it for the 840+ exercise database. This is a data migration, not just a UI change. The plan does not mention this migration.

**Severity:** 🔴 CRITICAL — This format will not work correctly without explicit data model support.

---

## Finding 5 — CRITICAL | `BootcampBuilderPage.tsx` Will Exceed 300-Line Budget

**File:** `frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx`

**Issue:** The plan adds Manual mode format picker + timing preview to `BootcampBuilderPage.tsx`. This file already orchestrates AI mode vs Manual mode, the Rolodex panel, the Config panel, and the Preview panel. Adding format selection state + timing preview state + the new `rounds` dimension to this file will push it well past 300 lines. Based on the current scope, estimate: **450-600 lines**.

**Recommended Fix — Extract these responsibilities:**

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
