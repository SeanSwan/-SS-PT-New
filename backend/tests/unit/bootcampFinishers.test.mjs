/**
 * SWA-105 Slice 3 — D2 (day-aware finishers) + D3 (full-group day awareness).
 */
import { describe, expect, it } from 'vitest';

import { pickFinishers, classifyFinisher } from '../../services/bootcamp/bootcampFinishers.mjs';
import { CARDIO_FINISHERS } from '../../services/bootcamp/bootcampConstants.mjs';
import { __testing__ } from '../../services/bootcamp/bootcampGenerator.mjs';

const rngFixed = () => 0.0; // deterministic offset 0

describe('D2 — finishers respect the day and the impact rule', () => {
  it('classifies the catalog: Squat Jumps are lower+high-impact, Mountain Climbers are not high-impact', () => {
    const squatJumps = CARDIO_FINISHERS.find((f) => f.name === 'Squat Jumps');
    const climbers = CARDIO_FINISHERS.find((f) => f.name === 'Mountain Climbers');
    expect(classifyFinisher(squatJumps)).toEqual({ primaryRegion: 'lower', highImpact: true });
    expect(classifyFinisher(climbers).highImpact).toBe(false);
  });

  it('LOWER day finishers spare the legs (the Squat-Jumps-on-leg-day bug)', () => {
    const { finishers, relaxed } = pickFinishers({
      dayTypeId: 'lower_body', count: 6, highImpactAllowed: false, rng: rngFixed,
    });
    expect(relaxed).toBeNull();
    for (const f of finishers) {
      const c = classifyFinisher(f);
      expect(c.primaryRegion).not.toBe('lower');
      expect(c.highImpact).toBe(false);
    }
  });

  it('a low-impact class excludes jump work even on upper day', () => {
    const { finishers, excludedHighImpact } = pickFinishers({
      dayTypeId: 'upper_body', count: 8, highImpactAllowed: false, rng: rngFixed,
    });
    expect(excludedHighImpact).toBeGreaterThan(0);
    expect(finishers.every((f) => !classifyFinisher(f).highImpact)).toBe(true);
  });

  it('cardio day may jump', () => {
    const { finishers } = pickFinishers({
      dayTypeId: 'cardio', count: CARDIO_FINISHERS.length, highImpactAllowed: true, rng: rngFixed,
    });
    expect(finishers.some((f) => classifyFinisher(f).highImpact)).toBe(true);
  });

  it('fails open with a named relaxation instead of dropping the finisher', () => {
    // Force starvation: a fake day whose spare-region rule cannot be satisfied
    // is not constructible via public API, so exercise the impact ladder: with
    // high impact disallowed the pool shrinks but never empties in the real
    // catalog — assert the invariant that count is always honored.
    const { finishers } = pickFinishers({
      dayTypeId: 'lower_body', count: 12, highImpactAllowed: false, rng: rngFixed,
    });
    expect(finishers).toHaveLength(12);
    expect(finishers.every(Boolean)).toBe(true);
  });

  it('varies the starting finisher with the rng (press-to-press variety preserved)', () => {
    const a = pickFinishers({ dayTypeId: 'full_body', count: 1, highImpactAllowed: false, rng: () => 0.0 });
    const b = pickFinishers({ dayTypeId: 'full_body', count: 1, highImpactAllowed: false, rng: () => 0.9 });
    expect(a.finishers[0].name).not.toBe(b.finishers[0].name);
  });
});

describe('D3 — full-group selection is day-aware', () => {
  const lowerMove = { primaryRegion: 'lower', regions: ['lower'], pattern: 'squat', joints: [], impact: 'low' };
  const upperMove = { primaryRegion: 'upper', regions: ['upper'], pattern: 'push_horizontal', joints: [], impact: 'low' };
  const mk = (key, muscles, coreMovement) => ({ key, muscles, coreMovement });

  it('the budget stops one region from eating the full-group class', () => {
    // 10 leg compounds + 2 upper compounds; full_body caps lower at 0.45 of 15.
    const pool = [
      ...Array.from({ length: 10 }, (_, i) => mk(`legs_${i}`, ['quads', 'glutes'], lowerMove)),
      mk('bench', ['chest', 'triceps'], upperMove),
      mk('row', ['lats', 'biceps'], upperMove),
    ];
    const picked = __testing__.selectFullGroupExercises(pool, rngFixed, {
      dayTypeId: 'full_body', totalSlots: 15, highImpactAllowed: false,
    });
    const compoundLegs = picked.filter((e) => !e.isCardio && e.coreMovement === lowerMove).length;
    expect(compoundLegs).toBeLessThanOrEqual(6); // floor(0.45*15)=6
    expect(picked.filter((e) => !e.isCardio).length).toBeGreaterThan(0);
  });

  it('full-group cardio five come from the day-aware picker, not the array head', () => {
    const pool = [mk('bench', ['chest', 'triceps'], upperMove)];
    const picked = __testing__.selectFullGroupExercises(pool, rngFixed, {
      dayTypeId: 'lower_body', totalSlots: 15, highImpactAllowed: false,
    });
    const cardio = picked.filter((e) => e.isCardio);
    expect(cardio.length).toBeGreaterThan(0);
    for (const f of cardio) {
      expect(classifyFinisher(f).primaryRegion).not.toBe('lower');
    }
  });

  it('without a context the legacy shape is unchanged (fail-safe default)', () => {
    const pool = [mk('bench', ['chest', 'triceps'], upperMove)];
    const picked = __testing__.selectFullGroupExercises(pool, rngFixed);
    expect(picked.filter((e) => e.isCardio)).toHaveLength(5);
  });
});
