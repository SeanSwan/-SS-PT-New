import { describe, expect, it } from 'vitest';

import { buildBootcampBoardViews, getLowImpactDisplay } from './BootcampBoardViews';

describe('Bootcamp board views', () => {
  const exercises = [
    { exerciseName: 'Box Jump', board: 'main', stationIndex: 0, sortOrder: 1 },
    { exerciseName: 'Low Box Step-Up', board: 'alternative', stationIndex: 0, sortOrder: 1, sourceExerciseName: 'Box Jump' },
    { exerciseName: 'Step-Up', board: 'lowImpact', stationIndex: 0, sortOrder: 1, sourceExerciseName: 'Box Jump' },
    { exerciseName: 'Push Up', board: 'main', stationIndex: 1, sortOrder: 1, easyVariation: 'Incline Push Up' },
  ];

  it('separates generated main, joint-friendly, and low-impact board entries by station', () => {
    const views = buildBootcampBoardViews(exercises);

    expect(views.mainExercises.map(ex => ex.exerciseName)).toEqual(['Box Jump', 'Push Up']);
    expect(views.jointFriendlyByStation[0].map(ex => ex.exerciseName)).toEqual(['Low Box Step-Up']);
    expect(views.lowImpactByStation[0].map(ex => ex.exerciseName)).toEqual(['Step-Up']);
  });

  it('falls back to main board exercises when generated alternatives are not present for a station', () => {
    const views = buildBootcampBoardViews(exercises);

    expect(views.getJointFriendlyExercises(1).map(ex => ex.exerciseName)).toEqual(['Push Up']);
    expect(views.getLowImpactExercises(1).map(ex => ex.exerciseName)).toEqual(['Push Up']);
  });

  it('shows generated low-impact entries as source to swap text', () => {
    expect(getLowImpactDisplay(exercises[2])).toEqual({
      sourceName: 'Box Jump',
      swapName: 'Step-Up',
    });
  });
});
