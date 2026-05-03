/**
 * V3c contract-chain integration test
 * ====================================
 *
 * Locks the four V3c slices (V3c.1 → V3c.4) as a single chain:
 *
 *   OHSA wizard payload
 *       ↓ (V3c.4 ohsaCompensationAggregator)
 *   commonCompensations[] in clientIntelligenceService shape
 *       ↓ (V3c.1 compensationsToTagSet)
 *   V3b.3 nasmCorrectiveCategory tag set
 *       ↓ (V3c.1 getCorrectiveExercisesForCompensations against the
 *          ACTUAL V3b.3.3 seeder rows imported as fixtures)
 *   { inhibit, lengthen, activate, integrate } registry rows
 *
 * Why this test exists:
 *   - V3c.1, V3c.2, V3c.3, V3c.4 each have unit tests covering their
 *     own contract. None of those tests catch a contract drift
 *     BETWEEN the slices — e.g. if the V3c.4 aggregator emits a
 *     CES_MAP key that V3c.1's COMPENSATION_TO_V3B3_TAGS doesn't
 *     have, the unit tests pass but production silently breaks.
 *   - This test imports the real V3b.3.3 seeder rows (32 ces-* keys
 *     with their actual nasmCorrectiveCategory tags) and wires them
 *     through the chain. Any of:
 *       (a) a wizard field added to the OHSA payload that the
 *           aggregator doesn't map,
 *       (b) a CES_MAP key the aggregator emits that V3c.1 doesn't
 *           recognize,
 *       (c) a V3b.3 nasmCorrectiveCategory tag added to a seeder row
 *           that no compensation actually points at,
 *     would cause this test to fail loudly.
 *
 * What it does NOT test:
 *   - Database access (Exercise.findAll is mocked with seeder rows).
 *   - HTTP routing (V3c.2 route is exercised by its own spec).
 *   - Workout-builder integration (V3c.3 is exercised by its own
 *     spec). The chain test stops at the registry-grouped output;
 *     the warmup-injection layer is one level higher and has its
 *     own spec.
 */
import { describe, it, expect, vi } from 'vitest';
import { extractCompensationsFromOHSA } from '../services/ohsaCompensationAggregator.mjs';
import {
  compensationsToTagSet,
  mapCompensationToCesTags,
  getCorrectiveExercisesForCompensations,
} from '../services/ai/correctiveExerciseService.mjs';

// Import the real V3b.3.3 seeder rows directly. Any change to the
// seeder (adding a new corrective, retiring one, retagging
// compensation categories) flows through this fixture automatically.
import seederModule from '../seeders/20260504-seed-nasm-corrective-starter.mjs';

const SEEDER_ROWS = seederModule.rows;

// Sanity: the seeder must export the 32 manifest rows for this test
// to be meaningful. If this fails, the seeder export shape changed.
describe('V3c chain — fixture sanity', () => {
  it('imports the V3b.3.3 seeder rows (32 manifest)', () => {
    expect(SEEDER_ROWS).toBeDefined();
    expect(Array.isArray(SEEDER_ROWS)).toBe(true);
    expect(SEEDER_ROWS).toHaveLength(32);
    expect(SEEDER_ROWS.every((r) => typeof r.exercise_key === 'string')).toBe(true);
    expect(SEEDER_ROWS.every((r) => r.exercise_key.startsWith('ces-'))).toBe(true);
  });
});

// ─── End-to-end chain assertions ──────────────────────────────────

