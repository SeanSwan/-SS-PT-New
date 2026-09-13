/**
 * ============================================================================
 * FILE: workIntervalProgression.test.mjs — R-H20 (slice E, prescription half).
 *
 * WHAT THIS LOCKS
 *   Contract §6 lines 260-266: the requested work-duration modifier must change the
 *   PRESCRIBED work interval — `max(1, round(baseWorkSec * requestedModifier))` —
 *   under a 60-second ceiling for automatically progressed ordinary work, with a
 *   manually saved longer interval preserved, and paced protocols left alone.
 *
 *   Before this, the resolved modifier's only consumer was a log string, which is
 *   exactly the failure row H20 exists to prevent.
 *
 * THE ANTI-TRAP ASSERTION is the FORMAT_CONFIG immutability check:
 *   `resolveBootcampStructure` returns `format: baseFormat` BY REFERENCE for every
 *   non-custom format (bootcampGenerator.mjs:436) and `FORMAT_CONFIG` is NOT frozen
 *   (bootcampConstants.mjs:11-60), so an in-place transform would corrupt the
 *   module-level config for the whole process — every later class, in every request.
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';
import {
  MANUAL_PROTOCOL_MODE,
  WORK_INTERVAL_CEILING_SEC,
  WORK_INTERVAL_MODE,
  applyWorkIntervalToFormat,
  fitWorkIntervalToBudget,
  isPacedProtocol,
  resolveWorkInterval,
} from '../../services/bootcamp/workIntervalProgression.mjs';
import { FORMAT_CONFIG } from '../../services/bootcamp/bootcampConstants.mjs';
import { resolveBootcampStructure } from '../../services/bootcamp/bootcampGenerator.mjs';
import { expandSegments } from '../../../shared/bootcamp-core/timeline.mjs';

const ordinary = { exercisesPerStation: 4, rounds: 2, fixedStations: 5 };
const resolve = (over = {}) => resolveWorkInterval({
  baseWorkSec: 30,
  requestedModifier: 1.05,
  format: ordinary,
  classFormat: 'stations_4x',
  ...over,
});

describe('R-H20 — the modifier changes the PRESCRIBED work interval', () => {
  it('applies max(1, round(base * modifier)) and reports it as applied', () => {
    const record = resolve({ baseWorkSec: 30, requestedModifier: 1.05 });
    expect(record.applied).toBe(true);
    expect(record.appliedWorkSec).toBe(32); // contract line 268's own example
    expect(record.mode).toBe(WORK_INTERVAL_MODE);
    expect(record.reason).toBe(WORK_INTERVAL_MODE);
    expect(record.baseWorkSec).toBe(30);
  });

  it('reduces for a factor below 1, including a deload on an ordinary interval', () => {
    const record = resolve({ baseWorkSec: 30, requestedModifier: 0.7 });
    expect(record.applied).toBe(true);
    expect(record.appliedWorkSec).toBe(21); // contract line 268's deload example
  });

  it('holds at the 60-second ceiling and does NOT claim an increase', () => {
    // 50 * 1.5 = 75 -> capped. Contract line 266: "A cap/rounding hold is
    // explicitly applied:false, not a claimed increase."
    const record = resolve({ baseWorkSec: 50, requestedModifier: 1.5 });
    // NOTHING was applied, so appliedWorkSec must equal the baseline — otherwise the
    // record contradicts its own `applied:false`, and callers read appliedWorkSec as
    // "what the class actually prescribes". Found by the real-generator test.
    expect(record.appliedWorkSec).toBe(50);
    expect(record.proposedWorkSec).toBe(WORK_INTERVAL_CEILING_SEC);
    expect(record.applied).toBe(false);
    expect(record.reason).toBe('work_interval_ceiling');
    expect(record.appliedWorkTotalSec).toBe(record.baseWorkTotalSec);
  });

  it('preserves a manually saved interval longer than the ceiling', () => {
    const record = resolve({ baseWorkSec: 90, requestedModifier: 1.2 });
    expect(record.applied).toBe(false);
    expect(record.appliedWorkSec).toBe(90);
    expect(record.reason).toBe('manual_override_preserved');
  });

  it('still REDUCES a manually saved long interval (a deload is not an increase)', () => {
    // "a manually saved longer interval is preserved as an override and does not
    // receive automated INCREASES" — a factor below 1 still reduces.
    const record = resolve({ baseWorkSec: 90, requestedModifier: 0.7 });
    expect(record.applied).toBe(true);
    expect(record.appliedWorkSec).toBe(63);
  });

  it('does not claim progression when the factor rounds back to the baseline', () => {
    const record = resolve({ baseWorkSec: 30, requestedModifier: 1.01 });
    expect(record.applied).toBe(false);
    expect(record.reason).toBe('rounded_to_baseline');
    expect(record.appliedWorkSec).toBe(30);
  });

  it('reports no_change for a factor of exactly 1', () => {
    expect(resolve({ requestedModifier: 1 })).toMatchObject({
      applied: false, reason: 'no_change', appliedWorkSec: 30,
    });
  });

  it('rejects a modifier that is not a usable factor', () => {
    for (const bad of [0, -1, NaN, Infinity, '1.1', null, undefined]) {
      expect(resolve({ requestedModifier: bad })).toMatchObject({
        applied: false, reason: 'invalid_modifier', appliedWorkSec: 30,
      });
    }
  });

  it('holds when there is no reducible interval at all', () => {
    // An AMRAP has `durationSec: null`; "never stamp a change on unchanged data".
    const record = resolve({ baseWorkSec: null, requestedModifier: 0.7 });
    expect(record.applied).toBe(false);
    expect(record.reason).toBe('unsupported_prescription');
  });

  it('leaves a paced protocol alone and says so', () => {
    for (const [classFormat, format] of [
      ['emom', FORMAT_CONFIG.emom],
      ['tabata', FORMAT_CONFIG.tabata],
      ['amrap', FORMAT_CONFIG.amrap],
    ]) {
      const record = resolve({ classFormat, format, requestedModifier: 1.2 });
      expect(record.mode).toBe(MANUAL_PROTOCOL_MODE);
      expect(record.applied).toBe(false);
      expect(record.reason).toBe('unsupported_protocol');
    }
  });

  it('detects paced protocols structurally, not only by name', () => {
    expect(isPacedProtocol({ restSec: 10 }, 'some_future_format')).toBe(true);
    expect(isPacedProtocol({ blockMin: 4 }, 'some_future_format')).toBe(true);
    expect(isPacedProtocol({ durationSec: 35, rounds: 2 }, 'stations_4x')).toBe(false);
    expect(isPacedProtocol(undefined, 'tabata')).toBe(true);
  });

  it('records before/after totals when the slot count is known', () => {
    // 5 stations x 4 exercises x 2 rounds = 40 work slots.
    const record = resolve({ baseWorkSec: 30, requestedModifier: 0.7, totalWorkSlots: 40 });
    expect(record.baseWorkTotalSec).toBe(1200);
    expect(record.appliedWorkTotalSec).toBe(840);
  });

  it('carries the policy version so a provenance row is self-describing', () => {
    expect(resolve().policyVersion).toBe('progressionPolicyV1');
    expect(resolve().source).toBe('unspecified');
    expect(resolve({ source: 'sprint_week_progression' }).source).toBe('sprint_week_progression');
  });
});

describe('R-H20 — applying the interval must never mutate shared config', () => {
  it('returns a copy and leaves FORMAT_CONFIG.stations_4x untouched', () => {
    const resolved = resolveBootcampStructure({ classFormat: 'stations_4x' });
    // The trap: this IS the shared config object, by reference.
    expect(resolved.format).toBe(FORMAT_CONFIG.stations_4x);

    const before = FORMAT_CONFIG.stations_4x.durationSec;
    const record = resolve({ baseWorkSec: before, requestedModifier: 0.7 });
    const updated = applyWorkIntervalToFormat(resolved.format, record);

    expect(updated).not.toBe(resolved.format);
    expect(updated.durationSec).toBe(record.appliedWorkSec);
    expect(resolved.format.durationSec).toBe(before);
    expect(FORMAT_CONFIG.stations_4x.durationSec).toBe(before);
  });

  it('survives a second call, so config cannot drift across requests', () => {
    const resolved = resolveBootcampStructure({ classFormat: 'stations_4x' });
    const baseline = FORMAT_CONFIG.stations_4x.durationSec;
    for (const modifier of [0.7, 1.3, 0.85]) {
      applyWorkIntervalToFormat(resolved.format, resolve({ baseWorkSec: baseline, requestedModifier: modifier }));
    }
    expect(FORMAT_CONFIG.stations_4x.durationSec).toBe(baseline);
    expect(resolveBootcampStructure({ classFormat: 'stations_4x' }).format.durationSec).toBe(baseline);
  });

  it('returns the SAME object when nothing applied, so no copy is wasted', () => {
    const resolved = resolveBootcampStructure({ classFormat: 'stations_4x' });
    const held = resolve({ baseWorkSec: 30, requestedModifier: 1 });
    expect(applyWorkIntervalToFormat(resolved.format, held)).toBe(resolved.format);
  });
});
