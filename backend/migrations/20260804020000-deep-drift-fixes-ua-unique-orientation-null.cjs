'use strict';

/**
 * Deep drift audit round 2 (SWA-115, 2026-08-04) — two live-DB fixes, both proven
 * against production via read-only probes before this migration was written:
 *
 * 1. "UserAchievements" has NO unique on (userId, achievementId) — only the PK.
 *    The model declares that unique twice (attribute group + options.indexes) and the
 *    award path uses findOrCreate on exactly that pair, which is not race-safe without
 *    a DB constraint: concurrent awards can double-insert (double XP). Table verified
 *    EMPTY (0 rows) in prod, so the index adds without dedup work.
 *
 * 2. orientations.userId is NOT NULL in prod, but the PUBLIC orientation endpoint
 *    deliberately inserts userId: null for prospect submissions
 *    (orientationController "Create a new orientation record without a userId",
 *    model comment "Allow null for prospect submissions"). Every public website
 *    orientation submission currently 500s on the NOT NULL violation — this is the
 *    lead-generation funnel failing silently. The MODEL is the intent; the DB drifted.
 *
 * Both operations are idempotent and additive/loosening — no data is touched.
 */
module.exports = {
  async up(queryInterface) {
    // 1. Race-safety unique for the achievement award path.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UserAchievements_userId_achievementId_unique"
      ON "UserAchievements" ("userId", "achievementId")
    `);

    // 2. Let prospect orientations exist, per the model's documented intent.
    const [col] = await queryInterface.sequelize.query(`
      SELECT is_nullable FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'orientations' AND column_name = 'userId'
    `);
    if (col?.[0]?.is_nullable === 'NO') {
      await queryInterface.sequelize.query(
        `ALTER TABLE orientations ALTER COLUMN "userId" DROP NOT NULL`
      );
      console.log('[deep-drift] orientations.userId NOT NULL dropped (prospect submissions unblocked)');
    } else {
      console.log('[deep-drift] orientations.userId already nullable — skip');
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS "UserAchievements_userId_achievementId_unique"`
    );
    // Refuse to re-add NOT NULL on rollback: prospect rows with null userId may exist
    // by then, and re-tightening would both fail on them and re-break the public form.
    console.log('[deep-drift] rollback: NOT NULL on orientations.userId intentionally NOT restored');
  },
};
