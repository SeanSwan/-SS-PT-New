'use strict';

/**
 * FIX Migration: Rename camelCase columns to snake_case
 * =====================================================
 *
 * Problem: Two conflicting migrations created the client_trainer_assignments table:
 * - 20250714... created columns with camelCase (clientId, trainerId, assignedBy)
 * - 20250806... expected snake_case columns (client_id, trainer_id, assigned_by)
 *
 * The model uses `field: 'client_id'` mappings, so Sequelize queries expect
 * snake_case column names. This migration renames camelCase columns to snake_case
 * if they exist, making the database match the model expectations.
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

      // Map of camelCase to snake_case columns that need renaming
      const renameMap = {
        'clientId': 'client_id',
        'trainerId': 'trainer_id',
        'assignedBy': 'assigned_by',
        'lastModifiedBy': 'last_modified_by',
        'deactivatedAt': 'deactivated_at',
        'assignedAt': 'assigned_at',
        'createdAt': 'created_at',
        'updatedAt': 'updated_at'
      };

      let renamedCount = 0;

      for (const [camelCase, snakeCase] of Object.entries(renameMap)) {
        // Check if camelCase column exists and snake_case does not
        if (tableInfo[camelCase] && !tableInfo[snakeCase]) {
          console.log(`  📝 Renaming ${camelCase} → ${snakeCase}`);
          await queryInterface.renameColumn(
            'client_trainer_assignments',
            camelCase,
            snakeCase,
            { transaction }
          );
          renamedCount++;
        } else if (tableInfo[snakeCase]) {
          console.log(`  ✓ ${snakeCase} already exists`);
        } else if (!tableInfo[camelCase] && !tableInfo[snakeCase]) {
          console.log(`  ⚠️ Neither ${camelCase} nor ${snakeCase} exists`);
        }
      }

      // Update indexes to use snake_case column names if they reference camelCase
      if (renamedCount > 0) {
        console.log('🔄 Recreating indexes with correct column names...');

        // Drop old indexes that might reference camelCase columns
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

        // Recreate indexes with snake_case column names
        try {
          await queryInterface.addIndex('client_trainer_assignments', ['client_id'], {
            name: 'idx_client_trainer_assignments_client_id',
            transaction
          });
          console.log('  ✅ Created index on client_id');
        } catch (e) {
          console.log('  ⚠️ Could not create client_id index:', e.message);
        }

        try {
          await queryInterface.addIndex('client_trainer_assignments', ['trainer_id'], {
            name: 'idx_client_trainer_assignments_trainer_id',
            transaction
          });
          console.log('  ✅ Created index on trainer_id');
        } catch (e) {
          console.log('  ⚠️ Could not create trainer_id index:', e.message);
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
          await queryInterface.addIndex('client_trainer_assignments', ['client_id', 'trainer_id'], {
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
        console.log(`✅ Column naming fix complete! Renamed ${renamedCount} columns.`);
      } else {
        console.log('✅ Columns already use correct naming convention.');
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
