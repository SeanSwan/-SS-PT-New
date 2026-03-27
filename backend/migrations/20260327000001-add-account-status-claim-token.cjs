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
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('Users').catch(() => null);
    if (!tableDesc) {
      console.log('Users table does not exist, skipping');
      return;
    }

    // Add accountStatus column
    if (!tableDesc.accountStatus) {
      await queryInterface.addColumn('Users', 'accountStatus', {
        type: Sequelize.ENUM('stub', 'invited', 'active'),
        defaultValue: 'active',
        allowNull: false,
      });
      console.log('Added accountStatus column to Users');
    } else {
      console.log('accountStatus column already exists, skipping');
    }

    // Add claimTokenHash column
    if (!tableDesc.claimTokenHash) {
      await queryInterface.addColumn('Users', 'claimTokenHash', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
      console.log('Added claimTokenHash column to Users');
    } else {
      console.log('claimTokenHash column already exists, skipping');
    }

    // Add claimTokenExpires column
    if (!tableDesc.claimTokenExpires) {
      await queryInterface.addColumn('Users', 'claimTokenExpires', {
        type: Sequelize.DATE,
        allowNull: true,
      });
      console.log('Added claimTokenExpires column to Users');
    } else {
      console.log('claimTokenExpires column already exists, skipping');
    }

    // Index on claimTokenHash for fast lookup during claim flow
    try {
      await queryInterface.addIndex('Users', ['claimTokenHash'], {
        name: 'idx_users_claim_token_hash',
        where: { claimTokenHash: { [Sequelize.Op.ne]: null } },
      });
      console.log('Created index idx_users_claim_token_hash');
    } catch (e) {
      if (e.message?.includes('already exists')) {
        console.log('Index idx_users_claim_token_hash already exists, skipping');
      } else {
        console.warn('Index creation warning:', e.message);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Users', 'claimTokenExpires').catch(() => {});
    await queryInterface.removeColumn('Users', 'claimTokenHash').catch(() => {});
    await queryInterface.removeColumn('Users', 'accountStatus').catch(() => {});
    // Clean up ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_accountStatus";').catch(() => {});
  },
};
