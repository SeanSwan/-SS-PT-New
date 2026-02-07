'use strict';

/**
 * FIX Migration: Sync column names to match model (camelCase)
 * ===========================================================
 *
 * Problem: Two conflicting migrations may have created different column names:
 * - 20250714... creates camelCase (clientId, trainerId, assignedBy)
 * - 20250806... creates snake_case (client_id, trainer_id, assigned_by)
 *
 * The model now uses camelCase WITHOUT field mappings, so Sequelize expects
 * camelCase column names in the database. This migration:
 * 1. Detects which columns exist
 * 2. Renames snake_case to camelCase if needed
 *
 * Safe to run multiple times - checks column existence before renaming.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔧 Checking client_trainer_assignments column naming...');

      // Check if table exists
      const tables = await queryInterface.showAllTables();
      if (!tables.includes('client_trainer_assignments')) {
        console.log('⚠️ client_trainer_assignments table does not exist, skipping');
        await transaction.commit();
        return;
      }

      // Get current column info
      const tableInfo = await queryInterface.describeTable('client_trainer_assignments');
      const columnNames = Object.keys(tableInfo);
      console.log('📋 Current columns:', columnNames.join(', '));

      // Map of snake_case to camelCase columns that need renaming
      // (model expects camelCase)
      const renameMap = {
        'client_id': 'clientId',
        'trainer_id': 'trainerId',
        'assigned_by': 'assignedBy',
        'assigned_at': 'assignedAt',
        'created_at': 'createdAt',
        'updated_at': 'updatedAt'
      };

      let renamedCount = 0;

      for (const [snakeCase, camelCase] of Object.entries(renameMap)) {
        // Check if snake_case column exists and camelCase does not
        if (tableInfo[snakeCase] && !tableInfo[camelCase]) {
          console.log(`  📝 Renaming ${snakeCase} → ${camelCase}`);
          await queryInterface.renameColumn(
            'client_trainer_assignments',
            snakeCase,
            camelCase,
            { transaction }
          );
          renamedCount++;
        } else if (tableInfo[camelCase]) {
          console.log(`  ✓ ${camelCase} already exists`);
        } else if (!tableInfo[snakeCase] && !tableInfo[camelCase]) {
          console.log(`  ⚠️ Neither ${snakeCase} nor ${camelCase} exists`);
        }
      }

      // Update indexes to use camelCase column names if they were renamed
      if (renamedCount > 0) {
        console.log('🔄 Recreating indexes with correct column names...');

        // Drop old indexes that might reference snake_case columns
        const oldIndexes = [
          'idx_client_trainer_assignments_client_id',
          'idx_client_trainer_assignments_trainer_id',
          'idx_client_trainer_assignments_status',
          'idx_client_trainer_assignments_assigned_by',
          'idx_client_trainer_active_assignments',
          'idx_unique_active_client_trainer'
        ];

        for (const indexName of oldIndexes) {
          try {
            await queryInterface.removeIndex('client_trainer_assignments', indexName, { transaction });
            console.log(`  🗑️ Removed index ${indexName}`);
          } catch (e) {
            // Index might not exist, continue
          }
        }

        // Recreate indexes with camelCase column names
        try {
          await queryInterface.addIndex('client_trainer_assignments', ['clientId'], {
            name: 'idx_client_trainer_assignments_client_id',
            transaction
          });
          console.log('  ✅ Created index on clientId');
        } catch (e) {
          console.log('  ⚠️ Could not create clientId index:', e.message);
        }

        try {
          await queryInterface.addIndex('client_trainer_assignments', ['trainerId'], {
            name: 'idx_client_trainer_assignments_trainer_id',
            transaction
          });
          console.log('  ✅ Created index on trainerId');
        } catch (e) {
          console.log('  ⚠️ Could not create trainerId index:', e.message);
        }

        try {
          await queryInterface.addIndex('client_trainer_assignments', ['status'], {
            name: 'idx_client_trainer_assignments_status',
            transaction
          });
          console.log('  ✅ Created index on status');
        } catch (e) {
          console.log('  ⚠️ Could not create status index:', e.message);
        }

        try {
          await queryInterface.addIndex('client_trainer_assignments', ['clientId', 'trainerId'], {
            name: 'idx_unique_active_client_trainer',
            unique: true,
            where: { status: 'active' },
            transaction
          });
          console.log('  ✅ Created unique constraint index');
        } catch (e) {
          console.log('  ⚠️ Could not create unique index:', e.message);
        }
      }

      await transaction.commit();

      if (renamedCount > 0) {
        console.log(`✅ Column naming fix complete! Renamed ${renamedCount} columns to camelCase.`);
      } else {
        console.log('✅ Columns already use correct naming convention (camelCase).');
      }

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Column naming fix failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // This migration fixes data, we don't want to undo it
    console.log('⚠️ Down migration is a no-op to prevent regression');
  }
};
