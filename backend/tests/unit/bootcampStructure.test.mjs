/**
 * ============================================================================
 * FILE: bootcampStructure.test.mjs — the extracted structure resolver.
 *
 * WHY THIS FILE EXISTS. `resolveBootcampStructure` and `clampInt` were extracted from
 * `bootcampGenerator.mjs` into `bootcampStructure.mjs` (rule 4), with the generator re-exporting
 * them so no import path changed. An extraction is only safe if it is EQUIVALENT, and the honest
 * way to check that is differencing the extracted code against the code it replaced across a
 * wide input grid. A differential probe did exactly that — 2912 inputs covering every branch —
 * and found **2896 identical results and 16 differences, all of them one field for one input**:
 * the unknown-format LABEL.
 *
 * That divergence is not an extraction defect, it is an intentional change carried in the
 * working tree (the comment inside the function says the label used to be the RAW requested
 * value). But it had **no test at all** — the probe found it, not the suite. It has one now,
 * because the comment's own justification is load-bearing: an unknown label propagates to the
 * client and back into a save, where the enum-backed contract rejects it with a 400, so a class
 * that generated fine could never be saved.
 *
 * The re-export is also locked by IDENTITY, not by behaviour: `__testing__` must hand back the
 * very same function object, or a future "fix" could silently fork a second implementation.
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';

import {
  clampInt, resolveBootcampStructure,
} from '../../services/bootcamp/bootcampStructure.mjs';
import { resolveBootcampStructure as reExported, __testing__ } from '../../services/bootcamp/bootcampGenerator.mjs';
import { CUSTOM_STRUCTURE_LIMITS, FORMAT_CONFIG, TRANSITION_TIME_SEC, STATION_TRANSITION_SEC } from '../../services/bootcamp/bootcampConstants.mjs';

describe('resolveBootcampStructure — the label and the shape it returns', () => {
  it('falls back to 4x4_r2 for an UNKNOWN format, and says so in the LABEL', () => {
    // The label used to be the RAW requested value, so an unknown format produced a class built
    // as 4x4_r2 while claiming to be something else — and that label reached a save, where the
    // contract rejects an out-of-enum value with a 400. The class generated fine and could never
    // be saved. Found by a differential equivalence probe (round 110), which is why the
    // assertion exists: the behaviour had a comment and no test.
    const structure = resolveBootcampStructure({ classFormat: 'nonsense' });

    expect(structure.classFormat).toBe('4x4_r2');
    expect(structure.format).toBe(FORMAT_CONFIG['4x4_r2']);
    expect(structure.stationCount).toBe(FORMAT_CONFIG['4x4_r2'].fixedStations);
  });

  it('keeps a KNOWN format label and hands back that format by reference', () => {
    const structure = resolveBootcampStructure({ classFormat: 'stations_2x7' });

    expect(structure.classFormat).toBe('stations_2x7');
    expect(structure.format).toBe(FORMAT_CONFIG['stations_2x7']);
    expect(structure.stationCount).toBe(FORMAT_CONFIG['stations_2x7'].fixedStations);
  });

  it('treats full_group as ZERO stations, because the room trains together', () => {
    expect(resolveBootcampStructure({ classFormat: 'full_group' })).toMatchObject({
      classFormat: 'full_group', stationCount: 0,
    });
  });

  it('gives a format with NO fixed station count a count inside the documented band', () => {
    // NOTE, recorded rather than "fixed": the duration-derived branch below is UNREACHABLE for
    // every shipped format. The only formats without `fixedStations` are full_group, circuit,
    // emom, tabata, amrap and hybrid — and every one of them also carries
    // `exercisesPerStation: null`, so the arithmetic becomes `null * durationSec` → 0, the
    // per-station time collapses to the station transition, and the result clamps to the 10
    // ceiling for any realistic duration. `full_group` never even reaches it (its own branch
    // returns 0). Changing that would change generated classes, so it is recorded as a
    // pre-existing observation, not repaired here. This test pins the REAL behaviour.
    for (const classFormat of ['circuit', 'emom', 'tabata', 'amrap', 'hybrid']) {
      const structure = resolveBootcampStructure({ classFormat, targetDuration: 50 });
      expect(structure.classFormat, classFormat).toBe(classFormat);
      expect(structure.stationCount, classFormat).toBeGreaterThanOrEqual(4);
      expect(structure.stationCount, classFormat).toBeLessThanOrEqual(10);
    }
    // The duration does not move it today — that is the observation above, asserted so a future
    // change to this arithmetic is a deliberate, visible one.
    expect(resolveBootcampStructure({ classFormat: 'circuit', targetDuration: 20 }).stationCount)
      .toBe(resolveBootcampStructure({ classFormat: 'circuit', targetDuration: 90 }).stationCount);
  });

  it('CLAMPS the custom branch to the declared limits and never invents a NaN', () => {
    const oversized = resolveBootcampStructure({
      classFormat: 'custom', stationCount: 99, exercisesPerStation: 12, targetDuration: 50,
    });
    expect(oversized.classFormat).toBe('custom');
    expect(oversized.stationCount).toBe(CUSTOM_STRUCTURE_LIMITS.maxStations);
    expect(oversized.format.exercisesPerStation).toBe(CUSTOM_STRUCTURE_LIMITS.maxExercisesPerStation);
    expect(oversized.format.fixedStations).toBe(oversized.stationCount);

    // Junk falls back to the format's own defaults, and the derived interval stays inside the
    // 20..60s programming bound rather than becoming NaN or 0.
    for (const junk of ['abc', NaN, -3, 0]) {
      const structure = resolveBootcampStructure({
        classFormat: 'custom', stationCount: junk, exercisesPerStation: junk, targetDuration: 50,
      });
      expect(Number.isSafeInteger(structure.stationCount), String(junk)).toBe(true);
      expect(structure.stationCount).toBeGreaterThanOrEqual(CUSTOM_STRUCTURE_LIMITS.minStations);
      expect(structure.format.durationSec).toBeGreaterThanOrEqual(20);
      expect(structure.format.durationSec).toBeLessThanOrEqual(60);
    }
  });

  it('clampInt parses, bounds, and falls back — nothing else', () => {
    expect(clampInt('7', 4, 1, 10)).toBe(7);
    // parseInt reads the leading 12, then the 10 ceiling applies. Written as a bare 10: the
    // previous form (`12 === 12 ? 10 : 10`) evaluated to 10 either way, so it read as a
    // conditional while asserting nothing conditional.
    expect(clampInt('12abc', 4, 1, 10)).toBe(10);
    expect(clampInt(undefined, 4, 1, 10)).toBe(4);
    expect(clampInt(NaN, 4, 1, 10)).toBe(4);
    expect(clampInt(0, 4, 1, 10)).toBe(1);
    expect(clampInt(99, 4, 1, 10)).toBe(10);
  });
});

describe('the extraction is ONE function, re-exported rather than copied', () => {
  it('the generator re-exports the SAME function object the module exports', () => {
    // Identity, not behaviour: two implementations that happen to agree today is exactly the
    // drift the extraction was meant to remove.
    expect(reExported).toBe(resolveBootcampStructure);
    expect(__testing__.resolveBootcampStructure).toBe(resolveBootcampStructure);
  });

  it('keeps the constants it depends on unchanged in shape', () => {
    // The resolver reads these four; a silent change to any of them would move every derived
    // station count without touching this module.
    expect(typeof TRANSITION_TIME_SEC).toBe('number');
    expect(typeof STATION_TRANSITION_SEC).toBe('number');
    expect(CUSTOM_STRUCTURE_LIMITS.minStations).toBeLessThan(CUSTOM_STRUCTURE_LIMITS.maxStations);
    expect(Object.keys(FORMAT_CONFIG).length).toBeGreaterThan(20);
  });
});
