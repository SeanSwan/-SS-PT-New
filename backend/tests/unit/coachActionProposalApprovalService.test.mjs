/**
 * coachActionProposalApprovalService.test.mjs
 * ===========================================
 * Source guard for deterministic proposal approval writes.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APPROVAL_SERVICE_SRC = readFileSync(
  resolve(__dirname, '../../services/ai/coachActionProposalApprovalService.mjs'),
  'utf8',
);
const PROPOSAL_SERVICE_SRC = readFileSync(
  resolve(__dirname, '../../services/ai/coachActionProposalService.mjs'),
  'utf8',
);
const COACH_INTAKE_MIGRATION_SRC = readFileSync(
  resolve(__dirname, '../../migrations/20260506120000-create-coach-intake-items.cjs'),
  'utf8',
);

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

function fakeApprovalDb({ claimSucceeds = true, order = [] } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, options = {}) {
      calls.push({ sql, options });
      if (sql.includes('SELECT id, created_by_user_id')) return [pendingWorkoutRow];
      if (sql.includes('status = :pendingStatus')) {
        order.push('claim');
        return claimSucceeds ? [{ ...pendingWorkoutRow, status: options.replacements.claimedStatus }] : [];
      }
      if (sql.includes('UPDATE coach_action_proposals')) {
        return [{
          ...pendingWorkoutRow,
          status: options.replacements.status,
          summary_json: pendingWorkoutRow.summary_json,
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
    decryptPayload: vi.fn(() => ({
      payload: { clientId: 42, date: '2026-05-05', exercises: [{ name: 'Squat' }] },
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

describe('coachActionProposalApprovalService', () => {
  it('routes workout approval through RBAC and the canonical workout writer', () => {
    expect(APPROVAL_SERVICE_SRC).toMatch(/ensureClientAccess/);
    expect(APPROVAL_SERVICE_SRC).toMatch(/logWorkoutForClient/);
  });

  it('does not create workout rows directly inside the proposal executor', () => {
    expect(APPROVAL_SERVICE_SRC).not.toMatch(/WorkoutSession\.create\(/);
    expect(APPROVAL_SERVICE_SRC).not.toMatch(/WorkoutLog\.bulkCreate\(/);
  });

  it('routes client onboarding approval through the deterministic onboarding service', () => {
    expect(APPROVAL_SERVICE_SRC).toMatch(/createClientFromCoachOnboardingProposal/);
    expect(APPROVAL_SERVICE_SRC).toMatch(/COACH_PROPOSAL_TYPE\.CLIENT_ONBOARDING/);
  });

  it('routes client data updates through RBAC and the existing AI data write service', () => {
    expect(APPROVAL_SERVICE_SRC).toMatch(/processAIDataUpdates/);
    expect(APPROVAL_SERVICE_SRC).toMatch(/COACH_PROPOSAL_TYPE\.CLIENT_DATA_UPDATE/);
    expect(APPROVAL_SERVICE_SRC).toMatch(/ensureClientAccess/);
  });

  it('exposes a read-only proposal detail path before approval', () => {
    expect(APPROVAL_SERVICE_SRC).toMatch(/getCoachActionProposal/);
    expect(APPROVAL_SERVICE_SRC).toMatch(/sanitizeProposalDetail/);
  });

  it('rejects empty client data update proposals instead of marking no-op approvals applied', () => {
    expect(APPROVAL_SERVICE_SRC).toMatch(/CLIENT_DATA_UPDATE_EMPTY/);
    expect(APPROVAL_SERVICE_SRC).toMatch(/updates\.length === 0/);
  });

  it('defines APPLYING as the transient deterministic-write status', () => {
    expect(PROPOSAL_SERVICE_SRC).toMatch(/APPLYING:\s*['"]APPLYING['"]/);
    expect(COACH_INTAKE_MIGRATION_SRC).toMatch(/'APPLYING'/);
  });

  it('refreshes the database status constraint for existing proposal tables', () => {
    expect(COACH_INTAKE_MIGRATION_SRC).toMatch(/DROP CONSTRAINT IF EXISTS coach_action_proposals_status_check/);
    expect(COACH_INTAKE_MIGRATION_SRC).toMatch(/ADD CONSTRAINT coach_action_proposals_status_check/);
  });

  it('claims a pending proposal before running the workout writer', async () => {
    const order = [];
    const db = fakeApprovalDb({ order });
    const { approveCoachActionProposal, logWorkoutForClient } = await loadApprovalService({ order });

    const result = await approveCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(200);
    expect(logWorkoutForClient).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['claim', 'workout-write']);
    const claimCall = db.calls.find((call) => call.sql.includes('status = :pendingStatus'));
    expect(claimCall.options.replacements.claimedStatus).toBe('APPLYING');
  });

  it('does not write the workout when another approval already claimed the proposal', async () => {
    const order = [];
    const db = fakeApprovalDb({ claimSucceeds: false, order });
    const { approveCoachActionProposal, logWorkoutForClient } = await loadApprovalService({ order });

    const result = await approveCoachActionProposal({
      id: pendingWorkoutRow.id,
      req: { user: { id: 7, role: 'trainer' } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(409);
    expect(result.body.code).toBe('PROPOSAL_NOT_PENDING');
    expect(logWorkoutForClient).not.toHaveBeenCalled();
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
});
