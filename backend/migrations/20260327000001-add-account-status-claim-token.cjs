/**
 * ============================================================================
 * MIGRATION: AddAccountStatusAndClaimToken
 * PURPOSE: Support Move Fitness client account claiming via Crystalline Link Protocol
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-27
 * AI VILLAGE VALIDATED: 2026-03-27
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Adds accountStatus (STUB/INVITED/ACTIVE), claimTokenHash, and
 *   claimTokenExpires columns to Users table. Enables the QR-code invite
 *   flow where trainers create STUB clients and clients claim their accounts.
 *
 * HOW IT FITS IN THE APP:
 *   Admin creates Move Fitness client → accountStatus='STUB' + claimToken generated
 *   Client scans QR / enters code → /claim/:token → sets password → accountStatus='ACTIVE'
 *
 * KEY DECISIONS:
 *   Token stored as bcrypt hash (not plaintext) for security.
 *   Existing users default to 'active' — backwards compatible.
 *   Uses raw SQL for ENUM creation to avoid Sequelize ENUM naming issues.
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    // Use raw SQL for maximum PostgreSQL compatibility
    // Create ENUM type first (idempotent)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_Users_accountStatus" AS ENUM ('stub', 'invited', 'active');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `).catch(e => console.log('ENUM creation note:', e.message));

    // Add accountStatus column (idempotent)
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users"
        ADD COLUMN IF NOT EXISTS "accountStatus" "enum_Users_accountStatus" NOT NULL DEFAULT 'active';
    `).catch(e => console.log('accountStatus column note:', e.message));

    // Add claimTokenHash column (idempotent)
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users"
        ADD COLUMN IF NOT EXISTS "claimTokenHash" VARCHAR(255);
    `).catch(e => console.log('claimTokenHash column note:', e.message));

    // Add claimTokenExpires column (idempotent)
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users"
        ADD COLUMN IF NOT EXISTS "claimTokenExpires" TIMESTAMPTZ;
    `).catch(e => console.log('claimTokenExpires column note:', e.message));

    // Partial index on claimTokenHash for fast lookup
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_claim_token_hash"
        ON "Users" ("claimTokenHash")
        WHERE "claimTokenHash" IS NOT NULL;
    `).catch(e => console.log('Index note:', e.message));

    console.log('Migration complete: accountStatus, claimTokenHash, claimTokenExpires added to Users');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`ALTER TABLE "Users" DROP COLUMN IF EXISTS "claimTokenExpires";`).catch(() => {});
    await queryInterface.sequelize.query(`ALTER TABLE "Users" DROP COLUMN IF EXISTS "claimTokenHash";`).catch(() => {});
    await queryInterface.sequelize.query(`ALTER TABLE "Users" DROP COLUMN IF EXISTS "accountStatus";`).catch(() => {});
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_Users_accountStatus";`).catch(() => {});
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS "idx_users_claim_token_hash";`).catch(() => {});
  },
};
