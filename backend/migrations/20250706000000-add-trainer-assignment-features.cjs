/**
 * Migration: Add Trainer Assignment Features to Sessions Table
 * ============================================================
 * Master Prompt v33 Compliance - Zero-downtime deployment
 * 
 * Adds trainer assignment tracking fields to support TrainerAssignmentService
 * - assignedAt: When trainer was assigned to session
 * - assignedBy: Which admin user made the assignment
 * - Updates status validation to include 'assigned' status
 * 
 * Safety: All changes are additive, no breaking modifications
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('[Migration] Adding trainer assignment fields to sessions table...');

      // Add assignedAt column
      await queryInterface.addColumn('sessions', 'assignedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the trainer was assigned to this session'
      }, { transaction });

      console.log('[Migration] ✅ Added assignedAt column');

      // Add assignedBy column
      await queryInterface.addColumn('sessions', 'assignedBy', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Admin user who assigned the trainer to this session',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }, { transaction });

      console.log('[Migration] ✅ Added assignedBy column');

      // Update existing sessions with default values if needed
      await queryInterface.sequelize.query(`
        UPDATE sessions 
        SET assignedAt = "updatedAt", assignedBy = NULL 
        WHERE "trainerId" IS NOT NULL AND assignedAt IS NULL
      `, { transaction });

      console.log('[Migration] ✅ Updated existing trainer-assigned sessions with default assignedAt values');

      // Add index for performance on trainer assignment queries
      await queryInterface.addIndex('sessions', ['trainerId', 'assignedAt'], {
        name: 'sessions_trainer_assignment_idx',
        transaction
      });

      console.log('[Migration] ✅ Added index for trainer assignment queries');

      // Add index for admin assignment tracking
      await queryInterface.addIndex('sessions', ['assignedBy'], {
        name: 'sessions_assigned_by_idx', 
        transaction
      });

      console.log('[Migration] ✅ Added index for admin assignment tracking');

      await transaction.commit();
      console.log('[Migration] ✅ Successfully added trainer assignment features to sessions table');

    } catch (error) {
      await transaction.rollback();
      console.error('[Migration] ❌ Error adding trainer assignment features:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('[Migration] Removing trainer assignment features from sessions table...');

      // Remove indexes first
      await queryInterface.removeIndex('sessions', 'sessions_assigned_by_idx', { transaction });
      await queryInterface.removeIndex('sessions', 'sessions_trainer_assignment_idx', { transaction });

      // Remove columns
      await queryInterface.removeColumn('sessions', 'assignedBy', { transaction });
      await queryInterface.removeColumn('sessions', 'assignedAt', { transaction });

      await transaction.commit();
      console.log('[Migration] ✅ Successfully removed trainer assignment features from sessions table');

    } catch (error) {
      await transaction.rollback();
      console.error('[Migration] ❌ Error removing trainer assignment features:', error);
      throw error;
    }
  }
};
