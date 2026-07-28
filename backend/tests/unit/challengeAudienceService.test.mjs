import { describe, expect, it, vi } from 'vitest';
import {
  ChallengeAudienceValidationError,
  replaceManagedChallengeAudience,
} from '../../services/gamification/challengeAudienceService.mjs';

const transaction = { id: 'tx-1' };

const buildChallenge = (overrides = {}) => ({
  id: 'challenge-1',
  createdBy: 12,
  status: 'draft',
  maxParticipants: 4,
  update: vi.fn(async function update(fields) {
    Object.assign(this, fields);
    return this;
  }),
  ...overrides,
});

const buildModels = ({ challenge = buildChallenge(), userCount = 2, assignmentCount = 2 } = {}) => ({
  Challenge: {
    findByPk: vi.fn(async () => challenge),
  },
  User: {
    count: vi.fn(async () => userCount),
  },
  ClientTrainerAssignment: {
    count: vi.fn(async () => assignmentCount),
  },
  ChallengeParticipant: {
    destroy: vi.fn(async () => 0),
    bulkCreate: vi.fn(async (rows) => rows),
  },
});

describe('challengeAudienceService', () => {
  it('replaces a draft audience for an admin with client accounts', async () => {
    const challenge = buildChallenge({ createdBy: 44 });
    const models = buildModels({ challenge, userCount: 2 });

    const result = await replaceManagedChallengeAudience({
      models,
      challengeId: 'challenge-1',
      viewer: { id: 1, role: 'admin' },
      userIds: ['11', 12, '12'],
      transaction,
    });

    expect(models.User.count).toHaveBeenCalledWith(expect.objectContaining({ transaction }));
    expect(models.ClientTrainerAssignment.count).not.toHaveBeenCalled();
    expect(models.ChallengeParticipant.destroy).toHaveBeenCalledWith({ where: { challengeId: 'challenge-1' }, transaction });
    expect(models.ChallengeParticipant.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ userId: 11, challengeId: 'challenge-1', status: 'joined', currentProgress: 0, progressPercentage: 0 }),
        expect.objectContaining({ userId: 12, challengeId: 'challenge-1', status: 'joined', currentProgress: 0, progressPercentage: 0 }),
      ]),
      { transaction, validate: true },
    );
    expect(challenge.update).toHaveBeenCalledWith({ currentParticipants: 2 }, { transaction });
    expect(result.audienceCount).toBe(2);
  });

  it('allows a trainer to replace an owned draft audience with assigned clients', async () => {
    const models = buildModels({ assignmentCount: 2 });

    await replaceManagedChallengeAudience({
      models,
      challengeId: 'challenge-1',
      viewer: { id: 12, role: 'trainer' },
      userIds: [11, 12],
      transaction,
    });

    expect(models.ClientTrainerAssignment.count).toHaveBeenCalledWith(expect.objectContaining({ transaction }));
    expect(models.User.count).not.toHaveBeenCalled();
    expect(models.ChallengeParticipant.bulkCreate).toHaveBeenCalledTimes(1);
  });

  it('rejects trainer access to another trainer draft', async () => {
    await expect(replaceManagedChallengeAudience({
      models: buildModels({ challenge: buildChallenge({ createdBy: 12 }) }),
      challengeId: 'challenge-1',
      viewer: { id: 99, role: 'trainer' },
      userIds: [11],
      transaction,
    })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects trainer clients outside active assignments', async () => {
    await expect(replaceManagedChallengeAudience({
      models: buildModels({ assignmentCount: 1 }),
      challengeId: 'challenge-1',
      viewer: { id: 12, role: 'trainer' },
      userIds: [11, 12],
      transaction,
    })).rejects.toMatchObject({
      statusCode: 403,
      publicMessage: 'Audience includes clients outside your active assignments',
    });
  });

  it('rejects non-draft audience replacement', async () => {
    await expect(replaceManagedChallengeAudience({
      models: buildModels({ challenge: buildChallenge({ status: 'active' }) }),
      challengeId: 'challenge-1',
      viewer: { id: 1, role: 'admin' },
      userIds: [11],
      transaction,
    })).rejects.toMatchObject({
      statusCode: 400,
      publicMessage: 'Only draft challenges can have audiences replaced',
    });
  });

  it('rejects audiences above the participant cap', async () => {
    await expect(replaceManagedChallengeAudience({
      models: buildModels({ challenge: buildChallenge({ maxParticipants: 1 }) }),
      challengeId: 'challenge-1',
      viewer: { id: 1, role: 'admin' },
      userIds: [11, 12],
      transaction,
    })).rejects.toMatchObject({ publicMessage: "Audience exceeds this challenge's 1 participant cap" });
  });

  it('returns typed validation errors for invalid ids', async () => {
    await expect(replaceManagedChallengeAudience({
      models: buildModels(),
      challengeId: 'challenge-1',
      viewer: { id: 1, role: 'admin' },
      userIds: ['not-a-client'],
      transaction,
    })).rejects.toBeInstanceOf(ChallengeAudienceValidationError);
  });
});
