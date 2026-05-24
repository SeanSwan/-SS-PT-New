import { describe, expect, it } from 'vitest';

import { __testing__ } from '../../services/bootcamp/bootcampGenerator.mjs';
import { applyClassStyle } from '../../services/bootcamp/classStyleModifiers.mjs';

describe('bootcamp generation semantics', () => {
  it('orders calisthenics and flexibility requests around the selected intensity instead of treating it as metadata only', () => {
    const exercises = [
      { name: 'Barbell Back Squat', key: 'barbell_back_squat', muscles: ['quads'], equipment: ['barbell'], difficulty: 700 },
      { name: 'Hip Mobility Flow', key: 'hip_mobility_flow', muscles: ['hip_flexors'], equipment: ['mat'], difficulty: 200 },
      { name: 'Push Up', key: 'push_up', muscles: ['chest'], equipment: ['bodyweight'], difficulty: 350 },
    ];

    expect(__testing__.rankExercisesForBootcamp(exercises, { intensityCategory: 'calisthenics' })[0].name).toBe('Push Up');
    expect(__testing__.rankExercisesForBootcamp(exercises, { intensityCategory: 'flexibility' })[0].name).toBe('Hip Mobility Flow');
  });

  it('gives every exposed non-standard class style a real coaching cue on the generated exercises', () => {
    const styles = ['pyramid', 'superset', 'mixed', 'ladder', 'descending', 'chipper', 'countdown', 'death_by', 'ygig', 'contrast', 'density'];

    for (const style of styles) {
      const exercises = [
        { exerciseName: 'Goblet Squat', board: 'main', stationIndex: 0, sortOrder: 1, durationSec: 35, restSec: 15, isCardioFinisher: false },
        { exerciseName: 'Push Up', board: 'main', stationIndex: 0, sortOrder: 2, durationSec: 35, restSec: 15, isCardioFinisher: false },
        { exerciseName: 'Step Jacks', board: 'alternative', stationIndex: 0, sortOrder: 1, durationSec: 35, restSec: 15, isCardioFinisher: false },
      ];
      const explanations = [];

      applyClassStyle(style, exercises, explanations);

      const mainExercises = exercises.filter(ex => ex.board === 'main');
      expect(explanations.some(exp => exp.type === 'style' && exp.message.toLowerCase().includes(style.replace('_', ' ')))).toBe(true);
      expect(mainExercises.every(ex => typeof ex.description === 'string' && ex.description.length > 0)).toBe(true);
      expect(exercises.find(ex => ex.board === 'alternative').description).toBeUndefined();
    }
  });
});
