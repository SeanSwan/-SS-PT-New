/**
 * coachActionProposalSplitPlanApprovalService.test.mjs
 * ====================================================
 * Regression coverage for split-plan approval. Split plans approve the
 * proposed session boundaries; they do not write workout logs directly.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const splitPlanRow = {
  id: '22222222-2222-2222-2222-222222222222',
  created_by_user_id: 7,
  proposal_type: 'split_plan',
  status: 'PENDING',
  summary_json: { title: 'Review transcript split plan', splitCount: 2 },
  proposal_cipher: 'cipher',
  proposal_iv: 'iv',
  proposal_tag: 'tag',
  cipher_key_id: 'VTEST',
};

function fakeSplitApprovalDb({ order = [], throwOnInsert = false } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, options = {}) {
      calls.push({ sql, options });
      if (sql.includes('SELECT id, created_by_user_id')) return [splitPlanRow];
      if (sql.includes('status = :pendingStatus')) {
        order.push('claim');
        return [{ ...splitPlanRow, status: options.replacements.claimedStatus }];
      }
      if (sql.includes('INSERT INTO coach_action_proposals')) {
        order.push(`insert:${options.replacements.proposalType}`);
        if (throwOnInsert) throw new Error('proposal insert unavailable');
        return [{
          id: options.replacements.id,
          proposal_type: options.replacements.proposalType,
          status: 'PENDING',
          summary_json: JSON.parse(options.replacements.summaryJson),
          created_at: '2026-05-06T12:01:00.000Z',
        }];
      }
      if (sql.includes('UPDATE coach_action_proposals')) {
        return [{
          ...splitPlanRow,
          status: options.replacements.status,
          summary_json: splitPlanRow.summary_json,
          created_at: '2026-05-06T12:00:00.000Z',
        }];
      }
      return [];
    },
  };
}

const defaultSplitProposal = {
  payload: {
    proposalMeta: {
      intakeId: '77777777-7777-4777-9777-777777777777',
      evidenceRefs: ['parent_clip_meta'],
      safetyFlags: ['multi_session_split'],
    },
    splits: [
      {
        title: 'Morning lower body',
        date: '2026-05-05',
        recordedAtStart: '2026-05-05T09:00:00.000Z',
        reason: 'Clip one mentions squats and lunges.',
        evidenceRefs: ['clip_1_meta', 'client sean phone 555-0101'],
        exercises: [{ name: 'Squat', sets: [{ reps: 10, weight: 135 }] }],
        notes: 'Lower-body session from clip one.',
        rawTranscript: 'do not echo raw transcript into approval result',
      },
      {
        title: 'Evening upper body',
        date: '2026-05-05',
        reason: 'Clip two starts a separate upper-body session.',
        evidenceRefs: ['clip_2_meta'],
        exercises: [{ name: 'Bench press', sets: [{ reps: 8, weight: 185 }] }],
      },
    ],
  },
  targetUserId: 42,
};

async function loadApprovalService({ order = [], decryptedProposal = defaultSplitProposal } = {}) {
  vi.resetModules();
  const encryptedPayloads = [];
  const ensureClientAccess = vi.fn(async () => ({ allowed: true, clientId: 42 }));
  // 1.1b: the write path is the unified service now — the lock below
  // asserts split PREP never writes a workout through it.
  const submitAiWorkoutLogAsDailyForm = vi.fn(async () => {
    order.push('workout-write');
    return { id: 'workout-1' };
  });
  vi.doMock('../../database.mjs', () => ({ default: {} }));
  vi.doMock('../../utils/clientAccess.mjs', () => ({
    ensureClientAccess,
  }));
  vi.doMock('../../services/plaudCipherService.mjs', () => ({
    encryptPayload: vi.fn((payload) => {
      encryptedPayloads.push(payload);
      return ({
      cipher: 'child-cipher',
      iv: 'child-iv',
      tag: 'child-tag',
      keyId: 'VTEST',
      });
    }),
    decryptPayload: vi.fn(() => decryptedProposal),
  }));
  vi.doMock('../../services/workout/workoutLogService.mjs', () => ({
    WorkoutLogError: class WorkoutLogError extends Error {},
  }));
  vi.doMock('../../services/workout/aiWorkoutDailyFormService.mjs', () => ({
    submitAiWorkoutLogAsDailyForm,
    AiWorkoutDailyFormError: class AiWorkoutDailyFormError extends Error {},
  }));
  vi.doMock('../../services/coachClientOnboardingApprovalService.mjs', () => ({
    createClientFromCoachOnboardingProposal: vi.fn(),
    summarizeOnboardingDraftForReview: vi.fn(),
  }));
  vi.doMock('../../services/aiDataWriteService.mjs', () => ({
    processAIDataUpdates: vi.fn(),
  }));
  const service = await import('../../services/ai/coachActionProposalApprovalService.mjs');
  return { ...service, encryptedPayloads, ensureClientAccess, submitAiWorkoutLogAsDailyForm };
}
async function approveSplitProposal({ approveCoachActionProposal, getCoachActionProposal, db }) {
  const detailResult = await getCoachActionProposal({
    id: splitPlanRow.id,
    req: { user: { id: 7, role: 'trainer' } },
    sequelizeOverride: db,
  });
  return approveCoachActionProposal({
    id: splitPlanRow.id,
    req: {
      user: { id: 7, role: 'trainer' },
      body: { reviewToken: detailResult.body.proposal.reviewToken },
    },
    sequelizeOverride: db,
  });
}

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', 'unit-test-review-token-secret');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('split-plan Coach proposal approval', () => {
  it('prepares child workout proposals from valid split candidates without writing workouts', async () => {
    const order = [];
    const db = fakeSplitApprovalDb({ order });
    const {
      approveCoachActionProposal,
      encryptedPayloads,
      getCoachActionProposal,
      submitAiWorkoutLogAsDailyForm,
    } = await loadApprovalService({ order });

    const result = await approveSplitProposal({ approveCoachActionProposal, getCoachActionProposal, db });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      success: true,
      applied: false,
      splitPlan: {
        nextAction: 'prepare_workout_log_proposals',
        splitCount: 2,
        workoutProposalCount: 2,
        splits: [
          {
            title: 'Morning lower body',
            date: '2026-05-05',
            evidenceRefs: ['clip_1_meta'],
            redactedEvidenceRefCount: 1,
          },
          { title: 'Evening upper body', date: '2026-05-05', evidenceRefs: ['clip_2_meta'] },
        ],
      },
    });
    expect(result.body.splitPlan.workoutProposals).toHaveLength(2);
    expect(result.body.splitPlan.workoutProposals[0]).toMatchObject({
      type: 'workout_log',
      status: 'PENDING',
      summary: { clientId: 42, date: '2026-05-05', exerciseCount: 1 },
    });
    expect(JSON.stringify(result.body.splitPlan)).not.toContain('raw transcript');
    expect(JSON.stringify(result.body.splitPlan)).not.toContain('555-0101');
    expect(encryptedPayloads).toHaveLength(2);
    expect(encryptedPayloads[0].payload.proposalMeta).toMatchObject({
      intakeId: '77777777-7777-4777-9777-777777777777',
      parentProposalId: splitPlanRow.id,
      parentProposalType: 'split_plan',
    });
    expect(encryptedPayloads[1].payload.proposalMeta).toMatchObject({
      intakeId: '77777777-7777-4777-9777-777777777777',
      parentProposalId: splitPlanRow.id,
      parentProposalType: 'split_plan',
    });
    expect(submitAiWorkoutLogAsDailyForm).not.toHaveBeenCalled();
    expect(order).toEqual(['claim', 'insert:workout_log', 'insert:workout_log']);
  });

  it('carries parent historical source into child workout-log proposals', async () => {
    const order = [];
    const db = fakeSplitApprovalDb({ order });
    const {
      approveCoachActionProposal,
      encryptedPayloads,
      getCoachActionProposal,
    } = await loadApprovalService({
      order,
      decryptedProposal: {
        ...defaultSplitProposal,
        payload: {
          ...defaultSplitProposal.payload,
          source: 'historical_import',
        },
      },
    });

    const result = await approveSplitProposal({ approveCoachActionProposal, getCoachActionProposal, db });

    expect(result.status).toBe(200);
    expect(encryptedPayloads).toHaveLength(2);
    expect(encryptedPayloads[0].payload).toMatchObject({ source: 'historical_import' });
    expect(encryptedPayloads[1].payload).toMatchObject({ source: 'historical_import' });
  });

  it('skips malformed split client IDs before access checks or child proposal creation', async () => {
    const order = [];
    const db = fakeSplitApprovalDb({ order });
    const {
      approveCoachActionProposal,
      getCoachActionProposal,
      ensureClientAccess,
    } = await loadApprovalService({
      order,
      decryptedProposal: {
        payload: {
          splits: [
            {
              clientId: true,
              title: 'Bad client boundary',
              date: '2026-05-05',
              exercises: [{ name: 'Squat', sets: [{ reps: 10 }] }],
            },
          ],
        },
        targetUserId: 42,
      },
    });

    const result = await approveSplitProposal({ approveCoachActionProposal, getCoachActionProposal, db });

    expect(result.status).toBe(200);
    expect(result.body.splitPlan).toMatchObject({
      splitCount: 1,
      workoutProposalCount: 0,
      skippedWorkoutProposalCount: 1,
    });
    expect(ensureClientAccess).not.toHaveBeenCalled();
    expect(order).toEqual(['claim']);
  });
  it('marks split-plan approval failed when child proposal preparation errors after claim', async () => {
    const order = [];
    const db = fakeSplitApprovalDb({ order, throwOnInsert: true });
    const {
      approveCoachActionProposal,
      getCoachActionProposal,
    } = await loadApprovalService({ order });

    const result = await approveSplitProposal({ approveCoachActionProposal, getCoachActionProposal, db });

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({
      success: false,
      code: 'SPLIT_PLAN_APPROVAL_FAILED',
      error: 'Split-plan proposal could not be approved.',
    });
    expect(order).toEqual(['claim', 'insert:workout_log']);
    const failedUpdate = db.calls.find((call) => call.options.replacements?.status === 'FAILED');
    expect(failedUpdate?.options.replacements).toMatchObject({
      status: 'FAILED',
      errorCode: 'SPLIT_PLAN_APPROVAL_FAILED',
    });
  });
});
