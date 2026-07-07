/**
 * coachActionProposalClarificationApprovalService.test.mjs
 * ========================================================
 * Focused coverage for one-tap clarification answers.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const pendingClarificationRow = {
  id: '11111111-1111-1111-1111-111111111111',
  created_by_user_id: 7,
  proposal_type: 'clarification',
  status: 'PENDING',
  summary_json: { title: 'Answer Coach clarification' },
  proposal_cipher: 'cipher',
  proposal_iv: 'iv',
  proposal_tag: 'tag',
  cipher_key_id: 'VTEST',
};

function fakeClarificationDb({ row = pendingClarificationRow } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, options = {}) {
      calls.push({ sql, options });
      if (sql.includes('SELECT id, created_by_user_id')) return [row];
      if (sql.includes('status = :pendingStatus')) return [{ ...row, status: options.replacements.claimedStatus }];
      if (sql.includes('UPDATE coach_action_proposals')) {
        return [{
          ...row,
          status: options.replacements.status,
          summary_json: row.summary_json,
          created_at: '2026-05-06T12:00:00.000Z',
        }];
      }
      return [];
    },
  };
}

async function loadApprovalService() {
  vi.resetModules();
  // 1.1b: lock points at the unified write path (legacy fn retired).
  const submitAiWorkoutLogAsDailyForm = vi.fn();
  vi.doMock('../../database.mjs', () => ({ default: {} }));
  vi.doMock('../../services/plaudCipherService.mjs', () => ({
    decryptPayload: vi.fn(() => ({
      payload: {
        question: 'Which client should this workout use?',
        options: ['client_candidate:C1', 'client_candidate:C2'],
      },
    })),
  }));
  vi.doMock('../../services/workout/workoutLogService.mjs', () => ({
    WorkoutLogError: class WorkoutLogError extends Error {},
  }));
  vi.doMock('../../services/workout/aiWorkoutDailyFormService.mjs', () => ({
    submitAiWorkoutLogAsDailyForm,
    AiWorkoutDailyFormError: class AiWorkoutDailyFormError extends Error {},
  }));
  vi.doMock('../../utils/clientAccess.mjs', () => ({
    ensureClientAccess: vi.fn(async () => ({ allowed: true, clientId: 42 })),
  }));
  vi.doMock('../../services/coachClientOnboardingApprovalService.mjs', () => ({
    createClientFromCoachOnboardingProposal: vi.fn(),
    summarizeOnboardingDraftForReview: vi.fn(),
  }));
  vi.doMock('../../services/aiDataWriteService.mjs', () => ({ processAIDataUpdates: vi.fn() }));
  const service = await import('../../services/ai/coachActionProposalApprovalService.mjs');
  return { ...service, submitAiWorkoutLogAsDailyForm };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('coach clarification proposal approval', () => {
  it('records clarification answers without running deterministic writers', async () => {
    const db = fakeClarificationDb();
    const { answerCoachActionProposalClarification, submitAiWorkoutLogAsDailyForm } = await loadApprovalService();

    const result = await answerCoachActionProposalClarification({
      id: pendingClarificationRow.id,
      answer: 'client_candidate:C1',
      req: { user: { id: 7, role: 'trainer' } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ applied: false, clarificationAnswer: 'client_candidate:C1' });
    expect(submitAiWorkoutLogAsDailyForm).not.toHaveBeenCalled();
    const approvedCall = db.calls.find((call) => call.options.replacements?.status === 'APPROVED');
    expect(JSON.parse(approvedCall.options.replacements.resultJson)).toEqual({
      clarificationAnswer: 'client_candidate:C1',
    });
  });

  it('rejects clarification answers outside the supplied options before claiming', async () => {
    const db = fakeClarificationDb();
    const { answerCoachActionProposalClarification } = await loadApprovalService();

    const result = await answerCoachActionProposalClarification({
      id: pendingClarificationRow.id,
      answer: 'new_client',
      req: { user: { id: 7, role: 'trainer' } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('CLARIFICATION_ANSWER_OPTION_MISMATCH');
    expect(db.calls.some((call) => call.options.replacements?.claimedStatus === 'APPLYING')).toBe(false);
  });
});
