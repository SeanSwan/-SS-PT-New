/**
 * oneRepMax — Unit Tests (TDD-first)
 *
 * NASM-aligned 1RM estimation and intensity recommendation utility.
 */
import { describe, it, expect } from 'vitest';
import {
  estimate1RM,
  recommendLoad,
  rpeToIntensityPct,
  intensityPctToReps,
} from '../../services/ai/oneRepMax.mjs';

// ─── Epley Formula Tests ──────────────────────────────────────
describe('oneRepMax — estimate1RM (Epley formula)', () => {
  it('1 — calculates 1RM from weight and reps', () => {
    // Epley: 1RM = weight × (1 + reps / 30)
    // 135 × (1 + 10/30) = 135 × 1.333 = 180
    const result = estimate1RM(135, 10);
    expect(result).toBeCloseTo(180, 0);
  });

  it('2 — returns exact weight for 1 rep', () => {
    const result = estimate1RM(225, 1);
    expect(result).toBeCloseTo(225, 0);
  });

  it('3 — handles high rep ranges', () => {
    const result = estimate1RM(95, 20);
    // 95 × (1 + 20/30) = 95 × 1.667 = 158.3
    expect(result).toBeCloseTo(158.3, 0);
  });

  it('4 — returns null for zero weight', () => {
    expect(estimate1RM(0, 10)).toBeNull();
  });

  it('5 — returns null for zero reps', () => {
    expect(estimate1RM(135, 0)).toBeNull();
  });

  it('6 — returns null for negative inputs', () => {
    expect(estimate1RM(-135, 10)).toBeNull();
    expect(estimate1RM(135, -5)).toBeNull();
  });

  it('7 — returns null for non-numeric inputs', () => {
    expect(estimate1RM('heavy', 10)).toBeNull();
    expect(estimate1RM(135, 'many')).toBeNull();
    expect(estimate1RM(null, 10)).toBeNull();
    expect(estimate1RM(undefined, 10)).toBeNull();
  });
});

// ─── Load Recommendations ─────────────────────────────────────
describe('oneRepMax — recommendLoad', () => {
  it('8 — recommends load for stabilization phase (12-20 reps, 50-70%)', () => {
    // 1RM = 200, phase 1 targets ~60% → 120
    const rec = recommendLoad(200, 1);
    expect(rec.minLoad).toBeGreaterThanOrEqual(100);  // 50%
    expect(rec.maxLoad).toBeLessThanOrEqual(140);      // 70%
    expect(rec.targetReps).toBeTruthy();
    expect(rec.explanation).toBeTruthy();
  });

  it('9 — recommends load for strength endurance phase (8-12 reps, 70-80%)', () => {
    const rec = recommendLoad(200, 2);
    expect(rec.minLoad).toBeGreaterThanOrEqual(140);  // 70%
    expect(rec.maxLoad).toBeLessThanOrEqual(160);      // 80%
  });

  it('10 — recommends load for hypertrophy phase (6-12 reps, 75-85%)', () => {
    const rec = recommendLoad(200, 3);
    expect(rec.minLoad).toBeGreaterThanOrEqual(150);  // 75%
    expect(rec.maxLoad).toBeLessThanOrEqual(170);      // 85%
  });

  it('11 — recommends load for maximal strength (1-5 reps, 85-100%)', () => {
    const rec = recommendLoad(200, 4);
    expect(rec.minLoad).toBeGreaterThanOrEqual(170);  // 85%
    expect(rec.maxLoad).toBeLessThanOrEqual(200);      // 100%
  });

  it('12 — recommends load for power phase (1-5 reps, 30-45% or 85-100%)', () => {
    const rec = recommendLoad(200, 5);
    expect(rec.explanation).toContain('power');
  });

  it('13 — returns null recommendation for null 1RM', () => {
    const rec = recommendLoad(null, 1);
    expect(rec).toBeNull();
  });

  it('14 — returns null for invalid phase', () => {
    const rec = recommendLoad(200, 0);
    expect(rec).toBeNull();
  });
});

// ─── RPE to Intensity Mapping ─────────────────────────────────
describe('oneRepMax — rpeToIntensityPct', () => {
  it('15 — RPE 10 maps to ~100%', () => {
    expect(rpeToIntensityPct(10)).toBeCloseTo(100, 0);
  });

  it('16 — RPE 7 maps to ~77-82%', () => {
    const pct = rpeToIntensityPct(7);
    expect(pct).toBeGreaterThanOrEqual(75);
    expect(pct).toBeLessThanOrEqual(85);
  });

  it('17 — RPE 5 maps to ~65-72%', () => {
    const pct = rpeToIntensityPct(5);
    expect(pct).toBeGreaterThanOrEqual(60);
    expect(pct).toBeLessThanOrEqual(75);
  });

  it('18 — returns null for out-of-range RPE', () => {
    expect(rpeToIntensityPct(0)).toBeNull();
    expect(rpeToIntensityPct(11)).toBeNull();
    expect(rpeToIntensityPct(null)).toBeNull();
  });
});

// ─── Intensity % to Rep Range ─────────────────────────────────
describe('oneRepMax — intensityPctToReps', () => {
  it('19 — 100% maps to 1 rep', () => {
    expect(intensityPctToReps(100)).toBe(1);
  });

  it('20 — 75% maps to ~10 reps', () => {
    const reps = intensityPctToReps(75);
    expect(reps).toBeGreaterThanOrEqual(8);
    expect(reps).toBeLessThanOrEqual(12);
  });

  it('21 — 60% maps to ~15-20 reps', () => {
    const reps = intensityPctToReps(60);
    expect(reps).toBeGreaterThanOrEqual(12);
    expect(reps).toBeLessThanOrEqual(25);
  });

  it('22 — returns null for invalid percentage', () => {
    expect(intensityPctToReps(0)).toBeNull();
    expect(intensityPctToReps(101)).toBeNull();
    expect(intensityPctToReps(null)).toBeNull();
  });
});
