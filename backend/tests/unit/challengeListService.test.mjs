import { describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';
import { getChallengeList } from '../../services/gamification/challengeListService.mjs';

const makeModels = () => {
  const Challenge = {
    findAndCountAll: vi.fn(async () => ({ rows: [], count: 0 })),
  };

  return {
    Challenge,
    User: { name: 'User' },
    ChallengeParticipant: { name: 'ChallengeParticipant' },
  };
};

describe('challenge list service', () => {
  it('filters public discovery to active public challenges inside the current date window', async () => {
    const models = makeModels();
    const now = new Date('2026-07-05T12:00:00.000Z');

    await getChallengeList({ models, query: {}, publicOnly: true, now });

    expect(models.Challenge.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'active',
        isPublic: true,
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now },
      }),
      limit: 20,
      offset: 0,
      order: [['createdAt', 'DESC']],
    }));
  });

  it('does not allow public discovery callers to widen into draft or all statuses', async () => {
    const allModels = makeModels();
    const draftModels = makeModels();

    await getChallengeList({ models: allModels, query: { status: 'all' }, publicOnly: true });
    await getChallengeList({ models: draftModels, query: { status: 'draft' }, publicOnly: true });

    expect(allModels.Challenge.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'active', isPublic: true }),
    }));
    expect(draftModels.Challenge.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'active', isPublic: true }),
    }));
  });

  it('supports a trainer scoped management list across all statuses without public-only filtering', async () => {
    const models = makeModels();

    await getChallengeList({
      models,
      query: { status: 'all', limit: '10', sortBy: 'startDate', sortOrder: 'asc' },
      defaultStatus: 'all',
      viewer: { id: '42', role: 'trainer' },
    });

    expect(models.Challenge.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { createdBy: 42 },
      limit: 10,
      offset: 0,
      order: [['startDate', 'ASC']],
    }));
  });

  it('does not scope admin management lists to createdBy', async () => {
    const models = makeModels();

    await getChallengeList({
      models,
      query: { status: 'draft', difficulty: '2' },
      defaultStatus: 'all',
      viewer: { id: '7', role: 'admin' },
    });

    expect(models.Challenge.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'draft', difficulty: 2 },
    }));
  });
});