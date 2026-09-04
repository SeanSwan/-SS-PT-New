import { describe, expect, it } from 'vitest';
import { normalizeCoachCatalogCommands } from './coachCommandCatalog';

describe('coach command catalog normalization', () => {
  it('keeps executable descriptions and drops malformed rows', () => {
    expect(normalizeCoachCatalogCommands([
      { type: 'log_workout', description: 'Log a workout', category: 'Workout' },
      { type: 'bad' },
      null,
    ])).toEqual([{ type: 'log_workout', description: 'Log a workout', group: 'Workout' }]);
  });

  it('prefers a live example when the registry omits a description', () => {
    expect(normalizeCoachCatalogCommands([
      { type: 'view_goals', examples: ['Show goals'], category: 'Goals' },
    ])).toEqual([{ type: 'view_goals', description: 'Show goals', group: 'Goals', examples: ['Show goals'] }]);
  });
});
