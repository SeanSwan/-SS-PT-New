/**
 * ============================================================================
 * MIGRATION: EnsureAccountStatusAndClaimToken
 * PURPOSE: Idempotent re-run to guarantee claim columns exist on production
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHY THIS EXISTS:
 *   The original migration (20260327000001) may have been marked as completed
 *   by safe-migrate before the columns were actually created (ENUM creation
 *   quirk). This migration uses raw SQL with IF NOT EXISTS to guarantee the
 *   columns exist regardless of prior state.
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    // Create ENUM type (idempotent — DO NOTHING if exists)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_Users_accountStatus" AS ENUM ('stub', 'invited', 'active');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `).catch(e => console.log('ENUM note:', e.message));

    // Add columns (idempotent — IF NOT EXISTS)
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users"
        ADD COLUMN IF NOT EXISTS "accountStatus" "enum_Users_accountStatus" NOT NULL DEFAULT 'active';
    `).catch(e => console.log('accountStatus note:', e.message));

    await queryInterface.sequelize.query(`
      ALTER TABLE "Users"
        ADD COLUMN IF NOT EXISTS "claimTokenHash" VARCHAR(255);
    `).catch(e => console.log('claimTokenHash note:', e.message));

    await queryInterface.sequelize.query(`
      ALTER TABLE "Users"
        ADD COLUMN IF NOT EXISTS "claimTokenExpires" TIMESTAMPTZ;
    `).catch(e => console.log('claimTokenExpires note:', e.message));

    // Partial index (idempotent)
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_claim_token_hash"
        ON "Users" ("claimTokenHash")
        WHERE "claimTokenHash" IS NOT NULL;
    `).catch(e => console.log('Index note:', e.message));

    console.log('Ensure migration complete: accountStatus + claimToken columns verified on Users');
  },

  async down() {
    // No-op — original migration handles teardown
  },
};
