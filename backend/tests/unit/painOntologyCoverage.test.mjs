/**
 * Pain-Chart Slice 1 (C1) — ontology coverage + live-vocabulary locks.
 *
 * The original failure this prevents (verified by execution 2026-08-04):
 * 34 of 50 pain-intake regions mapped to ZERO muscles, so a 9/10
 * rotator-cuff entry excluded nothing from generated plans — AND the mapped
 * regions spoke tags ('quadriceps', 'gastrocnemius') that do not exist in
 * the exercise registry vocabulary, so even they excluded almost nothing.
 *
 * Vocabulary source of truth: the hardcoded registry in variationEngine.mjs
 * — the live DB's exercises table had 0 active rows with primaryMuscles at
 * probe time, so getExerciseRegistryFromDB() falls back to it. If the DB
 * registry is ever seeded, extend this test to the DB vocabulary in the
 * same slice (see regionMuscleMap.mjs header).
 */
import { describe, expect, it } from 'vitest';

import {
  ONTOLOGY_EXPANSION_2026_08,
  PAIN_INTAKE_REGIONS,
  REGION_TO_BOOTCAMP_TARGETS,
  REGION_TO_REGISTRY_MUSCLES,
} from '../../services/training-cortex/ontology/regionMuscleMap.mjs';
import { getExerciseRegistry } from '../../services/variationEngine.mjs';

const registryVocabulary = (() => {
  const reg = getExerciseRegistry();
  const list = Array.isArray(reg) ? reg : Object.values(reg || {});
  const tags = new Set();
  for (const ex of list) (ex.muscles || []).forEach(t => tags.add(t));
  return tags;
})();

describe('C1 — every pain-intake region machine-protects the plan', () => {
  it('every intake region maps to at least one registry muscle tag', () => {
    const uncovered = PAIN_INTAKE_REGIONS.filter(
      r => (REGION_TO_REGISTRY_MUSCLES[r] || []).length === 0
    );
    expect(uncovered).toEqual([]);
  });

  it('every intake region has bootcamp gating targets', () => {
    const uncovered = PAIN_INTAKE_REGIONS.filter(
      r => (REGION_TO_BOOTCAMP_TARGETS[r] || []).length === 0
    );
    expect(uncovered).toEqual([]);
  });
});

describe('vocabulary — mapped tags must exist in the live exercise registry', () => {
  it('sanity: the registry vocabulary is non-trivial', () => {
    expect(registryVocabulary.size).toBeGreaterThanOrEqual(20);
    // Positive controls — if these vanish the registry itself changed and
    // the whole map needs re-verification, not just this test.
    for (const tag of ['quads', 'hamstrings', 'glutes', 'calves', 'rotator_cuff', 'core']) {
      expect(registryVocabulary.has(tag)).toBe(true);
    }
  });

  it('every mapped registry tag matches a real exercise tag (no decorative exclusions)', () => {
    const phantoms = [];
    for (const [region, tags] of Object.entries(REGION_TO_REGISTRY_MUSCLES)) {
      for (const tag of tags) {
        if (!registryVocabulary.has(tag)) phantoms.push(`${region} -> ${tag}`);
      }
    }
    expect(phantoms).toEqual([]);
  });
});

describe('F10 — ontology expansion set', () => {
  it('expansion set holds exactly the intake regions whose exclusions were ineffective before', () => {
    const previouslyEffective = new Set([
      'left_shoulder', 'right_shoulder',
      'left_elbow', 'right_elbow',
      'lower_back',
      'left_hamstring', 'right_hamstring',
      'left_knee', 'right_knee',
    ]);
    for (const region of PAIN_INTAKE_REGIONS) {
      expect(ONTOLOGY_EXPANSION_2026_08.has(region)).toBe(!previouslyEffective.has(region));
    }
  });
});
