/**
 * V3b.1 (2026-05-03) — Rolodex SECTION_PATTERNS filter regression tests
 * ======================================================================
 *
 * Sean's complaint 2026-05-03 (V3 §L5-L7): when the trainer opens
 * Warmup/Corrective, Balance/Core/Stability, or Cooldown/Recovery
 * sections of the Workout Logger, only ~5 exercises appear. The seeded
 * NASM database (`backend/seeders/20260228-seed-nasm-comprehensive-exercises.mjs`)
 * has 183+ exercises across these categories — the filter is the bug,
 * not the data.
 *
 * Pre-V3b.1 filter (NASMExerciseRolodex.tsx:84-103):
 *   warmup       categories=['recovery']  types=['flexibility']
 *   balance_core categories=['core']       types=[]               ← empty types list!
 *   cooldown     categories=['recovery']   types=[]               ← empty types list!
 *
 * The seeder emits exerciseType values: 'balance', 'stability',
 * 'stabilizers', 'core', 'flexibility', 'injury_prevention',
 * 'injury_recovery'. Most of these are SILENTLY EXCLUDED by the filter.
 *
 * Post-V3b.1: the expanded filter must catch every seeded NASM exercise
 * that belongs in each protocol section.
 *
 * These tests are pinned to the SECTION_PATTERNS source-of-truth via
 * a re-export so we can exercise the filter directly without mounting
 * the full virtualized rolodex.
 */

import { describe, it, expect } from 'vitest';
import {
  matchesSectionContextForTesting,
  type ExerciseSlimSubset,
} from './NASMExerciseRolodex.sectionFilter';

// ─── Seeded NASM exercise shapes (from comprehensive seeder) ──────────

const buildSeededExercise = (overrides: Partial<ExerciseSlimSubset>): ExerciseSlimSubset => ({
  id: 'fx-' + Math.random().toString(36).slice(2, 8),
  name: 'Test Exercise',
  exerciseType: 'compound',
  bodyPartCategory: 'Full Body',
  ...overrides,
});

