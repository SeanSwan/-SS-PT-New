/**
 * Cortex Phase 2C → Pain-Chart Slice 1: single region→muscle mapping home.
 * Rewritten 2026-08-04 as a CONSCIOUS vocabulary change (the previous
 * byte-identity locks preserved maps whose tags did not exist in the live
 * exercise registry vocabulary — mapped regions still excluded nothing).
 * Coverage + live-vocabulary alignment now lives in
 * painOntologyCoverage.test.mjs; this file locks single-source consumption.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  PAIN_INTAKE_REGIONS,
  PAIN_INTAKE_REGION_SET,
  REGION_TO_BOOTCAMP_TARGETS,
  REGION_TO_REGISTRY_MUSCLES,
  bootcampTargetsForRegion,
  registryMusclesForRegion,
} from '../../services/training-cortex/ontology/regionMuscleMap.mjs';

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('regionMuscleMap — Slice 1 shape locks', () => {
  it('unmapped regions return [] (never undefined)', () => {
    expect(registryMusclesForRegion('nowhere')).toEqual([]);
    expect(bootcampTargetsForRegion('nowhere')).toEqual([]);
  });

  it('spot-locks representative live-vocabulary rows', () => {
    expect(registryMusclesForRegion('left_quad')).toEqual(['quads']);
    expect(registryMusclesForRegion('left_rotator_cuff')).toEqual(['rotator_cuff', 'rear_deltoid']);
    expect(registryMusclesForRegion('lower_back')).toEqual(['erector_spinae', 'core']);
    expect(registryMusclesForRegion('left_glute')).toEqual(['glutes', 'glute_medius']);
    expect(bootcampTargetsForRegion('left_knee')).toEqual(['quadriceps', 'hamstrings']);
    expect(bootcampTargetsForRegion('lower_back')).toEqual(['erector_spinae', 'core', 'glutes']);
  });

  it('every bootcamp region is also a registry region (key alignment)', () => {
    for (const region of Object.keys(REGION_TO_BOOTCAMP_TARGETS)) {
      expect(REGION_TO_REGISTRY_MUSCLES[region]).toBeDefined();
    }
  });

  it('legacy (non-intake) keys stay mapped so old DB rows keep protection', () => {
    const legacyKeys = Object.keys(REGION_TO_REGISTRY_MUSCLES)
      .filter(region => !PAIN_INTAKE_REGION_SET.has(region))
      .sort();
    expect(legacyKeys).toEqual([
      'abdominals', 'core', 'glutes', 'head', 'hip', 'left_ankle', 'left_foot',
      'left_hip', 'left_wrist', 'mid_back', 'neck', 'right_ankle', 'right_foot',
      'right_hip', 'right_wrist', 'shoulder', 'thoracic_spine', 'upper_back',
    ]);
  });
});

describe('single source — consumers define no region data of their own', () => {
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

  it('painEntryController imports the intake allowlist instead of duplicating it (C11)', () => {
    const src = read('controllers/painEntryController.mjs');
    expect(src).toContain("import { PAIN_INTAKE_REGION_SET as ALLOWED_BODY_REGIONS } from '../services/training-cortex/ontology/regionMuscleMap.mjs'");
    expect(src).not.toMatch(/const ALLOWED_BODY_REGIONS = new Set\(\[/);
  });

  it('painWriteService re-exports the single-source allowlist (C11)', () => {
    const src = read('services/ai/painWriteService.mjs');
    expect(src).toContain("import { PAIN_INTAKE_REGION_SET } from '../training-cortex/ontology/regionMuscleMap.mjs'");
    expect(src).toContain('export const ALLOWED_BODY_REGIONS = PAIN_INTAKE_REGION_SET');
    expect(src).not.toMatch(/const ALLOWED_BODY_REGIONS = new Set\(\[/);
  });

  it('the intake list is exactly 50 unique regions (F17: count derived, not hand-written)', () => {
    expect(PAIN_INTAKE_REGIONS).toHaveLength(50);
    expect(new Set(PAIN_INTAKE_REGIONS).size).toBe(50);
  });
});
