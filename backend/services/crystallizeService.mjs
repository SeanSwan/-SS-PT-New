/**
 * crystallizeService — Dashboards v2 (Slice-3). Records the Crystallize moment (KIMI-DASHBOARDS §4/§6.2).
 *
 * Idempotent by design: UNIQUE(userId, achievementId) + ON CONFLICT → replay returns the SAME
 * crystallizedAt (never a 409-to-error). Owner-scoped: the caller crystallizes their OWN achievement;
 * ownership is verified against UserAchievement before the write (no cross-user writes). PII: numeric
 * userId only. worldKey records which world it was earned under (from the client's read-only observer).
 */
import sequelize from '../database.mjs';
import UserAchievement from '../models/UserAchievement.mjs';

/** True if the user actually holds this achievement (guards against crystallizing an unowned one). */
async function userOwnsAchievement(userId, achievementId) {
  const row = await UserAchievement.findOne({ where: { userId, achievementId } });
  return Boolean(row);
}

export async function crystallizeAchievement({ userId, achievementId, worldKey }) {
  const owns = await userOwnsAchievement(userId, achievementId);
  if (!owns) {
    const err = new Error('Achievement not found for this user.');
    err.statusCode = 404;
    throw err;
  }

  const [rows] = await sequelize.query(
    `INSERT INTO achievement_crystallizations
       (id, "userId", "achievementId", "worldKey", "crystallizedAt", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), :userId, :achievementId, :worldKey, NOW(), NOW(), NOW())
     ON CONFLICT ("userId", "achievementId") DO UPDATE SET "updatedAt" = NOW()
     RETURNING "crystallizedAt"`,
    { replacements: { userId, achievementId, worldKey: worldKey || 'default' } },
  );

  const crystallizedAt = rows?.[0]?.crystallizedAt ?? new Date().toISOString();
  return { crystallizedAt };
}
