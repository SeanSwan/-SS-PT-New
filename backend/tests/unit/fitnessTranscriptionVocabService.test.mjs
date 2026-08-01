/**
 * Fitness transcription vocabulary — S2 contract
 * ================================================
 * Keeps recognizer hints grounded in the static exercise corpus plus the
 * selected client's recent non-identifying loads.
 */
import { describe, expect, it } from 'vitest';

const { buildFitnessBiasTerms } = await import('../../services/fitnessTranscriptionVocabService.mjs');

describe('buildFitnessBiasTerms', () => {
  it('combines fitness vocabulary with recent exercise names and loads', () => {
    const terms = buildFitnessBiasTerms({
      vocabulary: ['bench press'],
      workoutLogs: [
        { exerciseName: 'Safety Bar Squat', weight: 185 },
        { exerciseName: 'Safety Bar Squat', weight: 185 },
        { exerciseName: 'Cable Row', weight: 0 },
      ],
    });

    expect(terms).toEqual(expect.arrayContaining([
      'bench press',
      'Safety Bar Squat',
      '185 pounds',
      'Cable Row',
    ]));
    expect(terms.filter((term) => term === 'Safety Bar Squat')).toHaveLength(1);
    expect(terms.slice(0, 3)).toEqual(['Safety Bar Squat', '185 pounds', 'Cable Row']);
  });
});
