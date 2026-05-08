/**
 * coachActionProposalOnboardingGate.test.mjs
 * ==========================================
 * Regression coverage for Swan Coach onboarding proposal readiness gates.
 * Missing client-source context must become a clarification, not an approval-
 * ready client-create draft.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  COACH_PROPOSAL_STATUS,
  COACH_PROPOSAL_TYPE,
  createCoachActionProposalsFromAiResponse,
} from '../../services/ai/coachActionProposalService.mjs';

const ORIGINAL_ENV = { ...process.env };

function fakeSequelize() {
  const calls = [];
  return {
    calls,
    async query(sql, options = {}) {
      calls.push({ sql, options });
      if (sql.includes('to_regclass')) return [{ exists: 'coach_action_proposals' }];
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

describe('coachActionProposal onboarding gate', () => {
  beforeEach(() => {
    process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_ID = 'VTEST';
    process.env.PLAUD_TRANSCRIPT_ENCRYPTION_KEY_VTEST = Buffer.alloc(32, 8).toString('base64');
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('turns incomplete client onboarding blocks into clarification proposals', async () => {
    const db = fakeSequelize();
    const content = [
      'I need one more onboarding detail.',
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
      type: COACH_PROPOSAL_TYPE.CLARIFICATION,
      status: COACH_PROPOSAL_STATUS.PENDING,
      title: 'Answer Coach clarification',
      summary: {
        actionRequired: 'Answer clarification before deterministic approval can continue.',
        optionCount: 3,
      },
    });
    const serialized = JSON.stringify(db.calls.map((call) => call.options?.replacements), (_key, value) => (
      Buffer.isBuffer(value) ? '<buffer>' : value
    ));
    expect(serialized).toContain('clientSource');
    expect(serialized).not.toContain('Review client onboarding draft');
  });
});
