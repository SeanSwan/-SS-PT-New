import { describe, expect, it, vi } from 'vitest';
import {
  createClientChallengeSubmission,
  getClientChallengeSubmissionPolicy,
} from '../../services/gamification/challengeSubmissionService.mjs';

describe('challenge submission client entitlement gate', () => {
  it('opens client submission policy only when the client challenge feature flag is enabled', async () => {
    const featureFindOne = vi.fn(async () => ({ id: 77, enabled: true }));

    const policy = await getClientChallengeSubmissionPolicy({
      models: { UserFeatureFlag: { findOne: featureFindOne } },
      viewer: { id: 42, role: 'client' },
    });

    expect(featureFindOne).toHaveBeenCalledWith({
      where: { userId: 42, featureKey: 'client_challenge_creation', enabled: true },
    });
    expect(policy).toMatchObject({
      canSubmit: true,
      queueStatus: 'entitlement_open',
      requiredEntitlement: 'client_challenge_creation',
      message: 'Challenge idea submissions are open for trainer review.',
      policy: {
        clientCreation: 'entitlement_enabled',
        requiresModerationForClientPublish: true,
      },
    });
  });

  it('keeps policy closed when feature flag storage is unavailable', async () => {
    const featureFindOne = vi.fn(async () => { throw new Error('relation missing'); });

    const policy = await getClientChallengeSubmissionPolicy({
      models: { UserFeatureFlag: { findOne: featureFindOne } },
      viewer: { id: 42, role: 'client' },
    });

    expect(policy).toMatchObject({
      canSubmit: false,
      queueStatus: 'closed_until_entitlement',
      message: 'Challenge idea submissions are closed until an admin grants client challenge creation entitlement.',
    });
  });
  it('creates a pending trainer-visible client submission when entitlement is enabled', async () => {
    const now = new Date('2026-06-30T18:00:00.000Z');
    const create = vi.fn(async (payload) => ({
      id: 'submission-created',
      submittedAt: payload.submittedAt,
      ...payload,
    }));
    const featureFindOne = vi.fn(async () => ({ id: 77, enabled: true }));

    const result = await createClientChallengeSubmission({
      models: {
        ChallengeSubmission: { create },
        UserFeatureFlag: { findOne: featureFindOne },
      },
      viewer: { id: 42, role: 'client', firstName: 'Jane', lastName: 'Client' },
      body: {
        title: '  My Strength Week  ',
        description: '  I want a trainer-visible challenge based on my next three logged workouts.  ',
        requestedVisibility: 'trainer_visible',
      },
      now,
    });

    expect(featureFindOne).toHaveBeenCalledWith({
      where: { userId: 42, featureKey: 'client_challenge_creation', enabled: true },
    });
    expect(create).toHaveBeenCalledWith({
      submittedByUserId: 42,
      title: 'My Strength Week',
      description: 'I want a trainer-visible challenge based on my next three logged workouts.',
      requestedVisibility: 'trainer_visible',
      challengeType: 'weekly',
      archetype: 'consistency',
      status: 'pending',
      moderationStatus: 'pending',
      proposalPayload: {},
      submittedAt: now,
    }, { transaction: undefined });
    expect(result.submission).toMatchObject({
      id: 'submission-created',
      title: 'My Strength Week',
      status: 'pending',
      moderationStatus: 'pending',
      requestedVisibility: 'trainer_visible',
      submittedAt: '2026-06-30T18:00:00.000Z',
      submittedBy: 'Jane Client',
    });
    expect(result.message).toBe('Challenge idea submitted for trainer review.');
  });
  it('rejects community visibility before creating an entitled client submission', async () => {
    const create = vi.fn(async () => ({ id: 'unsafe-submission' }));
    const featureFindOne = vi.fn(async () => ({ id: 77, enabled: true }));

    await expect(createClientChallengeSubmission({
      models: {
        ChallengeSubmission: { create },
        UserFeatureFlag: { findOne: featureFindOne },
      },
      viewer: { id: 42, role: 'client' },
      body: {
        title: 'Unsafe Public Push',
        description: 'This should not become public or community visible from client intake.',
        requestedVisibility: 'community',
      },
    })).rejects.toMatchObject({
      statusCode: 400,
      publicMessage: 'Client challenge submissions can only be private or trainer-visible.',
    });
    expect(create).not.toHaveBeenCalled();
  });
});