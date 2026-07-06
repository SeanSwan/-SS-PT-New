'use strict';

/**
 * Add User.lifetimePointsEarned + User.leaderboardOptIn.
 *
 * Per the 2026-07-04 AI Village verdict (column-backed over ledger-SUM): level and rank
 * must be driven by LIFETIME earned XP, never the spendable balance, so spending points
 * never lowers a user's level/rank. A denormalized column is O(1) per award, race-free,
 * and lets the leaderboard sort by lifetime XP with an indexed scan — the on-the-fly SUM
 * approach was one-award-behind, O(N), and unsortable.
 *
 * - lifetimePointsEarned: backfilled from the ledger = SUM of every non-spend/expire
 *   PointTransaction (earn + bonus + additive adjustment). Additive, NOT NULL, default 0
 *   (the safest possible migration — no risky schema change).
 * - leaderboardOptIn: default true so existing visibility is preserved (opt-OUT mechanism).
 *   The privacy opt-IN default flip + consent UI is a deliberate follow-up decision.
 */

const TABLE_NAME = 'Users';
const LIFETIME_COLUMN = 'lifetimePointsEarned';
const OPTIN_COLUMN = 'leaderboardOptIn';

async function pointTransactionsTableExists(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'PointTransactions' LIMIT 1;
  `);
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable(TABLE_NAME);

    if (!table[LIFETIME_COLUMN]) {
      await queryInterface.addColumn(TABLE_NAME, LIFETIME_COLUMN, {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Lifetime earned points (drives level/rank). Never reduced by spending.',
      });

      // One-time backfill from the ledger so existing users get correct levels immediately
      // (avoids the "violent snap" on their next login).
      if (await pointTransactionsTableExists(queryInterface)) {
        await queryInterface.sequelize.query(`
          UPDATE "Users" u
          SET "${LIFETIME_COLUMN}" = COALESCE((
            SELECT SUM(pt."points")
            FROM "PointTransactions" pt
            WHERE pt."userId" = u."id"
              AND pt."transactionType" NOT IN ('spend', 'expire')
          ), 0);
        `);
      }
    }

    if (!table[OPTIN_COLUMN]) {
      await queryInterface.addColumn(TABLE_NAME, OPTIN_COLUMN, {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the user appears on public leaderboards (existing users preserved as visible).',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable(TABLE_NAME);
    if (table[OPTIN_COLUMN]) {
      await queryInterface.removeColumn(TABLE_NAME, OPTIN_COLUMN);
    }
    if (table[LIFETIME_COLUMN]) {
      await queryInterface.removeColumn(TABLE_NAME, LIFETIME_COLUMN);
    }
  },
};
