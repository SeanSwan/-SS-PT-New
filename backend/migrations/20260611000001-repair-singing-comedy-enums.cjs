'use strict';

/**
 * Repair migration: re-apply 'singing' + 'comedy' enum values.
 *
 * Migration 20260309000001-add-singing-comedy-types.cjs ran in production
 * (present in SequelizeMeta) but its per-value try/catch SWALLOWED the failed
 * ALTER TYPE statements, leaving enum_SocialPosts_type and
 * enum_challenges_category without 'singing'/'comedy' while the models and
 * the frontend composer offered both — every such post/challenge 500'd.
 * Verified and hot-fixed directly against production 2026-06-11 (read-only
 * pg_enum probe before/after); this migration makes the repair part of the
 * ledger so every other environment converges.
 *
 * Deliberately NO try/catch: if ALTER TYPE fails, the migration must fail
 * loudly instead of recording success (the exact failure mode that caused
 * this drift). ADD VALUE IF NOT EXISTS keeps it idempotent, so re-running
 * against the already-repaired production DB is a no-op.
 */
module.exports = {
  async up(queryInterface) {
    for (const [type, val] of [
      ['enum_SocialPosts_type', 'singing'],
      ['enum_SocialPosts_type', 'comedy'],
      ['enum_challenges_category', 'singing'],
      ['enum_challenges_category', 'comedy'],
    ]) {
      await queryInterface.sequelize.query(
        `ALTER TYPE "${type}" ADD VALUE IF NOT EXISTS '${val}';`
      );
    }
  },

  async down() {
    // PostgreSQL cannot remove ENUM values; intentionally a no-op
    // (same posture as 20260305000001-expand-post-types.cjs).
  },
};
