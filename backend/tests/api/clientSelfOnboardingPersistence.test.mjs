import { beforeEach, describe, expect, it, vi } from 'vitest';

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

async function loadController({ questionnaire = null } = {}) {
  vi.resetModules();

  const user = {
    id: 42,
    firstName: 'Test',
    lastName: 'Client',
    email: 'client@example.com',
    phone: null,
    dateOfBirth: null,
    gender: null,
    weight: null,
    height: null,
    update: vi.fn().mockResolvedValue(undefined),
  };

  const mockUser = {
    findByPk: vi.fn().mockResolvedValue(user),
  };

  const mockQuestionnaire = {
    findOne: vi.fn().mockResolvedValue(questionnaire),
    create: vi.fn().mockResolvedValue({ id: 7 }),
  };

  const mockSequelize = {
    query: vi.fn().mockResolvedValue([]),
  };

  vi.doMock('../../models/User.mjs', () => ({ default: mockUser }));
  vi.doMock('../../models/ClientOnboardingQuestionnaire.mjs', () => ({ default: mockQuestionnaire }));
  vi.doMock('../../database.mjs', () => ({ default: mockSequelize }));
  vi.doMock('../../services/automationService.mjs', () => ({ triggerSequence: vi.fn() }));
  vi.doMock('../../services/gamification/goalChallengeService.mjs', () => ({
    generateChallengesFromGoals: vi.fn().mockResolvedValue(undefined),
  }));

  const mod = await import('../../controllers/onboardingController.mjs');
  return { createClientSelfOnboarding: mod.createClientSelfOnboarding, user, mockUser, mockQuestionnaire };
}

describe('client self-onboarding persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks the user complete and stores the raw questionnaire row for downstream intake consumers', async () => {
    const { createClientSelfOnboarding, user, mockQuestionnaire } = await loadController();
    const req = {
      user: { id: 42, role: 'client' },
      body: {
        fullName: 'Test Client',
        primaryGoal: 'Build strength',
        commitmentLevel: '8',
        currentWeight: '180',
        heightFeet: '5',
        heightInches: '10',
      },
    };
    const res = makeRes();

    await createClientSelfOnboarding(req, res);

    expect(user.update).toHaveBeenCalledWith(expect.objectContaining({
      isOnboardingComplete: true,
      masterPromptJson: expect.any(Object),
    }));
    expect(mockQuestionnaire.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      createdBy: 42,
      questionnaireVersion: '3.0',
      status: 'completed',
      responsesJson: expect.objectContaining({ primaryGoal: 'Build strength' }),
      primaryGoal: 'Build strength',
      commitmentLevel: 8,
      completedAt: expect.any(Date),
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('accepts raw user role accounts that the mounted dashboard treats as clients', async () => {
    const { createClientSelfOnboarding, user, mockQuestionnaire } = await loadController();
    const req = {
      user: { id: 42, role: 'user' },
      body: {
        fullName: 'Test Client',
        primaryGoal: 'Build strength',
      },
    };
    const res = makeRes();

    await createClientSelfOnboarding(req, res);

    expect(user.update).toHaveBeenCalledWith(expect.objectContaining({
      isOnboardingComplete: true,
      masterPromptJson: expect.any(Object),
    }));
    expect(mockQuestionnaire.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      createdBy: 42,
      status: 'completed',
      responsesJson: expect.objectContaining({ primaryGoal: 'Build strength' }),
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects admin actors before mutating client self-onboarding state', async () => {
    const { createClientSelfOnboarding, user, mockUser, mockQuestionnaire } = await loadController();
    const req = {
      user: { id: 7, role: 'admin' },
      body: {
        fullName: 'Admin Actor',
        primaryGoal: 'Build strength',
      },
    };
    const res = makeRes();

    await createClientSelfOnboarding(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: 'client_role_required',
    }));
    expect(mockUser.findByPk).not.toHaveBeenCalled();
    expect(user.update).not.toHaveBeenCalled();
    expect(mockQuestionnaire.findOne).not.toHaveBeenCalled();
    expect(mockQuestionnaire.create).not.toHaveBeenCalled();
  });

  it('updates the latest questionnaire row on repeat self-onboarding', async () => {
    const existingQuestionnaire = {
      update: vi.fn().mockResolvedValue(undefined),
    };
    const { createClientSelfOnboarding, mockQuestionnaire } = await loadController({
      questionnaire: existingQuestionnaire,
    });
    const req = {
      user: { id: 42, role: 'client' },
      body: {
        fullName: 'Test Client',
        primaryGoal: 'Improve conditioning',
        commitmentLevel: '6',
      },
    };
    const res = makeRes();

    await createClientSelfOnboarding(req, res);

    expect(existingQuestionnaire.update).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      status: 'completed',
      primaryGoal: 'Improve conditioning',
      commitmentLevel: 6,
      completedAt: expect.any(Date),
    }));
    expect(mockQuestionnaire.create).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
