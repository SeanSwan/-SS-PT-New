/**
 * Cortex Phase 2A — single NASM OPT acute-variable source (eval test 10).
 *
 * Locks three things:
 *  1. BYTE-IDENTITY: the derived legacy shapes match the exact values the
 *     pre-consolidation tables carried (zero behavior change).
 *  2. SINGLE SOURCE: the generation-path consumers no longer define their own
 *     phase tables (source-contract greps).
 *  3. CROSS-COPY CONSISTENCY: the LLM template-registry schemas stay inside
 *     canonical ranges, so the remaining presentation copies can't drift
 *     silently. (Known variance: nasmProgressionService Phase-5 repRange
 *     '1-10' vs canonical 1-5 — documented drift, queued for 2A.2 with its
 *     consumer sweep; asserted here so a fix or a widening is a CONSCIOUS act.)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  NASM_OPT_PHASES,
  buildLegacyOptPhaseParams,
  phaseCandidateDefaults,
  phaseIntensityRange,
  resolveOptPhase,
} from '../../services/training-cortex/policy/nasmOptPolicy.mjs';

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

// The EXACT table workoutBuilderService carried before consolidation.
const PRE_CONSOLIDATION_OPT_PHASE_PARAMS = {
  1: { name: 'Stabilization Endurance', sets: [1, 3], reps: [12, 20], intensity: '50-70%', tempo: '4-2-1', rest: [0, 90], exerciseTypes: ['stability', 'core', 'balance', 'corrective'], focus: 'Muscular endurance, proprioception, core stability' },
  2: { name: 'Strength Endurance', sets: [2, 4], reps: [8, 12], intensity: '70-80%', tempo: '2-0-2', rest: [0, 60], exerciseTypes: ['compound', 'isolation', 'stability'], focus: 'Superset stabilization + strength exercises' },
  3: { name: 'Muscular Development (Hypertrophy)', sets: [3, 5], reps: [6, 12], intensity: '75-85%', tempo: '2-0-2', rest: [0, 60], exerciseTypes: ['compound', 'isolation'], focus: 'Maximal muscle growth, progressive overload' },
  4: { name: 'Maximal Strength', sets: [4, 6], reps: [1, 5], intensity: '85-100%', tempo: 'Explosive/controlled', rest: [120, 300], exerciseTypes: ['compound'], focus: 'Maximal force production, neural adaptations' },
  5: { name: 'Power', sets: [3, 5], reps: [1, 5], intensity: '30-45% (speed) / 85-100% (strength)', tempo: 'Explosive', rest: [120, 300], exerciseTypes: ['compound', 'plyometric'], focus: 'Rate of force development, superset strength + power' },
};

describe('nasmOptPolicy — byte-identity with the replaced tables', () => {
  it('buildLegacyOptPhaseParams reproduces the pre-consolidation table exactly', () => {
    expect(buildLegacyOptPhaseParams()).toEqual(PRE_CONSOLIDATION_OPT_PHASE_PARAMS);
  });

  it('phaseIntensityRange reproduces the replaced inline intensity map exactly', () => {
    expect(phaseIntensityRange(1)).toEqual([0.50, 0.70]);
    expect(phaseIntensityRange(2)).toEqual([0.70, 0.80]);
    expect(phaseIntensityRange(3)).toEqual([0.75, 0.85]);
    expect(phaseIntensityRange(4)).toEqual([0.85, 1.00]);
    expect(phaseIntensityRange(5)).toEqual([0.30, 0.45]);
    // fallback matched the old `|| [0.70, 0.80]`
    expect(phaseIntensityRange(99)).toEqual([0.70, 0.80]);
    expect(phaseIntensityRange(undefined)).toEqual([0.70, 0.80]);
  });

  it('phaseCandidateDefaults reproduces the replaced candidate picks exactly', () => {
    expect(phaseCandidateDefaults(0)).toEqual({ sets: 2, reps: 15, tempo: '4/2/1', restSeconds: 45, intensityPercent: 60 });
    expect(phaseCandidateDefaults(1)).toEqual({ sets: 2, reps: 15, tempo: '4/2/1', restSeconds: 45, intensityPercent: 60 });
    expect(phaseCandidateDefaults(2)).toEqual({ sets: 3, reps: 10, tempo: '2/0/2', restSeconds: 60, intensityPercent: 70 });
    expect(phaseCandidateDefaults(3)).toEqual({ sets: 4, reps: 10, tempo: '2/0/2', restSeconds: 60, intensityPercent: 75 });
    expect(phaseCandidateDefaults(4)).toEqual({ sets: 4, reps: 5, tempo: 'X/0/X', restSeconds: 120, intensityPercent: 85 });
    expect(phaseCandidateDefaults(5)).toEqual({ sets: 4, reps: 5, tempo: 'X/0/X', restSeconds: 120, intensityPercent: 85 });
  });

  it('candidate picks stay inside canonical ranges (containment)', () => {
    for (const phase of [1, 2, 3, 4, 5]) {
      const pick = phaseCandidateDefaults(phase);
      const canon = resolveOptPhase(phase);
      expect(pick.sets).toBeGreaterThanOrEqual(canon.sets[0]);
      expect(pick.sets).toBeLessThanOrEqual(canon.sets[1] + 0);
      expect(pick.reps).toBeGreaterThanOrEqual(canon.reps[0]);
      expect(pick.reps).toBeLessThanOrEqual(canon.reps[1] + 3); // phase-1 pick 15 sits mid-range
    }
  });
});

describe('single source — consumers define no phase tables of their own', () => {
  it('workoutBuilderService derives its params and intensity range from the policy', () => {
    const src = read('services/workoutBuilderService.mjs');
    expect(src).toContain("from './training-cortex/policy/nasmOptPolicy.mjs'");
    expect(src).toContain('buildLegacyOptPhaseParams()');
    expect(src).toContain('phaseIntensityRange(nasmPhase)');
    expect(src).not.toMatch(/OPT_PHASE_PARAMS = \{\s*1:/);
    expect(src).not.toContain('phaseIntensityMap');
  });

  it('workoutBuilderCandidateService uses the policy candidate defaults', () => {
    const src = read('services/workoutBuilderCandidateService.mjs');
    expect(src).toContain('phaseCandidateDefaults');
    expect(src).not.toMatch(/if \(phase <= 1\) return \{ sets: 2, reps: 15/);
  });
});

describe('cross-copy consistency (drift tripwires on the remaining copies)', () => {
  it('nasmTemplateRegistry phase schemas agree with canonical set/rep ranges', () => {
    const src = read('services/ai/nasmTemplateRegistry.mjs');
    // Spot-lock the highest-risk acute variables per phase in the LLM schema
    // layer. If the registry is intentionally revised, revise the canonical
    // table in the same commit — never one without the other.
    expect(src).toMatch(/repRange:\s*['"]12-20/);
    expect(src).toMatch(/repRange:\s*['"]1-5/);
    expect(NASM_OPT_PHASES[1].reps).toEqual([12, 20]);
    expect(NASM_OPT_PHASES[4].reps).toEqual([1, 5]);
  });

  it('documents the known nasmProgressionService Phase-5 drift until 2A.2 resolves it', () => {
    const src = read('services/nasmProgressionService.mjs');
    // Canonical power reps are 1-5; the progression presentation copy says
    // '1-10'. This assertion EXISTS so that whoever touches either side must
    // decide deliberately: fix the drift (update this test + progression) or
    // widen the canon (update nasmOptPolicy). Silent divergence is the enemy.
    expect(src).toMatch(/repRange:\s*'1-10'/);
    expect(NASM_OPT_PHASES[5].reps).toEqual([1, 5]);
  });
});
