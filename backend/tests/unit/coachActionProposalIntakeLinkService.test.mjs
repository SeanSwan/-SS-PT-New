import { describe, expect, it } from 'vitest';

import {
  getProposalIntakeId,
  linkCoachActionProposalToIntake,
  normalizeCoachIntakeId,
} from '../../services/ai/coachActionProposalIntakeLinkService.mjs';

function fakeDb() {
  const calls = [];
  return {
    calls,
    async query(sql, options = {}) {
      calls.push({ sql, options });
      return [{ id: options.replacements?.intakeId }];
    },
  };
}

describe('coachActionProposalIntakeLinkService', () => {
  it('accepts only UUID intake ids from proposal metadata', () => {
    expect(normalizeCoachIntakeId('coach:77777777-7777-4777-9777-777777777777'))
      .toBe('77777777-7777-4777-9777-777777777777');
    expect(normalizeCoachIntakeId('Marcus private note')).toBeNull();
    expect(getProposalIntakeId({ payload: { proposalMeta: { intakeId: 'not-a-uuid' } } })).toBeNull();
  });

  it('updates only the current trainer owned intake row', async () => {
    const db = fakeDb();
    const result = await linkCoachActionProposalToIntake({
      proposal: {
        type: 'workout_log',
        payload: { proposalMeta: { intakeId: '77777777-7777-4777-9777-777777777777' } },
      },
      persisted: {
        id: '88888888-8888-4888-9888-888888888888',
        type: 'workout_log',
        status: 'PENDING',
        title: 'Review workout log draft',
        createdAt: '2026-05-07T10:00:00.000Z',
      },
      user: { id: 7 },
      db,
    });

    expect(result).toEqual({ linked: true, reason: 'linked' });
    expect(db.calls[0].sql).toContain('WHERE id = :intakeId');
    expect(db.calls[0].sql).toContain('AND user_id = :userId');
    expect(db.calls[0].options.replacements).toMatchObject({
      intakeId: '77777777-7777-4777-9777-777777777777',
      proposalId: '88888888-8888-4888-9888-888888888888',
      userId: 7,
    });
    expect(db.calls[0].options.replacements.latestProposalJson).not.toMatch(/rawTranscript|Marcus/i);
  });

  it('skips database writes when the proposal has no safe intake id', async () => {
    const db = fakeDb();
    const result = await linkCoachActionProposalToIntake({
      proposal: { type: 'workout_log', payload: { proposalMeta: { intakeId: 'client Marcus' } } },
      persisted: { id: '88888888-8888-4888-9888-888888888888' },
      user: { id: 7 },
      db,
    });

    expect(result.linked).toBe(false);
    expect(db.calls).toEqual([]);
  });
});
