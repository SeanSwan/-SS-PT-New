'use strict';

/**
 * Enforce one open shopping cart per user without invalidating payable Stripe
 * sessions. A single pending cart wins over active drafts. Multiple pending
 * carts require explicit Stripe reconciliation, so migration fails closed.
 */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        'LOCK TABLE shopping_carts IN SHARE ROW EXCLUSIVE MODE;',
        { transaction },
      );

      const [unsafePendingRows] = await sequelize.query(`
        SELECT COUNT(*)::integer AS "userCount"
        FROM (
          SELECT "userId"
          FROM shopping_carts
          WHERE status = 'pending_payment'
          GROUP BY "userId"
          HAVING COUNT(*) > 1
        ) duplicate_pending;
      `, { transaction });
      const unsafeUserCount = Number(unsafePendingRows?.[0]?.userCount || 0);
      if (unsafeUserCount > 0) {
        const error = new Error(
          `${unsafeUserCount} user(s) have multiple pending Stripe carts; reconcile and expire superseded sessions before retrying.`,
        );
        error.code = 'MULTIPLE_PENDING_CARTS_REQUIRE_RECONCILIATION';
        throw error;
      }

      await sequelize.query(`
        WITH ranked AS (
          SELECT id,
            ROW_NUMBER() OVER (
              PARTITION BY "userId"
              ORDER BY
                CASE WHEN status = 'pending_payment' THEN 0 ELSE 1 END,
                "updatedAt" DESC,
                id DESC
            ) AS rn
          FROM shopping_carts
          WHERE status IN ('active', 'pending_payment')
        )
        UPDATE shopping_carts
        SET status = 'cancelled',
            "updatedAt" = NOW()
        WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
      `, { transaction });

      await sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS shopping_carts_one_open_per_user
          ON shopping_carts ("userId")
          WHERE status IN ('active', 'pending_payment');
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS shopping_carts_one_open_per_user;',
    );
  },
};
