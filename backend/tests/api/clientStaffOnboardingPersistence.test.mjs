import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeRes = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

const formData = () => ({
  fullName: 'Ava Stone',
  email: 'ava.stone@example.test',
  primaryGoal: 'Build strength',
  commitmentLevel: '8',
  currentWeight: '180',
  heightFeet: '5',
  heightInches: '10',
  gender: 'female',
});

async function loadController({ existingUser = null, existingQuestionnaire = null } = {}) {
  vi.resetModules();

  const createdUser = {
    id: 42,
    email: 'ava.stone@example.test',
    update: vi.fn().mockResolvedValue(undefined),
  };

  const mockUser = {
    findOne: vi.fn().mockResolvedValue(existingUser),
    create: vi.fn().mockResolvedValue(createdUser),
  };

  const mockQuestionnaire = {
    findOne: vi.fn().mockResolvedValue(existingQuestionnaire),
    create: vi.fn().mockResolvedValue({ id: 91 }),
  };

  const mockSequelize = {
    query: vi.fn().mockResolvedValue([]),
  };

  const resetHandoff = {
    credentialAction: 'reset_link_sent',
    resetEmailSent: true,
  };
  const buildOnboardingResetLinkHandoff = vi.fn(async () => resetHandoff);

  vi.doMock('../../models/User.mjs', () => ({ default: mockUser }));
  vi.doMock('../../models/ClientOnboardingQuestionnaire.mjs', () => ({ default: mockQuestionnaire }));
  vi.doMock('../../database.mjs', () => ({ default: mockSequelize }));
  vi.doMock('../../services/automationService.mjs', () => ({ triggerSequence: vi.fn().mockResolvedValue(undefined) }));
  vi.doMock('../../services/gamification/goalChallengeService.mjs', () => ({
    generateChallengesFromGoals: vi.fn().mockResolvedValue(undefined),
  }));
  vi.doMock('../../services/onboardingResetHandoffService.mjs', () => ({
    buildOnboardingResetLinkHandoff,
  }));

  const mod = await import('../../controllers/onboardingController.mjs');
  return {
    createClientOnboarding: mod.createClientOnboarding,
    mockUser,
    createdUser,
    mockQuestionnaire,
    buildOnboardingResetLinkHandoff,
  };
}

describe('staff client onboarding persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks an existing staff-onboarded client complete and updates the questionnaire row', async () => {
    const existingUser = {
      id: 55,
      email: 'ava.stone@example.test',
      update: vi.fn().mockResolvedValue(undefined),
    };
    const existingQuestionnaire = {
      update: vi.fn().mockResolvedValue(undefined),
    };
    const { createClientOnboarding, mockQuestionnaire, buildOnboardingResetLinkHandoff } = await loadController({
      existingUser,
      existingQuestionnaire,
    });
    const req = { user: { id: 7, role: 'admin' }, body: formData() };
    const res = makeRes();

    await createClientOnboarding(req, res);

    expect(existingUser.update).toHaveBeenCalledWith(expect.objectContaining({
      isOnboardingComplete: true,
      masterPromptJson: expect.any(Object),
      weight: 180,
      height: 70,
      fitnessGoal: 'Build strength',
    }));
    expect(mockQuestionnaire.findOne).toHaveBeenCalledWith({
      where: { userId: 55 },
      order: [['createdAt', 'DESC']],
    });
    expect(existingQuestionnaire.update).toHaveBeenCalledWith(expect.objectContaining({
      userId: 55,
      createdBy: 7,
      questionnaireVersion: '3.0',
      status: 'completed',
      responsesJson: expect.objectContaining({ primaryGoal: 'Build strength' }),
      primaryGoal: 'Build strength',
      commitmentLevel: 8,
      completedAt: expect.any(Date),
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns a reset-link handoff for existing staff-onboarded clients still forced to set a password', async () => {
    const existingUser = {
      id: 56,
      email: 'pending.client@example.test',
      forcePasswordChange: true,
      update: vi.fn().mockResolvedValue(undefined),
    };
    const existingQuestionnaire = {
      update: vi.fn().mockResolvedValue(undefined),
    };
    const { createClientOnboarding, buildOnboardingResetLinkHandoff } = await loadController({
      existingUser,
      existingQuestionnaire,
    });
    const req = { user: { id: 7, role: 'admin' }, body: formData() };
    const res = makeRes();

    await createClientOnboarding(req, res);

    expect(buildOnboardingResetLinkHandoff).toHaveBeenCalledWith(existingUser);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        credentialAction: 'reset_link_sent',
        resetEmailSent: true,
        masterPromptCreated: true,
      }),
    }));
  });

  it('marks a newly staff-created onboarding client complete and stores questionnaire truth', async () => {
    const { createClientOnboarding, mockUser, createdUser, mockQuestionnaire, buildOnboardingResetLinkHandoff } = await loadController();
    const req = { user: { id: 7, role: 'admin' }, body: formData() };
    const res = makeRes();

    await createClientOnboarding(req, res);

    expect(mockUser.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'ava.stone@example.test',
      role: 'client',
      forcePasswordChange: true,
      isOnboardingComplete: true,
      masterPromptJson: expect.any(Object),
      weight: 180,
      height: 70,
    }));
    expect(mockQuestionnaire.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      createdBy: 7,
      questionnaireVersion: '3.0',
      status: 'completed',
      responsesJson: expect.objectContaining({ primaryGoal: 'Build strength' }),
      primaryGoal: 'Build strength',
      commitmentLevel: 8,
      completedAt: expect.any(Date),
    }));
    expect(buildOnboardingResetLinkHandoff).toHaveBeenCalledWith(createdUser);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        credentialAction: 'reset_link_sent',
        resetEmailSent: true,
        masterPromptCreated: true,
      }),
    }));
  });
});