// Mirrors what the comprehensive NASM seeder writes for the 30
// balance/stability/stabilizers exercises, the 24 injury_prevention,
// the 25 injury_recovery, and the 20 flexibility entries.
const seededExercises: ExerciseSlimSubset[] = [
  // BALANCE (10 in seeder)
  buildSeededExercise({ id: 'b1', name: 'Single-Leg Balance Reach', exerciseType: 'balance', bodyPartCategory: 'Core' }),
  buildSeededExercise({ id: 'b2', name: 'BOSU Squat', exerciseType: 'balance', bodyPartCategory: 'Legs' }),
  buildSeededExercise({ id: 'b3', name: 'Single-Leg Romanian Deadlift', exerciseType: 'balance', bodyPartCategory: 'Legs' }),

  // STABILITY (10 in seeder)
  buildSeededExercise({ id: 's1', name: 'Stability Ball Push-Up', exerciseType: 'stability', bodyPartCategory: 'Chest' }),
  buildSeededExercise({ id: 's2', name: 'Pallof Press', exerciseType: 'stability', bodyPartCategory: 'Core' }),
  buildSeededExercise({ id: 's3', name: 'Single-Arm Cable Row', exerciseType: 'stability', bodyPartCategory: 'Back' }),

  // STABILIZERS (10 in seeder)
  buildSeededExercise({ id: 'st1', name: 'Wall Slides', exerciseType: 'stabilizers', bodyPartCategory: 'Shoulders' }),
  buildSeededExercise({ id: 'st2', name: 'Scapular Pull-Up', exerciseType: 'stabilizers', bodyPartCategory: 'Back' }),

  // CORE (15 in seeder)
  buildSeededExercise({ id: 'c1', name: 'Plank', exerciseType: 'core', bodyPartCategory: 'Core' }),
  buildSeededExercise({ id: 'c2', name: 'Dead Bug', exerciseType: 'core', bodyPartCategory: 'Core' }),
  buildSeededExercise({ id: 'c3', name: 'Bird Dog', exerciseType: 'core', bodyPartCategory: 'Core' }),

  // INJURY_PREVENTION (24 in seeder) — these are corrective warmup work
  buildSeededExercise({ id: 'ip1', name: 'Foam Roll Adductors', exerciseType: 'injury_prevention', bodyPartCategory: 'Recovery' }),
  buildSeededExercise({ id: 'ip2', name: 'Glute Activation Bridge', exerciseType: 'injury_prevention', bodyPartCategory: 'Glutes' }),
  buildSeededExercise({ id: 'ip3', name: 'Tibialis Anterior Raise', exerciseType: 'injury_prevention', bodyPartCategory: 'Legs' }),
  buildSeededExercise({ id: 'ip4', name: 'Cervical Retraction (Chin Tuck)', exerciseType: 'injury_prevention', bodyPartCategory: 'Neck' }),

  // INJURY_RECOVERY (25 in seeder) — recovery / cooldown work
  buildSeededExercise({ id: 'ir1', name: '90/90 Hip Stretch', exerciseType: 'injury_recovery', bodyPartCategory: 'Recovery' }),
  buildSeededExercise({ id: 'ir2', name: "Child's Pose", exerciseType: 'injury_recovery', bodyPartCategory: 'Recovery' }),
  buildSeededExercise({ id: 'ir3', name: 'Diaphragmatic Breathing', exerciseType: 'injury_recovery', bodyPartCategory: 'Recovery' }),

  // FLEXIBILITY (20 in seeder) — warmup AND cooldown
  buildSeededExercise({ id: 'f1', name: 'Standing Quad Stretch', exerciseType: 'flexibility', bodyPartCategory: 'Recovery' }),
  buildSeededExercise({ id: 'f2', name: 'Hamstring Stretch', exerciseType: 'flexibility', bodyPartCategory: 'Recovery' }),

  // CONTROL: a regular compound exercise that should NOT match any protocol section
  buildSeededExercise({ id: 'ctrl1', name: 'Barbell Bench Press', exerciseType: 'compound', bodyPartCategory: 'Chest' }),
  buildSeededExercise({ id: 'ctrl2', name: 'Conventional Deadlift', exerciseType: 'compound', bodyPartCategory: 'Back' }),
];

const filterBy = (ctx: 'warmup' | 'balance_core' | 'cooldown') =>
  seededExercises.filter(ex => matchesSectionContextForTesting(ex, ctx));

// ─── WARMUP filter ────────────────────────────────────────────────────

describe('SECTION_PATTERNS warmup filter (V3b.1 expansion)', () => {
  it('catches flexibility exercises (pre-V3b.1: was already correct)', () => {
    const matched = filterBy('warmup');
    expect(matched.some(ex => ex.id === 'f1')).toBe(true);
    expect(matched.some(ex => ex.id === 'f2')).toBe(true);
  });

  it('catches injury_prevention corrective drills (V3b.1 NEW — was excluded)', () => {
    const matched = filterBy('warmup');
    expect(matched.some(ex => ex.id === 'ip1')).toBe(true); // Foam roll adductors
    expect(matched.some(ex => ex.id === 'ip2')).toBe(true); // Glute activation bridge
    expect(matched.some(ex => ex.id === 'ip3')).toBe(true); // Tibialis anterior raise
    expect(matched.some(ex => ex.id === 'ip4')).toBe(true); // Chin tuck
  });

  it('does NOT catch normal compound exercises', () => {
    const matched = filterBy('warmup');
    expect(matched.some(ex => ex.id === 'ctrl1')).toBe(false);
    expect(matched.some(ex => ex.id === 'ctrl2')).toBe(false);
  });
});

// ─── BALANCE / CORE / STABILITY filter ────────────────────────────────

