import { describe, expect, it, vi } from 'vitest';
import {
  createClientChallengeSubmission,
  getClientChallengeSubmissionPolicy,
  getManagedChallengeSubmissionQueue,
} from '../../services/gamification/challengeSubmissionService.mjs';

const iso = '2026-06-30T12:00:00.000Z';

const makeSubmission = (overrides = {}) => ({
  id: 'submission-1',
  title: 'Seven Day Flexibility Reset',
  description: 'Client wants a coach-reviewed flexibility challenge for the next training block.',
  status: 'pending',
  moderationStatus: 'pending',
  requestedVisibility: 'trainer_visible',
  challengeType: 'weekly',
  archetype: 'consistency',
  proposalPayload: {},
  submittedAt: new Date(iso),
  submittedBy: {
    id: 42,
    firstName: 'Jane',
    lastName: 'Client',
  },
  ...overrides,
});

describe('challenge submission service', () => {
  it('returns an honest empty moderated queue while client creation is gated and storage is absent', async () => {
    const queue = await getManagedChallengeSubmissionQueue();

    expect(queue).toMatchObject({
      submissions: [],
      queueStatus: 'empty_by_policy',
      message: 'Client-created challenge submissions are closed until entitlement and moderation storage are connected.',
      policy: {
        creatorRoles: ['admin', 'trainer'],
        clientCreation: 'disabled_by_default',
        requiresModerationForClientPublish: true,
        publishModel: 'admin_full_control_trainer_scoped_client_entitled_later',
      },
    });
  });

  it('returns fresh queue and policy objects for each caller', async () => {
    const first = await getManagedChallengeSubmissionQueue();
    const second = await getManagedChallengeSubmissionQueue();

    expect(first).not.toBe(second);
    expect(first.submissions).not.toBe(second.submissions);
    expect(first.policy).not.toBe(second.policy);
  });

  it('maps real pending challenge submissions from injected storage without opening client publishing', async () => {
    const findAll = vi.fn().mockResolvedValue([
      makeSubmission(),
      makeSubmission({
        id: 'submission-2',
        title: 'Team Strength Week',
        status: 'under_review',
        submittedBy: { id: 84, displayName: 'Client #84' },
      }),
    ]);

    const queue = await getManagedChallengeSubmissionQueue({
      models: { ChallengeSubmission: { findAll } },
      limit: 10,
    });

    expect(findAll).toHaveBeenCalledWith(expect.objectContaining({
      limit: 10,
      order: [['submittedAt', 'ASC']],
    }));
    expect(queue.queueStatus).toBe('pending_review');
    expect(queue.message).toBe('2 client-created challenge submissions need moderation review.');
    expect(queue.policy.clientCreation).toBe('disabled_by_default');
    expect(queue.submissions).toEqual([
      {
        id: 'submission-1',
        title: 'Seven Day Flexibility Reset',
        description: 'Client wants a coach-reviewed flexibility challenge for the next training block.',
        challengeType: 'weekly',
        archetype: 'consistency',
        status: 'pending',
        moderationStatus: 'pending',
        requestedVisibility: 'trainer_visible',
        submittedAt: iso,
        submittedBy: 'Jane Client',
      },
      {
        id: 'submission-2',
        title: 'Team Strength Week',
        description: 'Client wants a coach-reviewed flexibility challenge for the next training block.',
        challengeType: 'weekly',
        archetype: 'consistency',
        status: 'under_review',
        moderationStatus: 'pending',
        requestedVisibility: 'trainer_visible',
        submittedAt: iso,
        submittedBy: 'Client #84',
      },
    ]);
  });

  it('fails closed when submission storage errors instead of crashing the dashboard queue', async () => {
    const queue = await getManagedChallengeSubmissionQueue({
      models: { ChallengeSubmission: { findAll: vi.fn().mockRejectedValue(new Error('relation missing')) } },
    });

    expect(queue).toMatchObject({
      submissions: [],
      queueStatus: 'storage_unavailable',
      message: 'Challenge submission storage is unavailable; client-created challenge submissions remain closed.',
      policy: {
        clientCreation: 'disabled_by_default',
        requiresModerationForClientPublish: true,
      },
    });
  });

  it('returns client submission policy as a fail-closed entitlement gate', async () => {
    const policy = await getClientChallengeSubmissionPolicy({ viewer: { id: 42, role: 'client' } });

    expect(policy).toMatchObject({
      canSubmit: false,
      queueStatus: 'closed_until_entitlement',
      message: 'Challenge idea submissions are closed until an admin grants client challenge creation entitlement.',
      policy: {
        clientCreation: 'disabled_by_default',
        requiresModerationForClientPublish: true,
      },
    });
    expect(policy.requiredEntitlement).toBe('client_challenge_creation');
    expect(policy.nextSteps).toEqual([
      'Keep logging workouts so your trainer can nominate challenge ideas from real progress.',
      'Ask your trainer or admin to enable client challenge submissions when the pilot opens.',
    ]);
  });

  it('rejects client-created challenge submissions while entitlement storage is not connected', async () => {
    const create = vi.fn(async () => ({ id: 'submission-created' }));

    await expect(createClientChallengeSubmission({
      models: { ChallengeSubmission: { create } },
      viewer: { id: 42, role: 'client' },
      body: {
        title: 'My Strength Week',
        description: 'I want a trainer-visible challenge based on my next three logged workouts.',
        requestedVisibility: 'trainer_visible',
      },
    })).rejects.toMatchObject({
      statusCode: 403,
      publicMessage: 'Challenge idea submissions are closed until an admin grants client challenge creation entitlement.',
    });

    expect(create).not.toHaveBeenCalled();
  });
});
