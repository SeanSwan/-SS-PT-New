/**
 * coachActionProposalApprovalService.test.mjs
 * ===========================================
 * Behavioral coverage for deterministic proposal approval writes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createProposalReviewToken,
  verifyProposalReviewToken,
} from '../../services/ai/coachProposalReviewTokenService.mjs';

const pendingWorkoutRow = {
  id: '11111111-1111-1111-1111-111111111111',
  created_by_user_id: 7,
  proposal_type: 'workout_log',
  status: 'PENDING',
  summary_json: { title: 'Review workout log draft' },
  proposal_cipher: 'cipher',
  proposal_iv: 'iv',
  proposal_tag: 'tag',
  cipher_key_id: 'VTEST',
};

function fakeApprovalDb({ claimSucceeds = true, order = [], row = pendingWorkoutRow } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, options = {}) {
      calls.push({ sql, options });
      if (sql.includes('SELECT id, created_by_user_id')) return [row];
      if (sql.includes('status = :pendingStatus')) {
        order.push('claim');
        return claimSucceeds ? [{ ...row, status: options.replacements.claimedStatus }] : [];
      }
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

function fakeRejectRaceDb({ order = [] } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, options = {}) {
      calls.push({ sql, options });
      if (sql.includes('SELECT id, created_by_user_id')) return [pendingWorkoutRow];
      if (sql.includes('UPDATE coach_action_proposals') && options.replacements?.status === 'REJECTED') {
        order.push('reject-attempt');
        return sql.includes('created_by_user_id = :userId') && sql.includes('status = :fromStatus')
          ? []
          : [{ ...pendingWorkoutRow, status: 'REJECTED' }];
      }
      return [];
    },
  };
}

async function loadApprovalService({ order = [], decryptedProposal = null, accessAllowed = true } = {}) {
  vi.resetModules();
  const submitAiWorkoutLogAsDailyForm = vi.fn(async ({ beforeWrite, beforeCommit }) => {
    const callbacks = [];
    const transaction = { afterCommit: callback => callbacks.push(callback) };
    await beforeWrite?.({ transaction });
    order.push('workout-write');
    const workout = { id: 'workout-1', formId: 'form-1', sessionId: 'session-1' };
    await beforeCommit?.({ transaction, workout, dailyForm: { id: 'form-1' }, workoutSession: { id: 'session-1' } });
    for (const callback of callbacks) await callback();
    return workout;
  });
  const ensureClientAccess = vi.fn(async () => (
    accessAllowed ? { allowed: true, clientId: 42 } : { allowed: false, status: 403, message: 'Client access denied' }
  ));
  const processAIDataUpdates = vi.fn(async () => ({ successful: 1, errors: [] }));
  const createMacroEntries = vi.fn(async (meals) => {
    order.push('nutrition-write');
    return { mealsLogged: Array.isArray(meals) ? meals.length : 0, date: '2026-05-05', totalCalories: 755 };
  });
  vi.doMock('../../database.mjs', () => ({ default: {} }));
  vi.doMock('../../utils/clientAccess.mjs', () => ({
    ensureClientAccess,
  }));
  vi.doMock('../../services/plaudCipherService.mjs', () => ({
    decryptPayload: vi.fn(() => decryptedProposal || ({
      payload: { clientId: 42, date: '2026-05-05', exercises: [{ name: 'Squat' }] },
      targetUserId: 42,
    })),
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
    processAIDataUpdates,
  }));
  vi.doMock('../../services/nutrition/macroLogService.mjs', () => ({
    createMacroEntries,
  }));
  const service = await import('../../services/ai/coachActionProposalApprovalService.mjs');
  return { ...service, ensureClientAccess, submitAiWorkoutLogAsDailyForm, processAIDataUpdates, createMacroEntries };
}

const pendingNutritionRow = {
  ...pendingWorkoutRow,
  proposal_type: 'nutrition_log',
  summary_json: { title: 'Review nutrition log draft' },
};
const nutritionPayload = {
  payload: { clientId: 42, date: '2026-05-05', meals: [{ mealType: 'lunch', description: 'burrito bowl', calories: 650, verified: true }] },
  targetUserId: 42,
};

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', 'unit-test-review-token-secret');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('coachActionProposalApprovalService', () => {
  it('claims a pending proposal inside the writer before domain effects', async () => {
    const order = [];
    const db = fakeApprovalDb({ order });
    const { approveCoachActionProposal, getCoachActionProposal, submitAiWorkoutLogAsDailyForm } = await loadApprovalService({ order });
    const detailResult = await getCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' } },
      sequelizeOverride: db,
    });

    const result = await approveCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' }, body: { reviewToken: detailResult.body.proposal.reviewToken } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(200);
    expect(submitAiWorkoutLogAsDailyForm).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['claim', 'workout-write']);
    const claimCall = db.calls.find((call) => call.sql.includes('status = :pendingStatus'));
    expect(claimCall.options.replacements.claimedStatus).toBe('APPLYING');
  });

  it('returns a review token from detail reads and requires it before workout approval', async () => {
    const order = [];
    const db = fakeApprovalDb({ order });
    const { approveCoachActionProposal, getCoachActionProposal, submitAiWorkoutLogAsDailyForm } = await loadApprovalService({ order });

    const detailResult = await getCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' } },
      sequelizeOverride: db,
    });

    expect(detailResult.status).toBe(200);
    expect(detailResult.body.proposal.reviewToken).toMatch(/^review-v1\./);

    const blocked = await approveCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' }, body: {} },
      sequelizeOverride: db,
    });

    expect(blocked.status).toBe(428);
    expect(blocked.body.code).toBe('PROPOSAL_DETAIL_REVIEW_REQUIRED');
    expect(submitAiWorkoutLogAsDailyForm).not.toHaveBeenCalled();
    expect(order).toEqual([]);

    const approved = await approveCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' }, body: { reviewToken: detailResult.body.proposal.reviewToken } },
      sequelizeOverride: db,
    });

    expect(approved.status).toBe(200);
    expect(submitAiWorkoutLogAsDailyForm).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['claim', 'workout-write']);
  });

  it('shows and applies planned-assignment metadata for approved workout proposals', async () => {
    const plannedAssignment = {
      assignmentKey: 'plan-6m:w4:d2:homework',
      planId: 'plan-6m',
      assignmentType: 'homework',
      source: 'workout_plan',
      isBillable: false,
      shouldDeductSession: false,
      weekNumber: 4,
      dayNumber: 2,
    };
    const db = fakeApprovalDb();
    const {
      approveCoachActionProposal,
      getCoachActionProposal,
      submitAiWorkoutLogAsDailyForm,
    } = await loadApprovalService({
      decryptedProposal: {
        payload: {
          clientId: 42,
          date: '2026-05-05',
          exercises: [{ name: 'Goblet Squat' }],
          plannedAssignment,
        },
        targetUserId: 42,
      },
    });

    const detailResult = await getCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' } },
      sequelizeOverride: db,
    });

    expect(detailResult.body.proposal.detail.workout.plannedAssignment).toEqual(plannedAssignment);

    const result = await approveCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' }, body: { reviewToken: detailResult.body.proposal.reviewToken } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(200);
    expect(submitAiWorkoutLogAsDailyForm).toHaveBeenCalledWith(expect.objectContaining({
      clientId: 42,
      plannedAssignment,
    }));
  });

  it('passes historical workout-log source into the canonical daily-form writer', async () => {
    const db = fakeApprovalDb();
    const {
      approveCoachActionProposal,
      getCoachActionProposal,
      submitAiWorkoutLogAsDailyForm,
    } = await loadApprovalService({
      decryptedProposal: {
        payload: {
          clientId: 42,
          date: '2026-05-05',
          source: 'historical_import',
          exercises: [{ name: 'Step-up' }],
        },
        targetUserId: 42,
      },
    });

    const detailResult = await getCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' } },
      sequelizeOverride: db,
    });

    const result = await approveCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' }, body: { reviewToken: detailResult.body.proposal.reviewToken } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(200);
    expect(submitAiWorkoutLogAsDailyForm).toHaveBeenCalledWith(expect.objectContaining({
      clientId: 42,
      source: 'historical_import',
      exercises: [{ name: 'Step-up' }],
    }));
  });

  it('rejects malformed workout proposal client ids before access or write', async () => {
    const order = [];
    const db = fakeApprovalDb({ order });
    const {
      approveCoachActionProposal,
      ensureClientAccess,
      getCoachActionProposal,
      submitAiWorkoutLogAsDailyForm,
    } = await loadApprovalService({
      order,
      decryptedProposal: {
        payload: { clientId: true, date: '2026-05-05', exercises: [{ name: 'Squat' }] },
        targetUserId: null,
      },
    });
    const detailResult = await getCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' } },
      sequelizeOverride: db,
    });

    const result = await approveCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' }, body: { reviewToken: detailResult.body.proposal.reviewToken } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('PROPOSAL_INVALID_CLIENT_ID');
    expect(ensureClientAccess).not.toHaveBeenCalled();
    expect(submitAiWorkoutLogAsDailyForm).not.toHaveBeenCalled();
    expect(order).toEqual([]);
  });

  it('rejects whitespace-padded workout proposal client ids before access or write', async () => {
    const order = [];
    const db = fakeApprovalDb({ order });
    const {
      approveCoachActionProposal,
      ensureClientAccess,
      getCoachActionProposal,
      submitAiWorkoutLogAsDailyForm,
    } = await loadApprovalService({
      order,
      decryptedProposal: {
        payload: { clientId: ' 42', date: '2026-05-05', exercises: [{ name: 'Squat' }] },
        targetUserId: null,
      },
    });
    const detailResult = await getCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' } },
      sequelizeOverride: db,
    });

    const result = await approveCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' }, body: { reviewToken: detailResult.body.proposal.reviewToken } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('PROPOSAL_INVALID_CLIENT_ID');
    expect(ensureClientAccess).not.toHaveBeenCalled();
    expect(submitAiWorkoutLogAsDailyForm).not.toHaveBeenCalled();
    expect(order).toEqual([]);
  });

  it('scopes prepared proposal detail reads to the authenticated user', async () => {
    const calls = [];
    const db = {
      calls,
      async query(sql, options = {}) {
        calls.push({ sql, options });
        return [];
      },
    };
    const { getCoachActionProposal } = await loadApprovalService();

    const result = await getCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 99, role: 'trainer' } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(404);
    expect(result.body.code).toBe('PROPOSAL_NOT_FOUND');
    expect(calls[0].sql).toMatch(/created_by_user_id = :userId/);
    expect(calls[0].options.replacements).toEqual({ id: pendingWorkoutRow.id, userId: 99 });
  });

  it('rejects future-dated proposal review tokens', () => {
    const now = Date.now();
    const token = createProposalReviewToken({
      row: pendingWorkoutRow,
      userId: 7,
      now: now + 60_000,
    });

    const result = verifyProposalReviewToken({
      token,
      row: pendingWorkoutRow,
      userId: 7,
      now,
    });

    expect(result).toEqual({ ok: false, code: 'PROPOSAL_DETAIL_REVIEW_REQUIRED' });
  });

  it('does not write the workout when another approval already claimed the proposal', async () => {
    const order = [];
    const db = fakeApprovalDb({ claimSucceeds: false, order });
    const { approveCoachActionProposal, getCoachActionProposal, submitAiWorkoutLogAsDailyForm } = await loadApprovalService({ order });
    const detailResult = await getCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' } },
      sequelizeOverride: db,
    });

    const result = await approveCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' }, body: { reviewToken: detailResult.body.proposal.reviewToken } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(409);
    expect(result.body.code).toBe('PROPOSAL_NOT_PENDING');
    expect(submitAiWorkoutLogAsDailyForm).toHaveBeenCalledTimes(1);
    expect(order).not.toContain('workout-write');
    expect(order).toEqual(['claim']);
  });

  it('does not reject when another approval already claimed the proposal after the stale read', async () => {
    const order = [];
    const db = fakeRejectRaceDb({ order });
    const { rejectCoachActionProposal } = await loadApprovalService();

    const result = await rejectCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(409);
    expect(result.body.code).toBe('PROPOSAL_NOT_PENDING');
    expect(order).toEqual(['reject-attempt']);
    const rejectCall = db.calls.find((call) => call.options.replacements?.status === 'REJECTED');
    expect(rejectCall.sql).toMatch(/created_by_user_id = :userId/);
    expect(rejectCall.sql).toMatch(/status = :fromStatus/);
  });

  it('does not mark empty client data updates failed when another action already claimed the proposal', async () => {
    const order = [];
    const db = fakeApprovalDb({
      claimSucceeds: false,
      order,
      row: {
        ...pendingWorkoutRow,
        proposal_type: 'client_data_update',
        summary_json: { title: 'Review client data update' },
      },
    });
    const { approveCoachActionProposal, getCoachActionProposal } = await loadApprovalService({
      decryptedProposal: {
        payload: { targetUserId: 42, updates: [] },
        targetUserId: 42,
      },
    });
    const detailResult = await getCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' } },
      sequelizeOverride: db,
    });

    const result = await approveCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' }, body: { reviewToken: detailResult.body.proposal.reviewToken } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(409);
    expect(result.body.code).toBe('PROPOSAL_NOT_PENDING');
    expect(order).toEqual(['claim']);
    expect(db.calls.some((call) => call.options.replacements?.status === 'FAILED')).toBe(false);
  });

  it('rejects whitespace-padded client data update ids before access or writes', async () => {
    const order = [];
    const db = fakeApprovalDb({
      order,
      row: {
        ...pendingWorkoutRow,
        proposal_type: 'client_data_update',
        summary_json: { title: 'Review client data update' },
      },
    });
    const {
      approveCoachActionProposal,
      ensureClientAccess,
      getCoachActionProposal,
      processAIDataUpdates,
    } = await loadApprovalService({
      order,
      decryptedProposal: {
        payload: {
          targetUserId: ' 42',
          updates: [{ field: 'trainingNotes', value: 'Keep current plan.' }],
        },
        targetUserId: null,
      },
    });
    const detailResult = await getCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' } },
      sequelizeOverride: db,
    });

    const result = await approveCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' }, body: { reviewToken: detailResult.body.proposal.reviewToken } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('PROPOSAL_INVALID_CLIENT_ID');
    expect(ensureClientAccess).not.toHaveBeenCalled();
    expect(processAIDataUpdates).not.toHaveBeenCalled();
    expect(order).toEqual([]);
  });

  it('returns sanitized approval evidence metadata on proposal detail reads', async () => {
    const db = fakeApprovalDb();
    const { getCoachActionProposal } = await loadApprovalService({
      decryptedProposal: {
        payload: {
          clientId: 42,
          date: '2026-05-05',
          exercises: [{ name: 'Squat' }],
          proposalMeta: {
            evidenceRefs: ['seg_04', 'client sean phone 555-0101'],
            safetyFlags: ['duplicate_check_required', 'free text with spaces'],
          },
        },
        targetUserId: 42,
      },
    });

    const result = await getCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(200);
    expect(result.body.proposal.detail.approvalGate).toEqual({
      confirmationMode: 'trainer_approval_required',
      evidenceRefs: ['seg_04'],
      redactedEvidenceRefCount: 1,
      safetyFlags: ['duplicate_check_required'],
      redactedSafetyFlagCount: 1,
      writer: 'deterministic',
    });
    expect(JSON.stringify(result.body.proposal.detail.approvalGate)).not.toContain('555-0101');
  });

  // ── NUTRITION_LOG deterministic write path (hostile-review TEST-1/3/6/8) ──
  it('claims then writes the nutrition log via createMacroEntries and FORCES verified:false', async () => {
    const order = [];
    const db = fakeApprovalDb({ order, row: pendingNutritionRow });
    const { approveCoachActionProposal, getCoachActionProposal, createMacroEntries } = await loadApprovalService({ order, decryptedProposal: nutritionPayload });
    const detail = await getCoachActionProposal({ id: pendingNutritionRow.id, req: { user: { id: 7, role: 'trainer' } }, sequelizeOverride: db });

    const result = await approveCoachActionProposal({
      id: pendingNutritionRow.id,
      req: { user: { id: 7, role: 'trainer' }, body: { reviewToken: detail.body.proposal.reviewToken } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(200);
    expect(result.body.applied).toBe(true);
    expect(createMacroEntries).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['claim', 'nutrition-write']);
    const [mealsArg, optsArg] = createMacroEntries.mock.calls[0];
    // The injected verified:true must be neutralized before the write.
    expect(mealsArg.every((m) => m.verified === false)).toBe(true);
    expect(optsArg).toEqual({ clientId: 42, date: '2026-05-05' });
  });

  it('uses the studio display timezone when approving nutrition proposals without a date', async () => {
    vi.stubEnv('SWAN_DISPLAY_TZ', 'America/Los_Angeles');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T02:30:00.000Z'));

    const order = [];
    const db = fakeApprovalDb({ order, row: pendingNutritionRow });
    const { approveCoachActionProposal, getCoachActionProposal, createMacroEntries } = await loadApprovalService({
      order,
      decryptedProposal: {
        payload: { clientId: 42, meals: [{ mealType: 'snack', description: 'protein shake', calories: 220 }] },
        targetUserId: 42,
      },
    });
    const detail = await getCoachActionProposal({ id: pendingNutritionRow.id, req: { user: { id: 7, role: 'trainer' } }, sequelizeOverride: db });

    const result = await approveCoachActionProposal({
      id: pendingNutritionRow.id,
      req: { user: { id: 7, role: 'trainer' }, body: { reviewToken: detail.body.proposal.reviewToken } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(200);
    expect(createMacroEntries).toHaveBeenCalledWith(expect.any(Array), {
      clientId: 42,
      date: '2026-06-21',
    });
  });

  it('returns NUTRITION_LOG_EMPTY without writing when the draft has no meals', async () => {
    const order = [];
    const db = fakeApprovalDb({ order, row: pendingNutritionRow });
    const { approveCoachActionProposal, getCoachActionProposal, createMacroEntries } = await loadApprovalService({ order, decryptedProposal: { payload: { clientId: 42, meals: [] }, targetUserId: 42 } });
    const detail = await getCoachActionProposal({ id: pendingNutritionRow.id, req: { user: { id: 7, role: 'trainer' } }, sequelizeOverride: db });

    const result = await approveCoachActionProposal({
      id: pendingNutritionRow.id,
      req: { user: { id: 7, role: 'trainer' }, body: { reviewToken: detail.body.proposal.reviewToken } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('NUTRITION_LOG_EMPTY');
    expect(createMacroEntries).not.toHaveBeenCalled();
  });

  it('fails closed with 403 when ensureClientAccess denies — no claim, no write', async () => {
    const order = [];
    const db = fakeApprovalDb({ order, row: pendingNutritionRow });
    const { approveCoachActionProposal, getCoachActionProposal, createMacroEntries, ensureClientAccess } = await loadApprovalService({ order, decryptedProposal: nutritionPayload, accessAllowed: false });
    const detail = await getCoachActionProposal({ id: pendingNutritionRow.id, req: { user: { id: 7, role: 'trainer' } }, sequelizeOverride: db });

    const result = await approveCoachActionProposal({
      id: pendingNutritionRow.id,
      req: { user: { id: 7, role: 'trainer' }, body: { reviewToken: detail.body.proposal.reviewToken } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(403);
    expect(result.body.code).toBe('CLIENT_ACCESS_DENIED');
    expect(ensureClientAccess).toHaveBeenCalled();
    expect(createMacroEntries).not.toHaveBeenCalled();
    expect(order).toEqual([]);
  });

  it('requires the encrypted detail-review token before a nutrition log can be approved', async () => {
    const order = [];
    const db = fakeApprovalDb({ order, row: pendingNutritionRow });
    const { approveCoachActionProposal, createMacroEntries } = await loadApprovalService({ order, decryptedProposal: nutritionPayload });

    const blocked = await approveCoachActionProposal({
      id: pendingNutritionRow.id,
      req: { user: { id: 7, role: 'trainer' }, body: {} },
      sequelizeOverride: db,
    });

    expect(blocked.status).toBe(428);
    expect(blocked.body.code).toBe('PROPOSAL_DETAIL_REVIEW_REQUIRED');
    expect(createMacroEntries).not.toHaveBeenCalled();
  });

});
