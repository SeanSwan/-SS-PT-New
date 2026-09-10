'use strict';

/**
 * SCU S3 — additive trust metadata for durable CoachIntent receipts.
 *
 * These columns are server-owned lifecycle evidence. They are intentionally
 * separate from the bounded public result JSON so a model-shaped payload can
 * never manufacture a commit or verification timestamp.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Preserve the incoming filename for migration history, while both names
    // use one atomic, duplicate-audited, repeatable schema implementation.
    await require('./20260906000000-coach-intent-lifecycle-v2.cjs').up(queryInterface, Sequelize);
  },

  async down(queryInterface) {
    // Executed receipts are durable evidence. Do not remove their trust fields
    // during a rollback; disable new intent entry and keep read/reconcile paths.
    void queryInterface;
  },
};