describe('SECTION_PATTERNS balance_core filter (V3b.1 expansion)', () => {
  it('catches balance exercises by exerciseType (V3b.1 NEW — was excluded)', () => {
    const matched = filterBy('balance_core');
    expect(matched.some(ex => ex.id === 'b1')).toBe(true);
    expect(matched.some(ex => ex.id === 'b2')).toBe(true);
    expect(matched.some(ex => ex.id === 'b3')).toBe(true);
  });

  it('catches stability exercises by exerciseType (V3b.1 NEW — was excluded)', () => {
    const matched = filterBy('balance_core');
    expect(matched.some(ex => ex.id === 's1')).toBe(true);
    expect(matched.some(ex => ex.id === 's2')).toBe(true);
    expect(matched.some(ex => ex.id === 's3')).toBe(true);
  });

  it('catches stabilizers exercises by exerciseType (V3b.1 NEW — was excluded)', () => {
    const matched = filterBy('balance_core');
    expect(matched.some(ex => ex.id === 'st1')).toBe(true);
    expect(matched.some(ex => ex.id === 'st2')).toBe(true);
  });

  it('catches core exercises (pre-V3b.1: was already correct via bodyPartCategory)', () => {
    const matched = filterBy('balance_core');
    expect(matched.some(ex => ex.id === 'c1')).toBe(true);
    expect(matched.some(ex => ex.id === 'c2')).toBe(true);
    expect(matched.some(ex => ex.id === 'c3')).toBe(true);
  });

  it('does NOT catch compound chest/back exercises', () => {
    const matched = filterBy('balance_core');
    expect(matched.some(ex => ex.id === 'ctrl1')).toBe(false);
    expect(matched.some(ex => ex.id === 'ctrl2')).toBe(false);
  });

  it('aggregate: balance_core matches >= 11 of the 11 seeded balance/stability/stabilizers/core fixtures', () => {
    const matched = filterBy('balance_core');
    expect(matched.length).toBeGreaterThanOrEqual(11);
  });
});

// ─── COOLDOWN / RECOVERY filter ───────────────────────────────────────

describe('SECTION_PATTERNS cooldown filter (V3b.1 expansion)', () => {
  it('catches injury_recovery exercises by exerciseType (V3b.1 NEW — was excluded)', () => {
    const matched = filterBy('cooldown');
    expect(matched.some(ex => ex.id === 'ir1')).toBe(true);
    expect(matched.some(ex => ex.id === 'ir2')).toBe(true);
    expect(matched.some(ex => ex.id === 'ir3')).toBe(true);
  });

  it('catches flexibility exercises (V3b.1 NEW — pre-V3b.1 was only warmup)', () => {
    // Sean's L8 — cooldown should also include stretches
    const matched = filterBy('cooldown');
    expect(matched.some(ex => ex.id === 'f1')).toBe(true);
    expect(matched.some(ex => ex.id === 'f2')).toBe(true);
  });

  it('does NOT catch normal compound exercises', () => {
    const matched = filterBy('cooldown');
    expect(matched.some(ex => ex.id === 'ctrl1')).toBe(false);
    expect(matched.some(ex => ex.id === 'ctrl2')).toBe(false);
  });
});

// ─── Filter scope sanity: NO accidental cross-section pollution ────

describe('SECTION_PATTERNS — no false positives across sections', () => {
  it('compound chest exercise matches NONE of the protocol sections', () => {
    const ex = buildSeededExercise({ name: 'Bench Press', exerciseType: 'compound', bodyPartCategory: 'Chest' });
    expect(matchesSectionContextForTesting(ex, 'warmup')).toBe(false);
    expect(matchesSectionContextForTesting(ex, 'balance_core')).toBe(false);
    expect(matchesSectionContextForTesting(ex, 'cooldown')).toBe(false);
  });

  it('isolation arm exercise matches NONE of the protocol sections', () => {
    const ex = buildSeededExercise({ name: 'Dumbbell Curl', exerciseType: 'isolation', bodyPartCategory: 'Arms' });
    expect(matchesSectionContextForTesting(ex, 'warmup')).toBe(false);
    expect(matchesSectionContextForTesting(ex, 'balance_core')).toBe(false);
    expect(matchesSectionContextForTesting(ex, 'cooldown')).toBe(false);
  });
});
