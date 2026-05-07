/**
 * coachActionProposalService.test.mjs
 * ===================================
 * Unit coverage for Swan Coach structured action proposals. The model can
 * prepare drafts, while persistence and final writes remain deterministic.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  COACH_PROPOSAL_STATUS,
  COACH_PROPOSAL_TYPE,
  createCoachActionProposalsFromAiResponse,
} from '../../services/ai/coachActionProposalService.mjs';

const ORIGINAL_ENV = { ...process.env };

function fakeSequelize({ tableReady = true } = {}) {
  const calls = [];
  return {
    calls,
    async transaction(callback) {
      return callback({ fakeTransaction: true });
    },
    async query(sql, options = {}) {
      calls.push({ sql, options });
      if (sql.includes('to_regclass')) {
        return [{ exists: tableReady ? 'coach_action_proposals' : null }];
      }
      if (sql.includes('INSERT INTO coach_action_proposals')) {
        return [{
          id: options.replacements.id,
          proposal_type: options.replacements.proposalType,
          status: COACH_PROPOSAL_STATUS.PENDING,
          summary_json: JSON.parse(options.replacements.summaryJson),
          created_at: '2026-05-06T12:00:00.000Z',
        }];
      }
      return [];
    },
  };
}

describe('coachActionProposalService', () => {
  beforeEach(() => {
    process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_ID = 'VTEST';
    process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_VTEST = Buffer.alloc(32, 8).toString('base64');
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('turns create_client action blocks into pending onboarding proposals', async () => {
    const db = fakeSequelize();
    const content = [
      'Prepared the onboarding draft.',
      '```json',
      '{"action":"create_client","data":{"firstName":"Marcus","lastName":"Lee","fitnessGoal":"strength"}}',
      '```',
    ].join('\n');

    const result = await createCoachActionProposalsFromAiResponse({
      content,
      user: { id: 7, role: 'admin' },
      conversation: { id: 71, targetUserId: null },
      sequelizeOverride: db,
    });

    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]).toMatchObject({
      type: COACH_PROPOSAL_TYPE.CLIENT_ONBOARDING,
      status: COACH_PROPOSAL_STATUS.PENDING,
      title: 'Review client onboarding draft',
    });
    const serialized = JSON.stringify(db.calls.map((call) => call.options?.replacements), (_key, value) => (
      Buffer.isBuffer(value) ? '<buffer>' : value
    ));
    expect(serialized).not.toContain('fitnessGoal');
    expect(serialized).toContain('Review client onboarding draft');
  });

  it('turns workout imports and submit events into approval proposals, not frontend writes', async () => {
    const db = fakeSequelize();
    const content = [
      'Workout is ready.',
      '```json',
      '{"action":"import_workout_log","clientId":42,"date":"2026-05-05","exercises":[{"name":"Squat","sets":[{"reps":10,"weight":135}]}]}',
      '```',
      '```json',
      '{"action":"frontend_dispatch","event":"AI_SUBMIT_WORKOUT","payload":{"clientId":42}}',
      '```',
    ].join('\n');

    const result = await createCoachActionProposalsFromAiResponse({
      content,
      user: { id: 7, role: 'trainer' },
      conversation: { id: 71, targetUserId: 42 },
      sequelizeOverride: db,
    });

    expect(result.frontendActions).toEqual([]);
    expect(result.proposals.map((proposal) => proposal.type)).toEqual([
      COACH_PROPOSAL_TYPE.WORKOUT_LOG,
      COACH_PROPOSAL_TYPE.FRONTEND_DISPATCH,
    ]);
  });

  it('ignores malformed write action blocks instead of creating unusable proposals', async () => {
    const db = fakeSequelize();
    const content = [
      'Bad model output should stay visible as chat text only.',
      '```json',
      '{"action":"import_workout_log","clientId":42,"date":"2026-05-05","exercises":[]}',
      '```',
      '```json',
      '{"action":"update_client_data","updates":[]}',
      '```',
      '```json',
      '{"action":"frontend_dispatch","payload":{"clientId":42}}',
      '```',
    ].join('\n');

    const result = await createCoachActionProposalsFromAiResponse({
      content,
      user: { id: 7, role: 'trainer' },
      conversation: { id: 71, targetUserId: 42 },
      sequelizeOverride: db,
    });

    expect(result).toEqual({ proposals: [], frontendActions: [] });
    expect(db.calls.some((call) => call.sql.includes('INSERT INTO coach_action_proposals'))).toBe(false);
  });
});
