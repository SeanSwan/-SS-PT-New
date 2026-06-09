import { describe, expect, it } from 'vitest';
import {
  normalizeGoalCreatePayload,
  normalizeGoalUpdatePayload,
} from '../../services/clientProgress/goalPayloadNormalizer.mjs';

const futureDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString();
};

describe('client progress goal write payload normalization', () => {
  it('normalizes create payloads into real Goal model fields', () => {
    const fields = normalizeGoalCreatePayload({
      title: 'Pushup volume',
      targetValue: '50',
      currentValue: '10',
      unit: 'reps',
      category: 'strength',
      priority: 'critical',
      deadline: futureDate(),
    });

    expect(fields).toMatchObject({
      title: 'Pushup volume',
      targetValue: 50,
      currentValue: 10,
      unit: 'reps',
      category: 'strength',
      priority: 'critical',
      status: 'active',
      progressPercentage: 20,
    });
    expect(fields.progressHistory[0]).toMatchObject({
      value: 10,
      percentage: 20,
    });
  });

  it('updates current progress without trusting client-supplied percentages', () => {
    const fields = normalizeGoalUpdatePayload(
      { currentValue: 30, progressPercentage: 999 },
      {
        id: 'goal-1',
        currentValue: 10,
        targetValue: 30,
        status: 'active',
        progressHistory: [{ value: 10 }],
      },
    );

    expect(fields).toMatchObject({
      currentValue: 30,
      progressPercentage: 100,
      status: 'completed',
    });
    expect(fields.progressHistory.at(-1)).toMatchObject({
      value: 30,
      change: 20,
      percentage: 100,
    });
  });

  it('rejects incomplete create payloads before model access', () => {
    expect(() => normalizeGoalCreatePayload({
      title: 'No',
      targetValue: 0,
      unit: '',
      deadline: futureDate(),
    })).toThrow(/Goal title/);
  });
});
