/**
 * ============================================================================
 * FILE: NASMProtocolDefaults.ts
 * PURPOSE: Comprehensive NASM protocol exercise lists for warmup, balance/core,
 *          and cooldown sections — replaces hardcoded 6/5/4 items
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-21
 * AI VILLAGE VALIDATED: 2026-03-21
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exports typed arrays of NASMItem[] for each protocol
 * section. Each item has a unique ID, name, category tag, recommended OPT
 * phases, and default completion state.
 *
 * HOW IT FITS: WorkoutLogger.tsx imports these arrays as initial state for
 * warmupItems, balanceCoreItems, and cooldownItems instead of hardcoding.
 *
 * KEY DECISIONS: All items included per NASM-CPT textbook. Trainer can
 * uncheck items they don't need — better to have all options than too few.
 */

import type { NASMItem } from './NASMProtocolSection';

// ─── Category Tags (for section-aware filtering) ────────────────────

export type NASMCategory =
  | 'smr'
  | 'static_stretch'
  | 'dynamic'
  | 'balance'
  | 'core'
  | 'stability'
  | 'static_cooldown'
  | 'recovery';

export interface NASMDefaultItem extends NASMItem {
  category: NASMCategory;
  /** Which OPT phases this item is recommended for (1-5) */
  phases: number[];
}

// ─── Helper ──────────────────────────────────────────────────────────

let idCounter = 0;
const item = (
  prefix: string,
  name: string,
  category: NASMCategory,
  phases: number[] = [1, 2, 3, 4, 5],
): NASMDefaultItem => ({
  id: `${prefix}-${++idCounter}`,
  name,
  category,
  phases,
  completed: false,
});

// ─── Warmup & Corrective (~25 items) ────────────────────────────────

idCounter = 0;
export const DEFAULT_WARMUP_ITEMS: NASMDefaultItem[] = [
  // SMR / Foam Rolling (8)
  item('warmup', 'Foam Roll — IT Band / TFL (1 min each)', 'smr'),
  item('warmup', 'Foam Roll — Calves / Gastrocnemius (1 min each)', 'smr'),
  item('warmup', 'Foam Roll — Adductors (1 min each)', 'smr'),
  item('warmup', 'Foam Roll — Piriformis (1 min each)', 'smr'),
  item('warmup', 'Foam Roll — Thoracic Spine (1 min)', 'smr'),
  item('warmup', 'Foam Roll — Latissimus Dorsi (1 min each)', 'smr'),
  item('warmup', 'Foam Roll — Quadriceps (1 min each)', 'smr'),
  item('warmup', 'Foam Roll — Peroneals (1 min each)', 'smr'),

  // Static Stretching (9)
  item('warmup', 'Static Stretch — Hip Flexors (30s each side)', 'static_stretch'),
  item('warmup', 'Static Stretch — Chest / Anterior Deltoid (30s)', 'static_stretch'),
  item('warmup', 'Static Stretch — Hamstrings (30s each)', 'static_stretch'),
  item('warmup', 'Static Stretch — Calves / Gastrocnemius (30s each)', 'static_stretch'),
  item('warmup', 'Static Stretch — Latissimus Dorsi (30s each)', 'static_stretch'),
  item('warmup', 'Static Stretch — Levator Scapulae (30s each)', 'static_stretch'),
  item('warmup', 'Static Stretch — Upper Trapezius (30s each)', 'static_stretch'),
  item('warmup', 'Static Stretch — Soleus (30s each)', 'static_stretch'),
  item('warmup', 'Static Stretch — Adductors (30s each)', 'static_stretch'),

  // Dynamic Warmup (8)
  item('warmup', 'Dynamic — Leg Swings (10 each direction)', 'dynamic'),
  item('warmup', 'Dynamic — Arm Circles (10 each direction)', 'dynamic'),
  item('warmup', 'Dynamic — Walking Lunges (10 each side)', 'dynamic'),
  item('warmup', 'Dynamic — Inch Worms (8 reps)', 'dynamic'),
  item('warmup', 'Dynamic — High Knees (20 total)', 'dynamic'),
  item('warmup', 'Dynamic — Butt Kicks (20 total)', 'dynamic'),
  item('warmup', 'Dynamic — Lateral Shuffles (10 each direction)', 'dynamic'),
  item('warmup', 'Dynamic — Prisoner Squats (10 reps)', 'dynamic'),
];