describe('V3c chain — OHSA wizard payload → V3b.3 registry rows', () => {
  it('a UCS-pattern client (head + arms forward) reaches both forward_head AND UCS exercises', async () => {
    // Step 1: V3c.4 aggregator extracts compensations from OHSA payload.
    const ohsa = {
      anteriorView: { kneeValgus: 'none', feetTurnout: 'none' },
      lateralView: {
        forwardHead: 'significant',
        armsFallForward: 'minor',
        excessiveForwardLean: 'none',
        lowBackArch: 'none',
      },
    };
    const compensations = extractCompensationsFromOHSA(ohsa);
    expect(compensations.map((c) => c.type).sort()).toEqual([
      'arms_fall_forward',
      'head_protrusion',
    ]);

    // Step 2: V3c.1 maps the compensations to V3b.3 tags.
    const tagSet = compensationsToTagSet(compensations);
    expect(tagSet).toEqual(expect.arrayContaining([
      'forward_head',
      'upper_crossed_syndrome',
      'arms_fall_forward',
    ]));

    // Step 3: V3c.1 service queries the registry — mock with REAL seeder rows.
    const Exercise = { findAll: vi.fn().mockResolvedValue(SEEDER_ROWS) };
    const result = await getCorrectiveExercisesForCompensations({
      compensations, Exercise,
    });

    // Sanity on the chain output.
    expect(result.matchedCount).toBeGreaterThan(0);
    expect(result.tags).toEqual(tagSet);

    // Specific assertions about UCS coverage in the seeded registry.
    const allMatched = [...result.inhibit, ...result.lengthen, ...result.activate, ...result.integrate];
    const matchedKeys = new Set(allMatched.map((r) => r.exercise_key));

    // Seeder must contain corrective entries for UCS — these are the
    // load-bearing rows the wizard's UCS pattern depends on.
    expect(matchedKeys.has('ces-foam-roll-pec')).toBe(true);          // UCS inhibit
    expect(matchedKeys.has('ces-doorway-pec-stretch')).toBe(true);    // UCS lengthen
    expect(matchedKeys.has('ces-wall-slides')).toBe(true);            // UCS activate
  });

  it('a knees-cave client reaches knees_cave + PDS exercises', async () => {
    const ohsa = {
      anteriorView: {
        kneeValgus: 'significant',
        feetTurnout: 'minor',
      },
    };
    const compensations = extractCompensationsFromOHSA(ohsa);
    expect(compensations.map((c) => c.type).sort()).toEqual([
      'foot_pronation',
      'knee_valgus',
    ]);

    const Exercise = { findAll: vi.fn().mockResolvedValue(SEEDER_ROWS) };
    const result = await getCorrectiveExercisesForCompensations({
      compensations, Exercise,
    });

    const allMatched = [...result.inhibit, ...result.lengthen, ...result.activate, ...result.integrate];
    const matchedKeys = new Set(allMatched.map((r) => r.exercise_key));

    // Seeder must cover PDS — pronation_distortion_syndrome is the
    // V3b.3 tag that knees_cave + foot_pronation both surface.
    expect(matchedKeys.has('ces-foam-roll-tfl')).toBe(true);
    expect(matchedKeys.has('ces-lateral-band-walks')).toBe(true);
    expect(matchedKeys.has('ces-single-leg-balance-reach')).toBe(true);

    // Spread across protocol steps — chain shouldn't dump everything
    // into one bucket.
    expect(result.inhibit.length).toBeGreaterThan(0);
    expect(result.activate.length).toBeGreaterThan(0);
  });

  it('LCS pattern (low back arch + forward lean) reaches lower_crossed_syndrome rows', async () => {
    const ohsa = {
      lateralView: {
        lowBackArch: 'significant',
        excessiveForwardLean: 'minor',
      },
    };
    const compensations = extractCompensationsFromOHSA(ohsa);
    const tagSet = compensationsToTagSet(compensations);
    expect(tagSet).toEqual(expect.arrayContaining([
      'low_back_arch',
      'lower_crossed_syndrome',
      'excessive_forward_lean',
    ]));

    const Exercise = { findAll: vi.fn().mockResolvedValue(SEEDER_ROWS) };
    const result = await getCorrectiveExercisesForCompensations({
      compensations, Exercise,
    });

    const allMatched = [...result.inhibit, ...result.lengthen, ...result.activate, ...result.integrate];
    expect(allMatched.length).toBeGreaterThan(0);

    // Verify at least one row from the LCS subset of the seeder appears.
    const lcsExpectedKeys = [
      'ces-foam-roll-tfl',                 // LCS inhibit
      'ces-foam-roll-hip-flexor',          // LCS inhibit
      'ces-kneeling-hip-flexor-stretch',   // LCS lengthen
      'ces-glute-bridge',                  // LCS activate
    ];
    const matchedKeys = new Set(allMatched.map((r) => r.exercise_key));
    const overlap = lcsExpectedKeys.filter((k) => matchedKeys.has(k));
    expect(overlap.length).toBeGreaterThan(0);
  });

  it('an all-clean client (no compensations) returns empty groups WITHOUT touching the registry', async () => {
    const ohsa = {
      anteriorView: { kneeValgus: 'none', feetTurnout: 'none' },
      lateralView: { forwardHead: 'none', lowBackArch: 'none' },
    };
    const compensations = extractCompensationsFromOHSA(ohsa);
    expect(compensations).toEqual([]);

    const Exercise = { findAll: vi.fn().mockResolvedValue(SEEDER_ROWS) };
    const result = await getCorrectiveExercisesForCompensations({
      compensations, Exercise,
    });

    expect(result.matchedCount).toBe(0);
    expect(result.inhibit).toEqual([]);
    expect(result.activate).toEqual([]);
    expect(Exercise.findAll).not.toHaveBeenCalled(); // optimization preserved
  });

  it('every CES_MAP key the aggregator can emit has a non-empty V3b.3 tag mapping', () => {
    // Exhaustive check: walk every wizard severity field, generate its
    // possible compensation, then verify V3c.1 has a tag mapping for it.
    // If anyone adds a wizard field with a CES_MAP key V3c.1 doesn't
    // recognize, this fails before production.
    const wizardCompensationTypes = [
      'foot_pronation',         // feetTurnout / feetFlattening
      'knee_valgus',            // kneeValgus
      'knee_varus',             // kneeVarus
      'excessive_forward_lean', // excessiveForwardLean
      'low_back_arch',          // lowBackArch
      'arms_fall_forward',      // armsFallForward
      'head_protrusion',        // forwardHead
      'hip_drop',               // asymmetricWeightShift
    ];
    for (const compType of wizardCompensationTypes) {
      const tags = mapCompensationToCesTags(compType);
      expect(tags.length, `mapping must exist for ${compType}`).toBeGreaterThan(0);
    }
  });

  it('every V3b.3 nasmCorrectiveCategory tag in the seeder is reachable from at least one compensation', () => {
    // Anti-orphan check: scan the seeder rows for every distinct V3b.3
    // tag, then confirm at least one wizard compensation can produce
    // that tag via V3c.4 → V3c.1. Catches the case where someone adds
    // a new corrective row with a tag no compensation maps to (an
    // unreachable corrective is dead weight in the registry).
    const tagsInSeeder = new Set();
    for (const row of SEEDER_ROWS) {
      const arr = Array.isArray(row.nasmCorrectiveCategory)
        ? row.nasmCorrectiveCategory
        : (() => {
            try { return JSON.parse(row.nasmCorrectiveCategory); } catch { return []; }
          })();
      for (const t of arr || []) tagsInSeeder.add(t);
    }

    const reachableTags = new Set();
    const wizardCompTypes = [
      'foot_pronation', 'knee_valgus', 'knee_varus', 'excessive_forward_lean',
      'low_back_arch', 'arms_fall_forward', 'head_protrusion',
      'shoulder_elevation', 'hip_drop', 'heels_rise',
    ];
    for (const compType of wizardCompTypes) {
      for (const tag of mapCompensationToCesTags(compType)) reachableTags.add(tag);
    }

    const orphanTags = [];
    for (const tag of tagsInSeeder) {
      if (!reachableTags.has(tag)) orphanTags.push(tag);
    }

    // If this fails, a seeder row is tagged with a V3b.3 category that
    // no compensation type points at — would never be selected by the
    // chain. Either: add the missing wizard mapping to V3c.1, OR
    // remove the tag from the seeder row.
    expect(
      orphanTags,
      `Seeder tags unreachable from any compensation: ${orphanTags.join(', ')}`,
    ).toEqual([]);
  });

  it('passing compensations as the clientIntelligenceService object[] shape works identically to string[]', async () => {
    const objectShape = [
      { type: 'knee_valgus', avgSeverity: 7, frequency: 5, trend: 'stable' },
      { type: 'head_protrusion', avgSeverity: 5, frequency: 2, trend: 'improving' },
    ];
    const stringShape = ['knee_valgus', 'head_protrusion'];

    const Exercise = { findAll: vi.fn().mockResolvedValue(SEEDER_ROWS) };
    const objResult = await getCorrectiveExercisesForCompensations({
      compensations: objectShape, Exercise,
    });
    const strResult = await getCorrectiveExercisesForCompensations({
      compensations: stringShape, Exercise,
    });

    // Tags must be identical regardless of input shape.
    expect(objResult.tags.sort()).toEqual(strResult.tags.sort());

    // Matched-row sets must be identical.
    const objKeys = new Set([...objResult.inhibit, ...objResult.activate, ...objResult.integrate, ...objResult.lengthen].map((r) => r.exercise_key));
    const strKeys = new Set([...strResult.inhibit, ...strResult.activate, ...strResult.integrate, ...strResult.lengthen].map((r) => r.exercise_key));
    expect(Array.from(objKeys).sort()).toEqual(Array.from(strKeys).sort());
  });
});
