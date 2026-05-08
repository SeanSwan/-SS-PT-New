import { describe, expect, it } from 'vitest';

import {
  getProposalIntakeId,
  linkCoachActionProposalToIntake,
  normalizeCoachIntakeId,
} from '../../services/ai/coachActionProposalIntakeLinkService.mjs';
import {
  syncLatestProposalStatusToIntake,
  updateProposalStatus,
} from '../../services/ai/coachActionProposalPersistenceService.mjs';

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

  it('syncs latest proposal status only on the owning intake link', async () => {
    const db = fakeDb();
    const result = await syncLatestProposalStatusToIntake({
      row: {
        id: '88888888-8888-4888-9888-888888888888',
        created_by_user_id: 7,
        proposal_type: 'workout_log',
        status: 'APPLIED',
        summary_json: { title: 'Review workout log draft' },
        created_at: '2026-05-07T10:00:00.000Z',
      },
      db,
    });

    expect(result).toEqual({ synced: true, reason: 'synced' });
    expect(db.calls[0].sql).toContain('WHERE latest_proposal_id = :proposalId');
    expect(db.calls[0].sql).toContain('AND user_id = :userId');
    expect(db.calls[0].options.replacements).toMatchObject({
      proposalId: '88888888-8888-4888-9888-888888888888',
      userId: 7,
    });
    const latestProposal = JSON.parse(db.calls[0].options.replacements.latestProposalJson);
    expect(latestProposal).toMatchObject({
      id: '88888888-8888-4888-9888-888888888888',
      status: 'APPLIED',
      title: 'Review workout log draft',
    });
    expect(db.calls[0].options.replacements.latestProposalJson).not.toMatch(/rawTranscript|Marcus/i);
  });

  it('skips latest-proposal status sync without a valid owner id', async () => {
    const db = fakeDb();
    const result = await syncLatestProposalStatusToIntake({
      row: {
        id: '88888888-8888-4888-9888-888888888888',
        created_by_user_id: null,
        proposal_type: 'workout_log',
        status: 'APPLIED',
      },
      db,
    });

    expect(result).toEqual({ synced: false, reason: 'missing_inputs' });
    expect(db.calls).toEqual([]);
  });

  it('keeps proposal status authoritative if latest-intake metadata sync fails', async () => {
    const db = {
      calls: [],
      async query(sql, options = {}) {
        this.calls.push({ sql, options });
        if (sql.includes('UPDATE coach_action_proposals')) {
          return [{
            id: '88888888-8888-4888-9888-888888888888',
            created_by_user_id: 7,
            proposal_type: 'workout_log',
            status: options.replacements.status,
            summary_json: { title: 'Review workout log draft' },
            created_at: '2026-05-07T10:00:00.000Z',
          }];
        }
        throw new Error('metadata sync unavailable');
      },
    };

    const result = await updateProposalStatus({
      id: '88888888-8888-4888-9888-888888888888',
      status: 'APPLIED',
      db,
    });

    expect(result).toMatchObject({
      id: '88888888-8888-4888-9888-888888888888',
      status: 'APPLIED',
      title: 'Review workout log draft',
    });
    expect(db.calls[1].sql).toContain('UPDATE coach_intake_items');
  });

  it('appends a sanitized intake event when a linked proposal status changes', async () => {
    const db = {
      calls: [],
      async query(sql, options = {}) {
        this.calls.push({ sql, options });
        if (sql.includes('UPDATE coach_action_proposals')) {
          return [{
            id: '88888888-8888-4888-9888-888888888888',
            created_by_user_id: 7,
            proposal_type: 'workout_log',
            status: options.replacements.status,
            summary_json: { title: 'Marcus private workout draft' },
            created_at: '2026-05-07T10:00:00.000Z',
          }];
        }
        if (sql.includes('UPDATE coach_intake_items')) {
          return [{ id: '77777777-7777-4777-9777-777777777777' }];
        }
        if (sql.includes('INSERT INTO coach_intake_events')) {
          return [{ id: options.replacements.eventId }];
        }
        return [];
      },
    };

    await updateProposalStatus({
      id: '88888888-8888-4888-9888-888888888888',
      status: 'APPLIED',
      result: { workout: { notes: 'Marcus phone 555-0101 raw transcript text' } },
      db,
    });

    const eventCall = db.calls.find((call) => call.sql.includes('INSERT INTO coach_intake_events'));
    expect(eventCall).toBeTruthy();
    expect(eventCall.sql).toContain('WHERE latest_proposal_id = :proposalId');
    expect(eventCall.sql).toContain('AND user_id = :userId');
    expect(eventCall.options.replacements).toMatchObject({
      actorId: '7',
      eventType: 'proposal_applied',
      proposalId: '88888888-8888-4888-9888-888888888888',
      userId: 7,
    });
    expect(eventCall.options.replacements.eventJson).toContain('"status":"APPLIED"');
    expect(eventCall.options.replacements.eventJson).not.toMatch(/Marcus|555-0101|raw transcript/i);
  });

  it('keeps proposal status authoritative if intake event append fails', async () => {
    const db = {
      calls: [],
      async query(sql, options = {}) {
        this.calls.push({ sql, options });
        if (sql.includes('UPDATE coach_action_proposals')) {
          return [{
            id: '88888888-8888-4888-9888-888888888888',
            created_by_user_id: 7,
            proposal_type: 'workout_log',
            status: options.replacements.status,
            summary_json: { title: 'Review workout log draft' },
            created_at: '2026-05-07T10:00:00.000Z',
          }];
        }
        if (sql.includes('UPDATE coach_intake_items')) {
          return [{ id: '77777777-7777-4777-9777-777777777777' }];
        }
        if (sql.includes('INSERT INTO coach_intake_events')) {
          throw new Error('event table temporarily unavailable');
        }
        return [];
      },
    };

    const result = await updateProposalStatus({
      id: '88888888-8888-4888-9888-888888888888',
      status: 'APPLIED',
      db,
    });

    expect(result).toMatchObject({
      id: '88888888-8888-4888-9888-888888888888',
      status: 'APPLIED',
    });
    expect(db.calls.some((call) => call.sql.includes('INSERT INTO coach_intake_events'))).toBe(true);
  });
});
