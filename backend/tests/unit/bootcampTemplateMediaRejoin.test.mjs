import { describe, expect, it } from 'vitest';

import { __testing__ } from '../../services/bootcamp/bootcampCrud.mjs';

const createExercise = (overrides = {}) => {
  const values = {
    exerciseLibraryId: '11111111-1111-4111-8111-111111111111',
    exerciseName: 'Goblet Squat',
    videoUrl: null,
    previewVideoUrl: null,
    thumbnailUrl: null,
    description: null,
    instructions: null,
    ...overrides,
  };

  return {
    ...values,
    setDataValue(key, value) {
      this[key] = value;
    },
  };
};

describe('bootcamp template live media rejoin', () => {
  it('hydrates saved bootcamp exercises from the current shared Exercise media record', async () => {
    const exercise = createExercise();
    const template = {
      stations: [
        {
          exercises: [exercise],
        },
      ],
    };

    await __testing__.hydrateTemplateExerciseMedia(
      [template],
      async () => [
        {
          id: '11111111-1111-4111-8111-111111111111',
          videoUrl: 'https://cdn.swanstudios.test/exercises/goblet-squat.mp4',
          previewVideoUrl: 'https://cdn.swanstudios.test/exercises/goblet-squat-loop.webm',
          thumbnailUrl: 'https://cdn.swanstudios.test/exercises/goblet-squat.jpg',
          description: 'Goblet squat pattern with upright torso.',
          instructions: 'Brace, sit between the hips, and stand tall.',
        },
      ],
    );

    expect(exercise.videoUrl).toBe('https://cdn.swanstudios.test/exercises/goblet-squat.mp4');
    expect(exercise.previewVideoUrl).toBe('https://cdn.swanstudios.test/exercises/goblet-squat-loop.webm');
    expect(exercise.thumbnailUrl).toBe('https://cdn.swanstudios.test/exercises/goblet-squat.jpg');
    expect(exercise.description).toBe('Goblet squat pattern with upright torso.');
    expect(exercise.instructions).toBe('Brace, sit between the hips, and stand tall.');
  });

  it('keeps saved snapshot media when the live Exercise has a blank field', async () => {
    const exercise = createExercise({
      videoUrl: 'https://cdn.swanstudios.test/snapshot/goblet-squat.mp4',
      previewVideoUrl: 'https://cdn.swanstudios.test/snapshot/goblet-squat-loop.webm',
    });

    await __testing__.hydrateTemplateExerciseMedia(
      [{ exercises: [exercise] }],
      async () => [
        {
          id: '11111111-1111-4111-8111-111111111111',
          videoUrl: null,
          previewVideoUrl: '',
          thumbnailUrl: 'https://cdn.swanstudios.test/exercises/goblet-squat.jpg',
        },
      ],
    );

    expect(exercise.videoUrl).toBe('https://cdn.swanstudios.test/snapshot/goblet-squat.mp4');
    expect(exercise.previewVideoUrl).toBe('https://cdn.swanstudios.test/snapshot/goblet-squat-loop.webm');
    expect(exercise.thumbnailUrl).toBe('https://cdn.swanstudios.test/exercises/goblet-squat.jpg');
  });
});
