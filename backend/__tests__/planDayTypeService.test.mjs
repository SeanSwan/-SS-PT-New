/**
 * planDayTypeService regression tests
 * =====================================
 *
 * V3a (2026-05-03) — locks in the NASM-correct day-type rules that
 * replace the prior fixed `rotationPool` literal.
 *
 * Sean's observed bugs (V3 spec L1-L3) under test:
 *   L1 — 6×/wk plan must have an Active Recovery day (NOT push/pull/legs ×2).
 *   L2 — 4×/wk plan must have a Core+Stability+Balance day.
 *   L2b — 5×/wk plan must have a Full Core day (abs+lower-back+obliques).
 *   L3 — 3×/wk plan covers full-body / upper / lower.
 *
 * AI Village 2026-05-03 NASM track CRITICAL rules:
 *   — Phase 1 must be FULL-BODY stabilization every day, not Push/Pull/Legs.
 *   — Phase 2-4 may use PPL splits.
 *   — Phase 5 uses same structure as Phase 2-4 (populator adds plyo bias).
 */

import { describe, it, expect } from 'vitest';
import {
  buildWeeklyDayTypes,
  expandV3aDayTypeToMovementCategories,
  focusForDayType,
  DAY_TYPE,
  NASM_PHASE,
} from '../services/planDayTypeService.mjs';

// ─────────────────────────────────────────────────────────────
// V3a frequency rules — Phase 2 (default Strength Endurance)
// ─────────────────────────────────────────────────────────────

describe('buildWeeklyDayTypes - Phase 2 hybrid layouts', () => {
  it('1×/wk → full body', () => {
    expect(buildWeeklyDayTypes({ sessionsPerWeek: 1, phase: 2 })).toEqual([
      DAY_TYPE.full_body,
    ]);
  });

  it('2×/wk → full body × 2', () => {
    expect(buildWeeklyDayTypes({ sessionsPerWeek: 2, phase: 2 })).toEqual([
      DAY_TYPE.full_body, DAY_TYPE.full_body,
    ]);
  });

  it('3×/wk → full body, upper, lower (Sean L3)', () => {
    expect(buildWeeklyDayTypes({ sessionsPerWeek: 3, phase: 2 })).toEqual([
      DAY_TYPE.full_body, DAY_TYPE.upper, DAY_TYPE.lower,
    ]);
  });

  it('4×/wk → push / pull / legs / core+stability+balance (Sean L2 explicit ab day)', () => {
    expect(buildWeeklyDayTypes({ sessionsPerWeek: 4, phase: 2 })).toEqual([
      DAY_TYPE.push, DAY_TYPE.pull, DAY_TYPE.legs, DAY_TYPE.core_stability_balance,
    ]);
  });

  it('5×/wk → push / pull / legs / upper / FULL CORE (Sean L2 abs+lower-back day)', () => {
    expect(buildWeeklyDayTypes({ sessionsPerWeek: 5, phase: 2 })).toEqual([
      DAY_TYPE.push, DAY_TYPE.pull, DAY_TYPE.legs, DAY_TYPE.upper, DAY_TYPE.full_core,
    ]);
  });

  it('6×/wk → push / pull / legs / upper / lower / ACTIVE RECOVERY (Sean L1 — fixes the live bug)', () => {
    const result = buildWeeklyDayTypes({ sessionsPerWeek: 6, phase: 2 });
    // Critical assertions: NO duplicate push, NO duplicate pull, NO duplicate legs,
    // and the 6th slot is ACTIVE RECOVERY (not push or legs as before).
    expect(result).toEqual([
      DAY_TYPE.push, DAY_TYPE.pull, DAY_TYPE.legs,
      DAY_TYPE.upper, DAY_TYPE.lower, DAY_TYPE.active_recovery,
    ]);
    expect(result).not.toContain(undefined);
    // Specifically prove the prior bug is closed: pre-V3a, days[5] would be 'legs'.
    expect(result[5]).toBe(DAY_TYPE.active_recovery);
  });

  it('7×/wk → push / pull / legs / upper / lower / core+balance / active-recovery', () => {
    expect(buildWeeklyDayTypes({ sessionsPerWeek: 7, phase: 2 })).toEqual([
      DAY_TYPE.push, DAY_TYPE.pull, DAY_TYPE.legs,
      DAY_TYPE.upper, DAY_TYPE.lower,
      DAY_TYPE.core_stability_balance, DAY_TYPE.active_recovery,
    ]);
  });
});

// ─────────────────────────────────────────────────────────────
// V3a Phase 1 rule — every session is full-body stabilization
// (Village CRITICAL: Phase 1 must NOT use Push/Pull/Legs)
// ─────────────────────────────────────────────────────────────

describe('buildWeeklyDayTypes - Phase 1 (Stabilization) overrides PPL', () => {
  for (const sessions of [1, 2, 3, 4, 5, 6, 7]) {
    it(`${sessions}×/wk - every day is full_body_stabilization`, () => {
      const result = buildWeeklyDayTypes({ sessionsPerWeek: sessions, phase: 1 });
      expect(result).toHaveLength(sessions);
      expect(result.every(d => d === DAY_TYPE.full_body_stabilization)).toBe(true);
      // Specifically prove no PPL leakage in Phase 1 (Village CRITICAL).
      expect(result).not.toContain(DAY_TYPE.push);
      expect(result).not.toContain(DAY_TYPE.pull);
      expect(result).not.toContain(DAY_TYPE.legs);
    });
  }
});

// ─────────────────────────────────────────────────────────────
// V3a Phase 5 (Power) - same structural shape as Phase 2-4
// ─────────────────────────────────────────────────────────────

