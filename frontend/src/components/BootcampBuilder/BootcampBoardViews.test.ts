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

  it('keeps malformed station assignments visible in station groups', () => {
    const views = buildBootcampBoardViews([
      { exerciseName: 'Battle Rope', board: 'main', stationIndex: -1, sortOrder: 1 },
      { exerciseName: 'Bear Crawl', board: 'main', stationIndex: 2.8, sortOrder: 1 },
      { exerciseName: 'Supported Bear Crawl', board: 'lowImpact', stationIndex: 2.8, sortOrder: 1, sourceExerciseName: 'Bear Crawl' },
    ]);

    expect(views.stationExercises[0].map(ex => ex.exerciseName)).toEqual(['Battle Rope']);
    expect(views.stationExercises[2].map(ex => ex.exerciseName)).toEqual(['Bear Crawl']);
    expect(views.getLowImpactExercises(2).map(ex => ex.exerciseName)).toEqual(['Supported Bear Crawl']);
    expect(views.stationExercises[-1]).toBeUndefined();
  });

  it('shows generated low-impact entries as source to swap text', () => {
    expect(getLowImpactDisplay(exercises[2])).toEqual({
      sourceName: 'Box Jump',
      swapName: 'Step-Up',
    });
  });
});