// ─── Balance, Core & Stability (~20 items) ──────────────────────────

idCounter = 0;
export const DEFAULT_BALANCE_CORE_ITEMS: NASMDefaultItem[] = [
  // Balance (5)
  item('balance', 'Single-Leg Balance — 30s each side', 'balance', [1, 2, 5]),
  item('balance', 'Single-Leg Balance Reach — 10 each side', 'balance', [1, 2, 5]),
  item('balance', 'BOSU Squats — 12 reps', 'balance', [1, 2]),
  item('balance', 'Single-Leg Romanian Deadlift — 10 each', 'balance', [1, 2, 5]),
  item('balance', 'Multiplanar Step-Up to Balance — 8 each', 'balance', [1, 2, 5]),

  // Core Stabilization (9)
  item('balance', 'Plank Hold — 30-60s', 'core'),
  item('balance', 'Side Plank — 20-30s each side', 'core'),
  item('balance', 'Dead Bug — 10 each side', 'core'),
  item('balance', 'Bird Dog — 10 each side', 'core'),
  item('balance', 'Pallof Press — 10 each side', 'core', [2, 3, 4]),
  item('balance', 'Cable Chops — 10 each side', 'core', [2, 3, 4]),
  item('balance', 'Anti-Rotation Press — 10 each side', 'core', [2, 3]),
  item('balance', 'Ball Crunch — 15 reps', 'core', [1, 2]),
  item('balance', 'Drawing-In Maneuver — 3×15s hold', 'core', [1]),

  // Stability (6)
  item('balance', 'TRX Fallout — 10 reps', 'stability', [2, 3]),
  item('balance', 'Half-Kneeling Cable Chop — 10 each', 'stability', [2, 3]),
  item('balance', 'Stability Ball Pike — 10 reps', 'stability', [1, 2]),
  item('balance', 'Prone Iso Ab (Plank Variation) — 20s', 'stability', [1]),
  item('balance', 'Standing Cable Lift — 10 each side', 'stability', [2, 3]),
  item('balance', 'Quadruped Arm/Leg Raise — 10 each', 'stability', [1, 2]),
];

// ─── Cooldown & Recovery (~15 items) ────────────────────────────────

idCounter = 0;
export const DEFAULT_COOLDOWN_ITEMS: NASMDefaultItem[] = [
  // Static Stretches (10)
  item('cooldown', 'Static Stretch — Hamstrings (30s each)', 'static_cooldown'),
  item('cooldown', 'Static Stretch — Quadriceps (30s each)', 'static_cooldown'),
  item('cooldown', 'Static Stretch — Chest & Shoulders (30s each)', 'static_cooldown'),
  item('cooldown', 'Static Stretch — Hip Flexors (30s each)', 'static_cooldown'),
  item('cooldown', 'Static Stretch — Calves (30s each)', 'static_cooldown'),
  item('cooldown', 'Static Stretch — Latissimus Dorsi (30s each)', 'static_cooldown'),
  item('cooldown', 'Static Stretch — Triceps (30s each)', 'static_cooldown'),
  item('cooldown', 'Static Stretch — Glutes / Piriformis (30s each)', 'static_cooldown'),
  item('cooldown', 'Static Stretch — Adductors (30s each)', 'static_cooldown'),
  item('cooldown', 'Static Stretch — Pectorals (30s each)', 'static_cooldown'),

  // Recovery (5)
  item('cooldown', 'Foam Roll Cooldown Pass — Full body (5 min)', 'recovery'),
  item('cooldown', 'Deep Breathing — 5 box breaths (4-4-4-4)', 'recovery'),
  item('cooldown', 'Cat-Cow — 10 reps', 'recovery'),
  item('cooldown', "Child's Pose — 30s hold", 'recovery'),
  item('cooldown', 'Supine Spinal Twist — 20s each side', 'recovery'),
];

// ─── Convenience: Get items filtered by OPT phase ───────────────────

export const getWarmupForPhase = (phase: number): NASMDefaultItem[] =>
  DEFAULT_WARMUP_ITEMS.filter(i => i.phases.includes(phase));