describe('buildWeeklyDayTypes - Phase 5 (Power) uses hybrid structure', () => {
  it('5×/wk Phase 5 has the same shape as Phase 2 (populator adds plyo bias separately)', () => {
    const phase2 = buildWeeklyDayTypes({ sessionsPerWeek: 5, phase: 2 });
    const phase5 = buildWeeklyDayTypes({ sessionsPerWeek: 5, phase: 5 });
    expect(phase5).toEqual(phase2);
  });

  it('6×/wk Phase 5 still has active_recovery (NOT a 6th power day)', () => {
    const result = buildWeeklyDayTypes({ sessionsPerWeek: 6, phase: 5 });
    expect(result[5]).toBe(DAY_TYPE.active_recovery);
  });
});

// ─────────────────────────────────────────────────────────────
// Input clamping / safety
// ─────────────────────────────────────────────────────────────

describe('buildWeeklyDayTypes - input clamping', () => {
  it('clamps sessionsPerWeek > 7 to 7', () => {
    expect(buildWeeklyDayTypes({ sessionsPerWeek: 99, phase: 2 })).toHaveLength(7);
  });

  it('clamps sessionsPerWeek < 1 to 1', () => {
    expect(buildWeeklyDayTypes({ sessionsPerWeek: 0, phase: 2 })).toHaveLength(1);
    expect(buildWeeklyDayTypes({ sessionsPerWeek: -3, phase: 2 })).toHaveLength(1);
  });

  it('falls back to Phase 2 (Strength Endurance) when phase is invalid', () => {
    const fallback = buildWeeklyDayTypes({ sessionsPerWeek: 4, phase: 99 });
    const phase2 = buildWeeklyDayTypes({ sessionsPerWeek: 4, phase: 2 });
    expect(fallback).toEqual(phase2);
  });

  it('handles non-integer inputs by parsing them', () => {
    expect(buildWeeklyDayTypes({ sessionsPerWeek: '4', phase: '2' })).toEqual([
      DAY_TYPE.push, DAY_TYPE.pull, DAY_TYPE.legs, DAY_TYPE.core_stability_balance,
    ]);
  });
});

// ─────────────────────────────────────────────────────────────
// Day-type → movement category expansion (V3a-new types)
// ─────────────────────────────────────────────────────────────

describe('expandV3aDayTypeToMovementCategories', () => {
  it('full_body_stabilization expands to balance + stability + core + corrective + flexibility + light compound', () => {
    const cats = expandV3aDayTypeToMovementCategories(DAY_TYPE.full_body_stabilization);
    expect(cats).toContain('balance');
    expect(cats).toContain('stability');
    expect(cats).toContain('core');
    expect(cats).toContain('corrective');
    expect(cats).toContain('flexibility');
  });

  it('core_stability_balance expands ONLY to core + balance + stability + stabilizers', () => {
    const cats = expandV3aDayTypeToMovementCategories(DAY_TYPE.core_stability_balance);
    expect(cats).toEqual(['core', 'balance', 'stability', 'stabilizers']);
    // Should NOT include push/pull/legs categories.
    expect(cats).not.toContain('push');
    expect(cats).not.toContain('squat');
  });

  it('active_recovery expands to mobility + flexibility + recovery exercises', () => {
    const cats = expandV3aDayTypeToMovementCategories(DAY_TYPE.active_recovery);
    expect(cats).toContain('flexibility');
    expect(cats).toContain('corrective');
    expect(cats).toContain('injury_recovery');
  });

  it('full_core expands to ONLY core', () => {
    expect(expandV3aDayTypeToMovementCategories(DAY_TYPE.full_core)).toEqual(['core']);
  });

  it('returns null for legacy day types so caller falls through to existing expansion', () => {
    expect(expandV3aDayTypeToMovementCategories(DAY_TYPE.push)).toBeNull();
    expect(expandV3aDayTypeToMovementCategories(DAY_TYPE.full_body)).toBeNull();
    expect(expandV3aDayTypeToMovementCategories('unknown_type')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// Focus strings (UI display)
// ─────────────────────────────────────────────────────────────

describe('focusForDayType', () => {
  it('returns descriptive focus strings for every V3a day type', () => {
    expect(focusForDayType(DAY_TYPE.core_stability_balance)).toMatch(/core.*stability.*balance/i);
    expect(focusForDayType(DAY_TYPE.active_recovery)).toMatch(/recovery|mobility|stretch/i);
    expect(focusForDayType(DAY_TYPE.full_core)).toMatch(/abs|lower back|obliques/i);
    expect(focusForDayType(DAY_TYPE.full_body_stabilization)).toMatch(/stabilization|proprioception/i);
  });

  it('returns existing focus strings for legacy day types', () => {
    expect(focusForDayType(DAY_TYPE.push)).toMatch(/chest.*shoulders.*triceps/i);
    expect(focusForDayType(DAY_TYPE.pull)).toMatch(/back.*biceps/i);
    expect(focusForDayType(DAY_TYPE.legs)).toMatch(/quads.*hamstrings.*glutes/i);
  });

  it('returns a sane default for unknown day types', () => {
    expect(focusForDayType('unknown')).toBe('training');
  });
});

// ─────────────────────────────────────────────────────────────
// NASM_PHASE constant export (sanity)
// ─────────────────────────────────────────────────────────────

describe('NASM_PHASE constants', () => {
  it('exposes all 5 phases with stable numeric values', () => {
    expect(NASM_PHASE.STABILIZATION_ENDURANCE).toBe(1);
    expect(NASM_PHASE.STRENGTH_ENDURANCE).toBe(2);
    expect(NASM_PHASE.HYPERTROPHY).toBe(3);
    expect(NASM_PHASE.MAXIMAL_STRENGTH).toBe(4);
    expect(NASM_PHASE.POWER).toBe(5);
  });
});
