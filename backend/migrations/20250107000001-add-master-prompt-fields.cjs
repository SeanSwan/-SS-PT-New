/**
 * Migration: Add Master Prompt JSON Fields to Users Table
 * ========================================================
 * Master Prompt v33 Compliance - Autonomous Coaching Loop v3.1
 *
 * Adds AI-powered personal training fields to support the complete
 * Onboarding-to-Database Pipeline.
 *
 * Fields Added:
 * - masterPromptJson: Complete client profile in JSON format (v3.0 schema)
 * - spiritName: Privacy-preserving alias for clients (e.g., "Golden Hawk")
 *
 * Safety: All changes are additive, no breaking modifications
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('[Migration] Adding master prompt fields to Users table...');

      // Check if columns already exist (idempotent migration)
      const tableInfo = await queryInterface.describeTable('Users');

      // Add masterPromptJson column
      if (!tableInfo.masterPromptJson) {
        await queryInterface.addColumn('Users', 'masterPromptJson', {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Complete client master prompt JSON (v3.0 schema) for AI-powered coaching'
        }, { transaction });
        console.log('[Migration] ✅ Added masterPromptJson column');
      } else {
        console.log('[Migration] ⚪ masterPromptJson column already exists');
      }

      // Add spiritName column
      if (!tableInfo.spiritName) {
        await queryInterface.addColumn('Users', 'spiritName', {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Client spirit name for privacy (e.g., "Golden Hawk", "Silver Crane")'
        }, { transaction });
        console.log('[Migration] ✅ Added spiritName column');
      } else {
        console.log('[Migration] ⚪ spiritName column already exists');
      }

      await transaction.commit();
      console.log('[Migration] ✅ Successfully added master prompt fields to Users table');

    } catch (error) {
      await transaction.rollback();
      console.error('[Migration] ❌ Error adding master prompt fields:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('[Migration] Removing master prompt fields from Users table...');

      // Remove columns
      await queryInterface.removeColumn('Users', 'spiritName', { transaction });
      await queryInterface.removeColumn('Users', 'masterPromptJson', { transaction });

      await transaction.commit();
      console.log('[Migration] ✅ Successfully removed master prompt fields from Users table');

    } catch (error) {
      await transaction.rollback();
      console.error('[Migration] ❌ Error removing master prompt fields:', error);
      throw error;
    }
  }
};
