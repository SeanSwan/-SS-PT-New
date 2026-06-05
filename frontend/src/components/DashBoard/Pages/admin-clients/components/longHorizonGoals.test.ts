import { describe, expect, it } from 'vitest';
import { getClientGoalsFromDetails } from './longHorizonGoals';

describe('longHorizonGoals', () => {
  it('reads goals from the canonical data.client.masterPromptJson shape', () => {
    const result = getClientGoalsFromDetails({
      data: {
        client: {
          masterPromptJson: JSON.stringify({
            client: {
              goals: {
                primary: 'strength',
                secondary: ['hypertrophy', 'conditioning'],
                constraints: ['left shoulder'],
              },
            },
          }),
        },
      },
    });

    expect(result).toEqual({
      primaryGoal: 'strength',
      secondaryGoals: ['hypertrophy', 'conditioning'],
      constraints: ['left shoulder'],
    });
  });

  it('falls back to general fitness when the primary goal is blank', () => {
    const result = getClientGoalsFromDetails({
      client: {
        masterPromptJson: {
          goals: {
            primaryGoal: '',
            secondaryGoals: ['mobility'],
            constraints: [],
          },
        },
      },
    });

    expect(result?.primaryGoal).toBe('general_fitness');
    expect(result?.secondaryGoals).toEqual(['mobility']);
  });

  it('returns null when profile goal data is absent or malformed', () => {
    expect(getClientGoalsFromDetails({ data: { client: {} } })).toBeNull();
    expect(getClientGoalsFromDetails(null)).toBeNull();
  });
});
