import { describe, expect, it } from 'vitest';
import { clientNavConfig } from './ClientStellarSidebar';

describe('ClientStellarSidebar navigation priority', () => {
  it('puts progress and logging in the first dashboard cluster', () => {
    const firstClusterLabels = clientNavConfig[0].items.map((item) => item.label);

    expect(firstClusterLabels).toEqual(['Home', 'My Progress', 'Log Workout']);
  });

  it('keeps workout history directly in the training cluster', () => {
    const trainingLabels = clientNavConfig
      .find((group) => group.section === 'TRAIN')
      ?.items.map((item) => item.label);

    expect(trainingLabels).toEqual(['My Workouts', 'Book Session']);
  });
});
