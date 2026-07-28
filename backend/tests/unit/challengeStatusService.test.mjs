import { describe, expect, it, vi } from 'vitest';
import {
  ChallengeStatusTransitionError,
  publishManagedChallenge,
  transitionManagedChallengeStatus,
} from '../../services/gamification/challengeStatusService.mjs';

const buildModels = (challenge, participantCount = 0) => ({
  Challenge: {
    findByPk: vi.fn(async () => challenge),
  },
  ChallengeParticipant: {
    count: vi.fn(async () => participantCount),
  },
});

const buildChallenge = (overrides = {}) => ({
  id: 'challenge-1',
  createdBy: 12,
  status: 'draft',
  startDate: new Date('2099-07-01T16:00:00.000Z'),
  endDate: new Date('2099-07-08T16:00:00.000Z'),
  update: vi.fn(async function update(fields) {
    Object.assign(this, fields);
    return this;
  }),
  ...overrides,
});

describe('challengeStatusService', () => {
  it('publishes a draft challenge for an admin', async () => {
    const challenge = buildChallenge({ createdBy: 44 });

    const result = await publishManagedChallenge({
      models: buildModels(challenge),
      challengeId: 'challenge-1',
      viewer: { id: 1, role: 'admin' },
    });

    expect(challenge.update).toHaveBeenCalledWith({ status: 'active', isPublic: true });
    expect(result.status).toBe('active');
    expect(result.isPublic).toBe(true);
  });

  it('publishes a trainer-owned draft challenge', async () => {
    const challenge = buildChallenge({ createdBy: 12 });

    await publishManagedChallenge({
      models: buildModels(challenge),
      challengeId: 'challenge-1',
      viewer: { id: 12, role: 'trainer' },
    });

    expect(challenge.update).toHaveBeenCalledWith({ status: 'active', isPublic: true });
  });

  it('publishes a private draft challenge without public discovery visibility', async () => {
    const challenge = buildChallenge({ createdBy: 12 });

    const result = await publishManagedChallenge({
      models: buildModels(challenge, 2),
      challengeId: 'challenge-1',
      viewer: { id: 12, role: 'trainer' },
      visibility: 'private',
    });

    expect(challenge.update).toHaveBeenCalledWith({ status: 'active', isPublic: false });
    expect(result.status).toBe('active');
    expect(result.isPublic).toBe(false);
  });

  it('rejects publishing a draft after its saved challenge window has ended', async () => {
    const challenge = buildChallenge({
      startDate: new Date('2026-07-01T16:00:00.000Z'),
      endDate: new Date('2026-07-08T16:00:00.000Z'),
    });

    await expect(publishManagedChallenge({
      models: buildModels(challenge),
      challengeId: 'challenge-1',
      viewer: { id: 1, role: 'admin' },
      now: new Date('2026-07-09T00:00:00.000Z'),
    })).rejects.toMatchObject({
      statusCode: 400,
      publicMessage: 'Challenge end date must still be in the future',
    });

    expect(challenge.update).not.toHaveBeenCalled();
  });

  it('rejects publishing a draft with missing saved window dates', async () => {
    const challenge = buildChallenge({
      startDate: null,
      endDate: new Date('2026-07-08T16:00:00.000Z'),
    });

    await expect(publishManagedChallenge({
      models: buildModels(challenge),
      challengeId: 'challenge-1',
      viewer: { id: 1, role: 'admin' },
      now: new Date('2026-07-01T00:00:00.000Z'),
    })).rejects.toMatchObject({
      statusCode: 400,
      publicMessage: 'Challenge start date must be a valid date',
    });

    expect(challenge.update).not.toHaveBeenCalled();
  });

  it('rejects unsupported publish visibility before updating the challenge', async () => {
    const challenge = buildChallenge({ createdBy: 12 });

    await expect(publishManagedChallenge({
      models: buildModels(challenge),
      challengeId: 'challenge-1',
      viewer: { id: 12, role: 'trainer' },
      visibility: 'cohort-only',
    })).rejects.toMatchObject({
      statusCode: 400,
      publicMessage: 'Challenge visibility must be public or private',
    });

    expect(challenge.update).not.toHaveBeenCalled();
  });

  it('rejects private publish when no draft audience has been saved', async () => {
    const challenge = buildChallenge({ createdBy: 12 });

    await expect(publishManagedChallenge({
      models: buildModels(challenge, 0),
      challengeId: 'challenge-1',
      viewer: { id: 12, role: 'trainer' },
      visibility: 'private',
    })).rejects.toMatchObject({
      statusCode: 400,
      publicMessage: 'Private challenges require at least one saved audience member',
    });

    expect(challenge.update).not.toHaveBeenCalled();
  });

  it('rejects a trainer publishing another trainer challenge', async () => {
    await expect(publishManagedChallenge({
      models: buildModels(buildChallenge({ createdBy: 12 })),
      challengeId: 'challenge-1',
      viewer: { id: 99, role: 'trainer' },
    })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('checks challenge ownership before validating requested visibility', async () => {
    await expect(publishManagedChallenge({
      models: buildModels(buildChallenge({ createdBy: 12 })),
      challengeId: 'challenge-1',
      viewer: { id: 99, role: 'trainer' },
      visibility: 'cohort-only',
    })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects non-draft challenges', async () => {
    await expect(publishManagedChallenge({
      models: buildModels(buildChallenge({ status: 'active' })),
      challengeId: 'challenge-1',
      viewer: { id: 1, role: 'admin' },
    })).rejects.toMatchObject({
      statusCode: 400,
      publicMessage: 'Only draft challenges can be published',
    });
  });

  it('returns a typed not-found error', async () => {
    await expect(publishManagedChallenge({
      models: buildModels(null),
      challengeId: 'missing',
      viewer: { id: 1, role: 'admin' },
    })).rejects.toBeInstanceOf(ChallengeStatusTransitionError);
  });
  it('completes an active challenge without changing discovery visibility', async () => {
    const challenge = buildChallenge({ status: 'active', isPublic: true });

    const result = await transitionManagedChallengeStatus({
      models: buildModels(challenge),
      challengeId: 'challenge-1',
      viewer: { id: 1, role: 'admin' },
      action: 'complete',
      now: new Date('2099-07-02T16:00:00.000Z'),
    });

    expect(challenge.update).toHaveBeenCalledWith({ status: 'completed' });
    expect(result.status).toBe('completed');
    expect(result.isPublic).toBe(true);
  });

  it('rejects completing a scheduled active challenge before start date', async () => {
    const challenge = buildChallenge({
      status: 'active',
      startDate: new Date('2099-07-01T16:00:00.000Z'),
      endDate: new Date('2099-07-08T16:00:00.000Z'),
    });

    await expect(transitionManagedChallengeStatus({
      models: buildModels(challenge),
      challengeId: 'challenge-1',
      viewer: { id: 1, role: 'admin' },
      action: 'complete',
      now: new Date('2099-06-30T16:00:00.000Z'),
    })).rejects.toMatchObject({
      statusCode: 400,
      publicMessage: 'Scheduled challenges cannot be completed before they start',
    });

    expect(challenge.update).not.toHaveBeenCalled();
  });

  it('cancels a draft challenge and removes public discovery visibility', async () => {
    const challenge = buildChallenge({ status: 'draft', isPublic: true });

    const result = await transitionManagedChallengeStatus({
      models: buildModels(challenge),
      challengeId: 'challenge-1',
      viewer: { id: 12, role: 'trainer' },
      action: 'cancel',
    });

    expect(challenge.update).toHaveBeenCalledWith({ status: 'cancelled', isPublic: false });
    expect(result.status).toBe('cancelled');
    expect(result.isPublic).toBe(false);
  });

  it('archives a completed challenge and removes public discovery visibility', async () => {
    const challenge = buildChallenge({ status: 'completed', isPublic: true });

    const result = await transitionManagedChallengeStatus({
      models: buildModels(challenge),
      challengeId: 'challenge-1',
      viewer: { id: 1, role: 'admin' },
      action: 'archive',
    });

    expect(challenge.update).toHaveBeenCalledWith({ status: 'archived', isPublic: false });
    expect(result.status).toBe('archived');
    expect(result.isPublic).toBe(false);
  });

  it('rejects archiving an active challenge before updating it', async () => {
    const challenge = buildChallenge({ status: 'active' });

    await expect(transitionManagedChallengeStatus({
      models: buildModels(challenge),
      challengeId: 'challenge-1',
      viewer: { id: 1, role: 'admin' },
      action: 'archive',
    })).rejects.toMatchObject({
      statusCode: 400,
      publicMessage: 'Only completed or cancelled challenges can be archived',
    });

    expect(challenge.update).not.toHaveBeenCalled();
  });

  it('checks challenge ownership before validating lifecycle action support', async () => {
    await expect(transitionManagedChallengeStatus({
      models: buildModels(buildChallenge({ status: 'active', createdBy: 12 })),
      challengeId: 'challenge-1',
      viewer: { id: 99, role: 'trainer' },
      action: 'delete',
    })).rejects.toMatchObject({ statusCode: 403 });
  });
});
