/**
 * coachActionProposalFrontendDispatch.test.mjs
 * ============================================
 * Regression coverage for schema-bound Coach frontend draft actions.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCoachActionProposalsFromAiResponse } from '../../services/ai/coachActionProposalService.mjs';

const ORIGINAL_ENV = { ...process.env };

function fakeSequelize() {
  const calls = [];
  return {
    calls,
    async query(sql) {
      calls.push({ sql });
      if (sql.includes('to_regclass')) return [{ exists: 'coach_action_proposals' }];
      return [];
    },
  };
}

describe('coachActionProposalService frontend dispatch bridge', () => {
  beforeEach(() => {
    process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_ID = 'VTEST';
    process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_VTEST = Buffer.alloc(32, 8).toString('base64');
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('routes schema-bound safe frontend dispatches to the existing frontend action bridge', async () => {
    const db = fakeSequelize();
    const content = [
      'Draft form action prepared.',
      '```json',
      JSON.stringify({
        action: 'coach_action_proposal',
        schema_version: '2026-05-07',
        proposal_type: 'frontend_dispatch',
        evidence_refs: ['coach_form_draft'],
        payload: {
          event: 'AI_ADD_EXERCISE',
          payload: { exerciseName: 'Goblet squat', sets: 3, reps: 10 },
        },
      }),
      '```',
    ].join('\n');

    const result = await createCoachActionProposalsFromAiResponse({
      content,
      user: { id: 7, role: 'trainer' },
      conversation: { id: 71, targetUserId: 42 },
      sequelizeOverride: db,
    });

    expect(result.proposals).toEqual([]);
    expect(result.frontendActions).toEqual([{
      event: 'AI_ADD_EXERCISE',
      payload: { exerciseName: 'Goblet squat', sets: 3, reps: 10 },
    }]);
    expect(db.calls.some((call) => call.sql.includes('INSERT INTO coach_action_proposals'))).toBe(false);
  });

  it('strips non-draft fields from safe frontend dispatch payloads', async () => {
    const db = fakeSequelize();
    const content = [
      'Draft form action prepared.',
      '```json',
      JSON.stringify({
        action: 'coach_action_proposal',
        schema_version: '2026-05-07',
        proposal_type: 'frontend_dispatch',
        payload: {
          event: 'AI_ADD_EXERCISE',
          payload: {
            exerciseName: 'Goblet squat',
            sets: 3,
            reps: 10,
            event: 'AI_SUBMIT_WORKOUT',
            action: 'frontend_dispatch',
            frontendEvent: 'AI_SUBMIT_WORKOUT',
            nested: { event: 'AI_SUBMIT_WORKOUT' },
          },
        },
      }),
      '```',
    ].join('\n');

    const result = await createCoachActionProposalsFromAiResponse({
      content,
      user: { id: 7, role: 'trainer' },
      conversation: { id: 71, targetUserId: 42 },
      sequelizeOverride: db,
    });

    expect(result.proposals).toEqual([]);
    expect(result.frontendActions).toEqual([{
      event: 'AI_ADD_EXERCISE',
      payload: { exerciseName: 'Goblet squat', sets: 3, reps: 10 },
    }]);
    expect(db.calls.some((call) => call.sql.includes('INSERT INTO coach_action_proposals'))).toBe(false);
  });

  it('drops safe frontend dispatches when required draft fields are missing', async () => {
    const db = fakeSequelize();
    const content = [
      'Draft form action prepared.',
      '```json',
      JSON.stringify({
        action: 'coach_action_proposal',
        schema_version: '2026-05-07',
        proposal_type: 'frontend_dispatch',
        payload: {
          event: 'AI_ADD_EXERCISE',
          payload: { reps: 10 },
        },
      }),
      '```',
    ].join('\n');

    const result = await createCoachActionProposalsFromAiResponse({
      content,
      user: { id: 7, role: 'trainer' },
      conversation: { id: 71, targetUserId: 42 },
      sequelizeOverride: db,
    });

    expect(result).toEqual({ proposals: [], frontendActions: [] });
    expect(db.calls).toEqual([]);
  });

  it('does not emit frontend draft actions for client-role conversations', async () => {
    const db = fakeSequelize();
    const content = [
      'Draft form action prepared.',
      '```json',
      '{"action":"frontend_dispatch","event":"AI_ADD_EXERCISE","payload":{"exerciseName":"Squat"}}',
      '```',
    ].join('\n');

    const result = await createCoachActionProposalsFromAiResponse({
      content,
      user: { id: 8, role: 'client' },
      conversation: { id: 72, targetUserId: 8 },
      sequelizeOverride: db,
    });

    expect(result).toEqual({ proposals: [], frontendActions: [] });
    expect(db.calls).toEqual([]);
  });
});
