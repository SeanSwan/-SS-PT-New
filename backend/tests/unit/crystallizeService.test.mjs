/**
 * Regression coverage for Crystallize ownership and earned-state enforcement.
 *
 * ID-SHAPE NOTE (drift sweep 2026-08-04): this file used to pass a UUID achievementId
 * (`'11111111-…'`) through its mocks. Live `"Achievements".id` is an INTEGER serial with
 * 1,067 rows — the UUID was never a real id, so the fixture was teaching the wrong shape
 * to every future test copied from it, and the controller's id validator (now integer +
 * int4-range) would reject it with a 400 before the service was ever reached. Ids here
 * are integers on purpose; do not "restore" the UUID.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import sequelize from '../../database.mjs';
import UserAchievement from '../../models/UserAchievement.mjs';
import { crystallizeAchievement } from '../../services/crystallizeService.mjs';

const ACHIEVEMENT_ID = 1042; // integer — matches live "Achievements".id

describe('crystallizeAchievement', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects an owned but incomplete achievement before issuing the insert', async () => {
    vi.spyOn(UserAchievement, 'findOne').mockImplementation(async ({ where }) => (
      where.isCompleted === true ? null : {
        userId: 12,
        achievementId: ACHIEVEMENT_ID,
        isCompleted: false,
      }
    ));
    const query = vi.spyOn(sequelize, 'query').mockResolvedValue([[]]);

    await expect(crystallizeAchievement({
      userId: 12,
      achievementId: ACHIEVEMENT_ID,
      worldKey: 'swan-deep-field',
    })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects an achievement the user does not hold at all', async () => {
    vi.spyOn(UserAchievement, 'findOne').mockResolvedValue(null);
    const query = vi.spyOn(sequelize, 'query').mockResolvedValue([[]]);

    await expect(crystallizeAchievement({
      userId: 12,
      achievementId: ACHIEVEMENT_ID,
      worldKey: 'default',
    })).rejects.toMatchObject({ statusCode: 404 });
    expect(query).not.toHaveBeenCalled();
  });

  it('writes an INTEGER achievementId bind on the happy path (the id-shape regression)', async () => {
    // The happy path had NO coverage before this sweep — the only test asserted the insert
    // never happened. A UUID reaching the integer column is exactly the failure this locks out.
    vi.spyOn(UserAchievement, 'findOne').mockResolvedValue({
      userId: 12, achievementId: ACHIEVEMENT_ID, isCompleted: true,
    });
    const crystallizedAt = '2026-08-04T00:00:00.000Z';
    const query = vi.spyOn(sequelize, 'query').mockResolvedValue([[{ crystallizedAt }]]);

    const result = await crystallizeAchievement({
      userId: 12,
      achievementId: ACHIEVEMENT_ID,
      worldKey: 'swan-deep-field',
    });

    expect(result).toEqual({ crystallizedAt });
    expect(query).toHaveBeenCalledTimes(1);
    const [, options] = query.mock.calls[0];
    expect(Number.isInteger(options.replacements.achievementId)).toBe(true);
    expect(options.replacements.userId).toBe(12);
    expect(options.replacements.worldKey).toBe('swan-deep-field');
    // PK is generated in Node (the migration's UUIDV4 default is JS-side, emitting no
    // Postgres default) — so the service must always supply one.
    expect(typeof options.replacements.id).toBe('string');
  });

  it('defaults worldKey when the caller omits it', async () => {
    vi.spyOn(UserAchievement, 'findOne').mockResolvedValue({
      userId: 7, achievementId: ACHIEVEMENT_ID, isCompleted: true,
    });
    const query = vi.spyOn(sequelize, 'query').mockResolvedValue([[{ crystallizedAt: null }]]);

    await crystallizeAchievement({ userId: 7, achievementId: ACHIEVEMENT_ID });

    expect(query.mock.calls[0][1].replacements.worldKey).toBe('default');
  });
});
