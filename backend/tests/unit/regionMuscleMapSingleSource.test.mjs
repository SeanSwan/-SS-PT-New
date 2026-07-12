/**
 * Cortex Phase 2C — single region→muscle mapping home.
 * Byte-identity with both replaced maps + intake-vocabulary alignment tripwire.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  REGION_TO_BOOTCAMP_TARGETS,
  REGION_TO_REGISTRY_MUSCLES,
  bootcampTargetsForRegion,
  registryMusclesForRegion,
} from '../../services/training-cortex/ontology/regionMuscleMap.mjs';

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('regionMuscleMap — byte-identity spot-locks with the replaced maps', () => {
  it('registry vocabulary matches the replaced clientIntelligenceService rows', () => {
    expect(registryMusclesForRegion('shoulder')).toEqual(['anterior_deltoid', 'medial_deltoid', 'posterior_deltoid', 'rotator_cuff']);
    expect(registryMusclesForRegion('lower_back')).toEqual(['erector_spinae', 'multifidus', 'quadratus_lumborum']);
    expect(registryMusclesForRegion('left_knee')).toEqual(['quadriceps', 'hamstrings', 'popliteus']);
    expect(registryMusclesForRegion('right_foot')).toEqual(['peroneals', 'tibialis_posterior', 'intrinsic_foot']);
    expect(registryMusclesForRegion('nowhere')).toEqual([]);
    expect(Object.keys(REGION_TO_REGISTRY_MUSCLES)).toHaveLength(34);
  });

  it('bootcamp vocabulary matches the replaced painAwareGating rows', () => {
    expect(bootcampTargetsForRegion('left_knee')).toEqual(['quadriceps', 'hamstrings']);
    expect(bootcampTargetsForRegion('lower_back')).toEqual(['erector_spinae', 'core', 'glutes']);
    expect(bootcampTargetsForRegion('right_shoulder')).toEqual(['shoulders', 'chest']);
    expect(bootcampTargetsForRegion('left_ankle')).toEqual(['calves', 'tibialis']);
    expect(bootcampTargetsForRegion('nowhere')).toEqual([]);
    expect(Object.keys(REGION_TO_BOOTCAMP_TARGETS)).toHaveLength(10);
  });

  it('every bootcamp region is also a registry region (key alignment)', () => {
    for (const region of Object.keys(REGION_TO_BOOTCAMP_TARGETS)) {
      expect(REGION_TO_REGISTRY_MUSCLES[region]).toBeDefined();
    }
  });
});

describe('single source — consumers define no region maps of their own', () => {
  it('clientIntelligenceService uses registryMusclesForRegion', () => {
    const src = read('services/clientIntelligenceService.mjs');
    expect(src).toContain('registryMusclesForRegion(entry.bodyRegion)');
    expect(src).not.toMatch(/const REGION_TO_MUSCLE_MAP = \{/);
  });

  it('painAwareGating uses bootcampTargetsForRegion', () => {
    const src = read('services/bootcamp/painAwareGating.mjs');
    expect(src).toContain('bootcampTargetsForRegion(region)');
    expect(src).not.toMatch(/const REGION_MUSCLE_MAP = \{/);
  });

  it('documents the intake/mapping vocabulary drift until the reconciliation arc resolves it', () => {
    // REAL 2C finding: 18 of 34 mapped regions use bilateral/general names the
    // pain-intake allowlist (painEntryController) can never produce (it speaks
    // 'neck_front'-style keys). Pain in unmapped intake regions still BLOCKS
    // the gate (warnings fire regardless of muscle mapping) but excludes no
    // muscles at selection. Resolving this = pain-chart/ontology arc (Phase
    // 2E+). This assertion makes any vocabulary change a CONSCIOUS act.
    const src = read('controllers/painEntryController.mjs');
    const mappedButNotIntakeable = Object.keys(REGION_TO_REGISTRY_MUSCLES)
      .filter(region => !src.includes(`'${region}'`))
      .sort();
    expect(mappedButNotIntakeable).toEqual([
      'abdominals', 'core', 'glutes', 'head', 'hip', 'left_ankle', 'left_foot',
      'left_hip', 'left_wrist', 'mid_back', 'neck', 'right_ankle', 'right_foot',
      'right_hip', 'right_wrist', 'shoulder', 'thoracic_spine', 'upper_back',
    ]);
  });
});
