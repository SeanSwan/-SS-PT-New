/**
 * Regression coverage for Crystallize ownership and earned-state enforcement.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import sequelize from '../../database.mjs';
import UserAchievement from '../../models/UserAchievement.mjs';
import { crystallizeAchievement } from '../../services/crystallizeService.mjs';

describe('crystallizeAchievement', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects an owned but incomplete achievement before issuing the insert', async () => {
    vi.spyOn(UserAchievement, 'findOne').mockImplementation(async ({ where }) => (
      where.isCompleted === true ? null : {
        userId: 12,
        achievementId: '11111111-1111-4111-8111-111111111111',
        isCompleted: false,
      }
    ));
    const query = vi.spyOn(sequelize, 'query').mockResolvedValue([[]]);

    await expect(crystallizeAchievement({
      userId: 12,
      achievementId: '11111111-1111-4111-8111-111111111111',
      worldKey: 'swan-deep-field',
    })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(query).not.toHaveBeenCalled();
  });
});
