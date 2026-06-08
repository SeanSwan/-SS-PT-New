/**
 * coachActionProposalApprovalDisclosure.test.mjs
 * ==============================================
 * Behavioral coverage for fail-closed Coach proposal approval errors.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function proposalRow(type) {
  return {
    id: '11111111-1111-4111-9111-111111111111',
    created_by_user_id: 7,
    proposal_type: type,
    status: 'PENDING',
    summary_json: { title: 'Review Swan Coach proposal' },
    proposal_cipher: 'cipher',
    proposal_iv: 'iv',
    proposal_tag: 'tag',
    cipher_key_id: 'VTEST',
  };
}

function fakeProposalDb(row) {
  return {
    async query(sql, options = {}) {
      if (sql.includes('SELECT id, created_by_user_id')) return [row];
      if (sql.includes('status = :pendingStatus')) {
        return [{ ...row, status: options.replacements.claimedStatus }];
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

async function loadService({
  proposalType,
  decryptedProposal,
  createClientImpl = async () => ({ client: { id: 42 }, invitationStatus: 'queued' }),
  logWorkoutImpl = async () => ({ id: 'workout-1' }),
} = {}) {
  vi.resetModules();

  class AiWorkoutDailyFormError extends Error {
    constructor(message, code) {
      super(message);
      this.name = 'AiWorkoutDailyFormError';
      this.code = code;
    }
  }

  vi.doMock('../../database.mjs', () => ({ default: {} }));
  vi.doMock('../../utils/clientAccess.mjs', () => ({
    ensureClientAccess: vi.fn(async () => ({ allowed: true, clientId: 42 })),
  }));
  vi.doMock('../../services/plaudCipherService.mjs', () => ({
    decryptPayload: vi.fn(() => decryptedProposal),
  }));
  vi.doMock('../../services/workout/aiWorkoutDailyFormService.mjs', () => ({
    submitAiWorkoutLogAsDailyForm: vi.fn(logWorkoutImpl),
    AiWorkoutDailyFormError,
  }));
  vi.doMock('../../services/coachClientOnboardingApprovalService.mjs', () => ({
    createClientFromCoachOnboardingProposal: vi.fn(createClientImpl),
    summarizeOnboardingDraftForReview: vi.fn(),
  }));
  vi.doMock('../../services/aiDataWriteService.mjs', () => ({
    processAIDataUpdates: vi.fn(async () => ({ successful: 1, errors: [] })),
  }));

  const service = await import('../../services/ai/coachActionProposalApprovalService.mjs');
  const row = proposalRow(proposalType);
  const db = fakeProposalDb(row);
  const detailResult = await service.getCoachActionProposal({
    id: row.id,
    req: { user: { id: 7, role: 'trainer' } },
    sequelizeOverride: db,
  });

  return {
    service,
    AiWorkoutDailyFormError,
    row,
    db,
    reviewToken: detailResult.body.proposal.reviewToken,
  };
}

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', 'unit-test-review-token-secret');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('coach action proposal approval disclosure', () => {
  it('does not expose onboarding writer exception text to the client', async () => {
    const { service, row, db, reviewToken } = await loadService({
      proposalType: 'client_onboarding',
      decryptedProposal: { payload: { clientFirstName: 'Alex' } },
      createClientImpl: async () => {
        throw new Error('database host private.internal.local rejected Alex@example.com');
      },
    });

    const result = await service.approveCoachActionProposal({
      id: row.id,
      req: { user: { id: 7, role: 'trainer' }, body: { reviewToken } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('ONBOARDING_APPLY_FAILED');
    expect(result.body.error).toBe('Client onboarding proposal could not be applied.');
    expect(JSON.stringify(result.body)).not.toContain('private.internal.local');
    expect(JSON.stringify(result.body)).not.toContain('Alex@example.com');
  });

  it('does not expose unexpected workout writer exception text to the client', async () => {
    const { service, row, db, reviewToken } = await loadService({
      proposalType: 'workout_log',
      decryptedProposal: {
        payload: { clientId: 42, date: '2026-05-05', exercises: [{ name: 'Squat' }] },
        targetUserId: 42,
      },
      logWorkoutImpl: async () => {
        throw new Error('connection string postgres://private-host/swan leaked');
      },
    });

    const result = await service.approveCoachActionProposal({
      id: row.id,
      req: { user: { id: 7, role: 'trainer' }, body: { reviewToken } },
      sequelizeOverride: db,
    });

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('WORKOUT_APPLY_FAILED');
    expect(result.body.error).toBe('Workout log proposal could not be applied.');
    expect(JSON.stringify(result.body)).not.toContain('postgres://private-host');
  });

  it('maps duplicate workout errors to stable public copy', async () => {
    let AiWorkoutDailyFormErrorClass;
    const loaded = await loadService({
      proposalType: 'workout_log',
      decryptedProposal: {
        payload: { clientId: 42, date: '2026-05-05', exercises: [{ name: 'Squat' }] },
        targetUserId: 42,
      },
      logWorkoutImpl: async () => {
        throw new AiWorkoutDailyFormErrorClass(
          'duplicate row for sean@example.com in workout_sessions',
          'DUPLICATE_DATE',
        );
      },
    });
    AiWorkoutDailyFormErrorClass = loaded.AiWorkoutDailyFormError;

    const result = await loaded.service.approveCoachActionProposal({
      id: loaded.row.id,
      req: { user: { id: 7, role: 'trainer' }, body: { reviewToken: loaded.reviewToken } },
      sequelizeOverride: loaded.db,
    });

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('DUPLICATE_DATE');
    expect(result.body.error).toBe('A workout session already exists for this client on this date.');
    expect(JSON.stringify(result.body)).not.toContain('sean@example.com');
  });
});
