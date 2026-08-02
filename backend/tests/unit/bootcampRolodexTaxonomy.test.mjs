import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import {
  canonicalizeMuscle,
  muscleSearchTerms,
  normalizeMuscleList,
} from '../../services/bootcamp/bootcampTaxonomy.mjs';
import { toCoreMovement } from '../../services/bootcamp/dayTypeContract.mjs';
import { __testing__ as generatorTesting } from '../../services/bootcamp/bootcampGenerator.mjs';
import { __testing__ as bridgeTesting } from '../../services/bootcamp/exerciseRolodexBridge.mjs';

const bridgeSource = readFileSync(new URL('../../services/bootcamp/exerciseRolodexBridge.mjs', import.meta.url), 'utf8');

describe('Bootcamp Rolodex taxonomy boundary', () => {
  it('parenthesizes the active-row predicate so muscle filters apply to every active record', () => {
    expect(bridgeSource).toContain('("isActive" = true OR "isActive" IS NULL)');
    expect(bridgeSource).not.toContain('const conditions = ["isActive" = true OR "isActive" IS NULL]');
  });
  it('recursively decodes production double-encoded muscle arrays', () => {
    const stored = JSON.stringify(JSON.stringify(['Quadriceps', 'Glutes']));
    expect(normalizeMuscleList(stored)).toEqual(['quadriceps', 'glutes']);
  });

  it.each([
    ['quads', 'quadriceps'],
    ['Quadriceps', 'quadriceps'],
    ['chest', 'pectorals'],
    ['Pectorals', 'pectorals'],
    ['lats', 'latissimus_dorsi'],
    ['Latissimus Dorsi', 'latissimus_dorsi'],
    ['Anterior Deltoids', 'anterior_deltoid'],
  ])('maps %s to canonical %s', (input, expected) => {
    expect(canonicalizeMuscle(input)).toBe(expected);
  });

  it.each([
    ['Forearms', 'forearms'],
    ['Hip Rotators', 'hip_rotators'],
    ['Tibialis Anterior', 'tibialis_anterior'],
    ['Upper Back', 'upper_back'],
    ['Upper Pectorals', 'upper_chest'],
    ['Brachialis', 'brachialis'],
    ['Lower Pectorals', 'lower_chest'],
    ['Lower Trapezius', 'traps'],
    ['Serratus Anterior', 'serratus_anterior'],
    ['Piriformis', 'piriformis'],
    ['Rear Delts', 'rear_deltoid'],
    ['Upper Trapezius', 'traps'],
    ['Back', 'upper_back'],
    ['Deep Cervical Flexors', 'neck_flexors'],
    ['Deep Neck Flexors', 'neck_flexors'],
    ['Middle Traps', 'traps'],
    ['Peroneal Group', 'peroneals'],
    ['Posterior Tibialis', 'posterior_tibialis'],
    ['Sternocleidomastoid', 'sternocleidomastoid'],
    ['Triceps Long Head', 'triceps'],
  ])('covers production Rolodex label %s as %s', (input, expected) => {
    expect(canonicalizeMuscle(input)).toBe(expected);
  });

  it('preserves an unknown primary label instead of promoting a known secondary muscle', () => {
    expect(normalizeMuscleList(['Future Muscle', 'Lats'])).toEqual(['future_muscle', 'latissimus_dorsi']);
  });
  it('expands station aliases into the Rolodex search vocabulary', () => {
    expect(muscleSearchTerms('quads')).toEqual(expect.arrayContaining(['quads', 'quadriceps']));
    expect(muscleSearchTerms('chest')).toEqual(expect.arrayContaining(['chest', 'pectorals']));
    expect(muscleSearchTerms('lats')).toEqual(expect.arrayContaining(['lats', 'latissimus dorsi']));
    expect(muscleSearchTerms('lats')).not.toContain('lat');
  });

  it('derives a usable movement pattern from the exercise name when the Rolodex pattern is blank', () => {
    const formatted = bridgeTesting.formatForBootcamp({
      id: 'exercise-id',
      name: 'Barbell Back Squat',
      primaryMuscles: JSON.stringify(['Quadriceps']),
      secondaryMuscles: JSON.stringify(['Glutes']),
      nasmMovementPattern: null,
      exerciseType: 'compound',
    });
    expect(formatted.category).toBe('squat');
  });
  it('classifies real Rolodex-shaped capitalized records in the day-type contract', () => {
    const movement = toCoreMovement({
      name: 'Box Step-Up Cardio',
      primaryMuscle: 'Quadriceps',
      muscles: ['Quadriceps', 'Glutes', 'Core'],
      category: 'squat',
    });
    expect(movement).toMatchObject({ primaryRegion: 'lower', pattern: 'squat' });
  });

  it('never fills a named station with unrelated fallback movements', () => {
    const pool = [
      { name: 'Band Squat', key: 'band_squat', primaryMuscle: 'Quadriceps', muscles: ['Quadriceps', 'Glutes'], exerciseType: 'compound', category: 'squat' },
      { name: 'Line Hop', key: 'line_hop', primaryMuscle: 'Calves', muscles: ['Calves', 'Core'], exerciseType: 'calisthenics', category: 'gait' },
      { name: 'Band Chest Press', key: 'band_chest_press', primaryMuscle: 'Pectorals', muscles: ['Pectorals', 'Triceps'], exerciseType: 'compound', category: 'push' },
    ];

    const picks = generatorTesting.selectStationExercises(pool, ['quads'], 4, new Set(), () => 0.5);
    expect(picks.map((pick) => pick.key)).toEqual(['band_squat']);
  });
});