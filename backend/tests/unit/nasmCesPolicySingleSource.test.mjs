/**
 * Cortex Phase 2B — single NASM CES compensation catalog (eval test 11).
 * Byte-identity with BOTH replaced datasets + closed-set discipline.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  NASM_CES_COMPENSATIONS,
  buildCompensationTagBridge,
  getCesStrategy,
  getCesTags,
} from '../../services/training-cortex/policy/nasmCesPolicy.mjs';
import { __testing__, mapCompensationToCesTags } from '../../services/ai/correctiveExerciseService.mjs';

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

// The EXACT bridge correctiveExerciseService carried before consolidation.
const PRE_CONSOLIDATION_BRIDGE = {
  knee_valgus: ['knees_cave', 'pronation_distortion_syndrome'],
  knee_varus: ['knees_bow'],
  excessive_forward_lean: ['excessive_forward_lean', 'lower_crossed_syndrome'],
  arms_fall_forward: ['arms_fall_forward', 'upper_crossed_syndrome'],
  low_back_arch: ['low_back_arch', 'lower_crossed_syndrome'],
  head_protrusion: ['forward_head', 'upper_crossed_syndrome'],
  shoulder_elevation: ['upper_crossed_syndrome'],
  hip_drop: ['asymmetric_shift'],
  foot_pronation: ['pronation_distortion_syndrome'],
  heels_rise: ['heels_rise'],
};

// Spot rows from the EXACT CES_MAP clientIntelligenceService carried.
const PRE_CONSOLIDATION_CES_MAP_SPOTS = {
  knee_valgus: {
    inhibit: ['adductors', 'tfl', 'vastus_lateralis'],
    lengthen: ['adductors', 'tfl', 'biceps_femoris_short_head'],
    activate: ['gluteus_medius', 'vastus_medialis', 'gluteus_maximus'],
    integrate: ['single_leg_squat', 'lateral_band_walk', 'step_up'],
  },
  foot_pronation: {
    inhibit: ['peroneals', 'lateral_gastrocnemius', 'biceps_femoris'],
    lengthen: ['peroneals', 'lateral_gastrocnemius', 'soleus'],
    activate: ['tibialis_posterior', 'tibialis_anterior', 'gluteus_medius'],
    integrate: ['single_leg_balance', 'calf_raises_inverted', 'step_up'],
  },
  hip_drop: {
    inhibit: ['tfl', 'adductors'],
    lengthen: ['tfl', 'adductors', 'piriformis'],
    activate: ['gluteus_medius', 'gluteus_minimus', 'quadratus_lumborum'],
    integrate: ['single_leg_deadlift', 'lateral_band_walk', 'clamshells'],
  },
};

describe('nasmCesPolicy — byte-identity with the replaced datasets', () => {
  it('buildCompensationTagBridge reproduces the pre-consolidation bridge exactly', () => {
    expect(buildCompensationTagBridge()).toEqual(PRE_CONSOLIDATION_BRIDGE);
  });

  it('correctiveExerciseService now derives its table (and behaves identically)', () => {
    expect(__testing__.COMPENSATION_TO_V3B3_TAGS).toEqual(PRE_CONSOLIDATION_BRIDGE);
    expect(mapCompensationToCesTags('knee_valgus')).toEqual(['knees_cave', 'pronation_distortion_syndrome']);
    expect(mapCompensationToCesTags('made_up_thing')).toEqual([]);
    expect(mapCompensationToCesTags(null)).toEqual([]);
  });

  it('getCesStrategy reproduces the replaced CES_MAP rows exactly (spot-locked)', () => {
    for (const [key, ila] of Object.entries(PRE_CONSOLIDATION_CES_MAP_SPOTS)) {
      expect(getCesStrategy(key)).toEqual(ila);
    }
    // The legacy map carried NO strategy for these — null preserved, not invented.
    expect(getCesStrategy('knee_varus')).toBeNull();
    expect(getCesStrategy('heels_rise')).toBeNull();
    expect(getCesStrategy('unknown')).toBeNull();
  });

  it('getCesTags matches the bridge for every catalog entry', () => {
    for (const key of Object.keys(NASM_CES_COMPENSATIONS)) {
      expect(getCesTags(key)).toEqual(PRE_CONSOLIDATION_BRIDGE[key]);
    }
  });
});

describe('single source — consumers define no CES tables of their own', () => {
  it('clientIntelligenceService uses getCesStrategy (no CES_MAP table)', () => {
    const src = read('services/clientIntelligenceService.mjs');
    expect(src).toContain("from './training-cortex/policy/nasmCesPolicy.mjs'");
    expect(src).toContain('getCesStrategy(comp.type)');
    expect(src).not.toMatch(/const CES_MAP = \{/);
  });

  it('correctiveExerciseService derives its bridge from the policy', () => {
    const src = read('services/ai/correctiveExerciseService.mjs');
    expect(src).toContain('buildCompensationTagBridge()');
    expect(src).not.toMatch(/knee_valgus:\s*\['knees_cave'/);
  });
});

describe('closed-set discipline (taxonomy tripwires)', () => {
  it('every v3b3 tag is from the NASM-CES-TAXONOMY closed set', () => {
    const ALLOWED = new Set([
      'knees_cave', 'knees_bow', 'excessive_forward_lean', 'heels_rise',
      'low_back_arch', 'asymmetric_shift', 'forward_head', 'arms_fall_forward',
      'upper_crossed_syndrome', 'lower_crossed_syndrome', 'pronation_distortion_syndrome',
    ]);
    for (const entry of Object.values(NASM_CES_COMPENSATIONS)) {
      for (const tag of entry.v3b3Tags) expect(ALLOWED.has(tag)).toBe(true);
    }
  });

  it('every ILA strategy has exactly the four CES continuum steps', () => {
    for (const entry of Object.values(NASM_CES_COMPENSATIONS)) {
      if (!entry.ila) continue;
      expect(Object.keys(entry.ila).sort()).toEqual(['activate', 'inhibit', 'integrate', 'lengthen']);
    }
  });
});
