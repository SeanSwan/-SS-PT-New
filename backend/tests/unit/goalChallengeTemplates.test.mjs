import { describe, expect, it } from 'vitest';
import {
  getGoalRecordCategory,
  getTemplatesForGoal,
  normalizeGoal,
} from '../../services/gamification/goalChallengeTemplates.mjs';

describe('goal challenge templates', () => {
  it('normalizes onboarding goal copy into stable template keys', () => {
    expect(normalizeGoal('lose weight')).toBe('weight_loss');
    expect(normalizeGoal('build strength')).toBe('muscle_gain');
    expect(normalizeGoal('run a faster 5k')).toBe('endurance');
    expect(normalizeGoal('increase mobility and stretch')).toBe('flexibility');
    expect(normalizeGoal('')).toBe('general_fitness');
  });

  it('keeps generated flexibility challenges in fitness language and category', () => {
    const { goalKey, templates } = getTemplatesForGoal('more flexibility');

    expect(goalKey).toBe('flexibility');
    expect(templates).toHaveLength(2);
    expect(templates.every((template) => template.category === 'fitness')).toBe(true);
    expect(JSON.stringify(templates)).not.toMatch(/\bmindfulness\b/i);
    expect(JSON.stringify(templates)).not.toMatch(/\byoga\b|\bmeditation\b/i);
  });

  it('maps primary goal records to existing goal categories without wellness wording', () => {
    expect(getGoalRecordCategory('weight_loss')).toBe('weight');
    expect(getGoalRecordCategory('muscle_gain')).toBe('strength');
    expect(getGoalRecordCategory('flexibility')).toBe('fitness');
  });
});