export const getBalanceCoreForPhase = (phase: number): NASMDefaultItem[] =>
  DEFAULT_BALANCE_CORE_ITEMS.filter(i => i.phases.includes(phase));

export const getCooldownForPhase = (phase: number): NASMDefaultItem[] =>
  DEFAULT_COOLDOWN_ITEMS.filter(i => i.phases.includes(phase));

// ─── Compact recommendation helper (2026-04-17) ─────────────────────
//
// Used by `CompactProtocolSection` to surface a short list of
// phase-appropriate items for quick-add chips. Kept as a shared helper
// (not inline in the logger JSX) so Swan Coach / Coach Assistant can
// import the same recommendation source when emitting AI-driven
// protocol suggestions. Section keys match the `sectionContext`
// vocabulary on NASMExerciseRolodex.

export const PROTOCOL_SECTION_KEYS = ['warmup', 'balance_core', 'cooldown'] as const;
export type ProtocolSectionKey = typeof PROTOCOL_SECTION_KEYS[number];

const SECTION_SOURCES: Record<ProtocolSectionKey, NASMDefaultItem[]> = {
  warmup: DEFAULT_WARMUP_ITEMS,
  balance_core: DEFAULT_BALANCE_CORE_ITEMS,
  cooldown: DEFAULT_COOLDOWN_ITEMS,
};

/** Look up a protocol default item by its id across all sections. */
export function findProtocolDefaultById(id: string): NASMDefaultItem | undefined {
  for (const bucket of Object.values(SECTION_SOURCES)) {
    const hit = bucket.find((item) => item.id === id);
    if (hit) return hit;
  }
  return undefined;
}

/** Get the full default list for a given section (all phases). */
export function getAllProtocolDefaultsForSection(
  sectionKey: ProtocolSectionKey,
): NASMDefaultItem[] {
  return SECTION_SOURCES[sectionKey] ?? [];
}

/**
 * Find a protocol default item in a given section whose name contains
 * the supplied fragment (case-insensitive substring match). Used by the
 * AI_TOGGLE_NASM_ITEM bridge to translate assistant-supplied item names
 * into canonical ProtocolSelection records.
 */
export function findProtocolDefaultByName(
  sectionKey: ProtocolSectionKey,
  nameFragment: string,
): NASMDefaultItem | undefined {
  const fragment = nameFragment.trim().toLowerCase();
  if (!fragment) return undefined;
  return SECTION_SOURCES[sectionKey]?.find((item) =>
    item.name.toLowerCase().includes(fragment),
  );
}

/**
 * Return a small curated list of phase-appropriate items for a given
 * protocol section. Bias the sample across the section's category mix
 * (e.g. warmup wants a mix of SMR + stretch + dynamic, not eight foam
 * rolls in a row).
 *
 * @param sectionKey  'warmup' | 'balance_core' | 'cooldown'
 * @param phase       OPT phase 1–5
 * @param limit       Max items to return (default 6)
 */
export function getRecommendedProtocolItems(
  sectionKey: ProtocolSectionKey,
  phase: number,
  limit = 6,
): NASMDefaultItem[] {
  const source = SECTION_SOURCES[sectionKey] ?? [];
  const phaseFiltered = source.filter((i) => i.phases.includes(phase));

  // Round-robin by category so the recommendations don't all come from
  // the same sub-group. If only one category is present, this is a
  // no-op; if several are present, each category gets representation
  // until we hit the limit.
  const byCategory = new Map<NASMCategory, NASMDefaultItem[]>();
  for (const item of phaseFiltered) {
    const bucket = byCategory.get(item.category);
    if (bucket) {
      bucket.push(item);
    } else {
      byCategory.set(item.category, [item]);
    }
  }

  const out: NASMDefaultItem[] = [];
  const buckets = Array.from(byCategory.values());
  let cursor = 0;
  while (out.length < limit && buckets.some((b) => b.length > 0)) {
    const bucket = buckets[cursor % buckets.length];
    if (bucket.length > 0) {
      const picked = bucket.shift();
      if (picked) out.push(picked);
    }
    cursor++;
    // Safety: if we've fully drained all buckets, break.
    if (cursor > phaseFiltered.length + buckets.length) break;
  }

  return out;
}
