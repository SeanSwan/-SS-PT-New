import { describe, expect, it } from 'vitest';
import type { PlaudIntakeSummary } from '../../../../services/plaudIntakeService';
import { buildCoachIntakeNextMove } from './CoachIntakeNextMove.logic';

function summary(overrides: Partial<PlaudIntakeSummary>): PlaudIntakeSummary {
  return {
    total: 0,
    actionable: 0,
    today: 0,
    unprocessed: 0,
    processing: 0,
    readyReview: 0,
    needsClarification: 0,
    duplicateHold: 0,
    failed: 0,
    needsClient: 0,
    ...overrides,
  };
}

describe('buildCoachIntakeNextMove', () => {
  it('prioritizes ready review before lower urgency queue counts', () => {
    const move = buildCoachIntakeNextMove(summary({
      actionable: 4,
      readyReview: 2,
      needsClient: 3,
      failed: 1,
    }));

    expect(move.label).toBe('Review ready draft');
    expect(move.detail).toMatch(/approve, reject, or hold/i);
    expect(move.prompt).toMatch(/review ready Coach intake draft/i);
  });

  it('lets the active queue scope win when that scoped work exists', () => {
    const move = buildCoachIntakeNextMove(summary({
      actionable: 5,
      readyReview: 3,
      needsClient: 2,
    }), 'needs_client');

    expect(move.label).toBe('Resolve client hold');
    expect(move.prompt).toMatch(/resolve Coach intake client hold/i);
  });

  it('routes client holds and failed intake into clear next-step prompts', () => {
    expect(buildCoachIntakeNextMove(summary({ needsClient: 2 })).label).toBe('Resolve client hold');
    expect(buildCoachIntakeNextMove(summary({ failed: 1 })).label).toBe('Recover failed intake');
  });

  it('falls back to PLAUD capture only when the queue is empty', () => {
    const move = buildCoachIntakeNextMove(summary({ total: 0 }));

    expect(move.label).toBe('Capture intake');
    expect(move.detail).toMatch(/upload or sync/i);
    expect(move.prompt).toMatch(/set up the next Coach intake/i);
  });
});
