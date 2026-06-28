/**
 * clientProfileCoverageUpdateService.test.mjs
 * ===========================================
 * Locks P4 existing-client onboarding/profile improvements to deterministic
 * writes. This path must never create duplicate clients or complete onboarding.
 */
import { describe, expect, it, vi } from 'vitest';
import { applyClientProfileCoverageUpdate } from '../../services/clientProfileCoverageUpdateService.mjs';

function fakeDb() {
  return {
    async transaction(work) {
      return work({ id: 'tx' });
    },
  };
}

describe('clientProfileCoverageUpdateService', () => {
  it('updates an existing client profile, questionnaire draft, and coverage ledger without client creation', async () => {
    const user = { update: vi.fn(async () => {}) };
    const coverageCreate = vi.fn(async (item) => ({ id: 11, ...item }));
    const models = {
      User: {
        findByPk: vi.fn(async () => user),
        create: vi.fn(),
      },
      ClientOnboardingQuestionnaire: {
        findOne: vi.fn(async () => null),
        create: vi.fn(async (item) => ({ id: 22, ...item })),
      },
    };
    const CoverageItemModel = {
      findOne: vi.fn(async () => null),
      create: coverageCreate,
    };
    const createNotificationFn = vi.fn(async () => ({ success: true, notification: { id: 9001 } }));

    const result = await applyClientProfileCoverageUpdate({
      clientId: 42,
      actorId: 7,
      proposalId: 'proposal-123',
      db: fakeDb(),
      models,
      CoverageItemModel,
      createNotificationFn,
      payload: {
        profileFields: {
          phone: '555-0100',
          fitnessGoal: 'Build strength',
          role: 'admin',
        },
        questionnaireResponses: {
          fullName: 'Client Forty Two',
          email: 'client42@example.test',
          primaryGoal: 'Build strength',
          nutritionPreferences: 'High protein',
        },
        coverageUpdates: [
          {
            key: 'health_concerns',
            category: 'health_injury_risk',
            status: 'ask_client_later',
            requiredFor: ['safety'],
            chartDataPriority: 8,
            evidenceRefs: ['seg_02', 'unsafe free text with spaces'],
          },
        ],
      },
    });

    expect(models.User.create).not.toHaveBeenCalled();
    expect(user.update).toHaveBeenCalledWith(expect.objectContaining({
      phone: '555-0100',
      fitnessGoal: 'Build strength',
    }), expect.objectContaining({ transaction: { id: 'tx' } }));
    expect(user.update.mock.calls[0][0]).not.toHaveProperty('role');
    expect(user.update.mock.calls[0][0]).not.toHaveProperty('isOnboardingComplete');

    expect(models.ClientOnboardingQuestionnaire.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      createdBy: 7,
      status: 'in_progress',
      completedAt: null,
      responsesJson: expect.objectContaining({ primaryGoal: 'Build strength' }),
    }), expect.objectContaining({ transaction: { id: 'tx' } }));

    expect(coverageCreate).toHaveBeenCalledWith(expect.objectContaining({
      clientId: 42,
      coverageKey: 'health_concerns',
      category: 'health_injury_risk',
      status: 'client_requested',
      requestedFromClient: true,
      lastMarkedBy: 7,
      metadata: expect.objectContaining({
        proposalId: 'proposal-123',
        requiredFor: ['safety'],
        chartDataPriority: 8,
        evidenceRefs: ['seg_02'],
      }),
    }), expect.objectContaining({ transaction: { id: 'tx' } }));

    expect(createNotificationFn).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      senderId: 7,
      type: 'client',
      message: 'Please complete a secure onboarding follow-up for Health, injuries, and risk in your dashboard.',
    }));

    expect(result).toEqual(expect.objectContaining({
      clientId: 42,
      profileUpdated: true,
      questionnaireUpdated: true,
      coverageUpdated: 1,
      onboardingComplete: false,
      followUpNotifications: expect.objectContaining({ requested: 1, created: 1, failed: 0 }),
    }));
  });

  it('rejects questionnaire or coverage-only updates when the client does not exist before writing', async () => {
    const models = {
      User: {
        findByPk: vi.fn(async () => null),
      },
      ClientOnboardingQuestionnaire: {
        findOne: vi.fn(),
        create: vi.fn(),
      },
    };
    const CoverageItemModel = {
      findOne: vi.fn(),
      create: vi.fn(),
    };

    await expect(applyClientProfileCoverageUpdate({
      clientId: 404,
      actorId: 7,
      db: fakeDb(),
      models,
      CoverageItemModel,
      payload: {
        questionnaireResponses: { primaryGoal: 'Strength' },
        coverageUpdates: [{ key: 'health_concerns', status: 'known' }],
      },
    })).rejects.toMatchObject({ code: 'PROFILE_COVERAGE_CLIENT_NOT_FOUND' });

    expect(models.ClientOnboardingQuestionnaire.findOne).not.toHaveBeenCalled();
    expect(models.ClientOnboardingQuestionnaire.create).not.toHaveBeenCalled();
    expect(CoverageItemModel.findOne).not.toHaveBeenCalled();
    expect(CoverageItemModel.create).not.toHaveBeenCalled();
  });
  it('rejects empty profile coverage updates before writing', async () => {
    await expect(applyClientProfileCoverageUpdate({
      clientId: 42,
      actorId: 7,
      db: fakeDb(),
      models: {},
      CoverageItemModel: {},
      payload: {},
    })).rejects.toMatchObject({ code: 'PROFILE_COVERAGE_UPDATE_EMPTY' });
  });
});