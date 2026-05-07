/**
 * coachActionProposalSplitPlanApprovalService.test.mjs
 * ====================================================
 * Regression coverage for split-plan approval. Split plans approve the
 * proposed session boundaries; they do not write workout logs directly.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

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

function fakeSplitApprovalDb({ order = [] } = {}) {
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

async function loadApprovalService({ order = [] } = {}) {
  vi.resetModules();
  const logWorkoutForClient = vi.fn(async () => {
    order.push('workout-write');
    return { id: 'workout-1' };
  });
  vi.doMock('../../database.mjs', () => ({ default: {} }));
  vi.doMock('../../utils/clientAccess.mjs', () => ({
    ensureClientAccess: vi.fn(async () => ({ allowed: true, clientId: 42 })),
  }));
  vi.doMock('../../services/plaudCipherService.mjs', () => ({
    encryptPayload: vi.fn(() => ({
      cipher: 'child-cipher',
      iv: 'child-iv',
      tag: 'child-tag',
      keyId: 'VTEST',
    })),
    decryptPayload: vi.fn(() => ({
      payload: {
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
    })),
  }));
  vi.doMock('../../services/workout/workoutLogService.mjs', () => ({
    logWorkoutForClient,
    WorkoutLogError: class WorkoutLogError extends Error {},
  }));
  vi.doMock('../../services/coachClientOnboardingApprovalService.mjs', () => ({
    createClientFromCoachOnboardingProposal: vi.fn(),
    summarizeOnboardingDraftForReview: vi.fn(),
  }));
  vi.doMock('../../services/aiDataWriteService.mjs', () => ({
    processAIDataUpdates: vi.fn(),
  }));
  const service = await import('../../services/ai/coachActionProposalApprovalService.mjs');
  return { ...service, logWorkoutForClient };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('split-plan Coach proposal approval', () => {
  it('prepares child workout proposals from valid split candidates without writing workouts', async () => {
    const order = [];
    const db = fakeSplitApprovalDb({ order });
    const { approveCoachActionProposal, logWorkoutForClient } = await loadApprovalService({ order });

    const result = await approveCoachActionProposal({
      id: splitPlanRow.id,
      req: { user: { id: 7, role: 'trainer' } },
      sequelizeOverride: db,
    });

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
    expect(logWorkoutForClient).not.toHaveBeenCalled();
    expect(order).toEqual(['claim', 'insert:workout_log', 'insert:workout_log']);
  });
});
