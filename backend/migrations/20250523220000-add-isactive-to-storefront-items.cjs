'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('🔧 Checking for missing isActive column in storefront_items...');

      // Check if table exists
      const tables = await queryInterface.showAllTables({ transaction });
      if (!tables.includes('storefront_items')) {
        console.log('⚠️ Table storefront_items does not exist. Skipping migration.');
        await transaction.commit();
        return;
      }

      // Check if isActive column exists
      const columns = await queryInterface.describeTable('storefront_items', { transaction });
      
      if (!columns.isActive) {
        console.log('➕ Adding missing isActive column...');
        await queryInterface.addColumn('storefront_items', 'isActive', {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: false,
        }, { transaction });
        console.log('✅ Successfully added isActive column');

        // Add index for performance
        await queryInterface.addIndex('storefront_items', ['isActive'], { 
          name: 'idx_storefront_items_isactive',
          transaction 
        });
        console.log('✅ Added index on isActive column');
      } else {
        console.log('ℹ️ isActive column already exists. No action needed.');
      }

      // Also check for displayOrder column while we're here
      if (!columns.displayOrder) {
        console.log('➕ Adding missing displayOrder column...');
        await queryInterface.addColumn('storefront_items', 'displayOrder', {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
        }, { transaction });
        console.log('✅ Successfully added displayOrder column');
      }

      await transaction.commit();
      console.log('🎉 Migration completed successfully');

    } catch (error) {
      await transaction.rollback();
      console.error('💥 Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('🔄 Reverting isActive column addition...');

      // Check if table exists
      const tables = await queryInterface.showAllTables({ transaction });
      if (!tables.includes('storefront_items')) {
        console.log('⚠️ Table storefront_items does not exist. Nothing to revert.');
        await transaction.commit();
        return;
      }

      // Remove index first
      try {
        await queryInterface.removeIndex('storefront_items', 'idx_storefront_items_isactive', { transaction });
        console.log('🗑️ Removed isActive index');
      } catch (indexError) {
        console.log('ℹ️ Index removal not needed or already removed');
      }

      // Remove columns
      const columns = await queryInterface.describeTable('storefront_items', { transaction });
      
      if (columns.isActive) {
        await queryInterface.removeColumn('storefront_items', 'isActive', { transaction });
        console.log('🗑️ Removed isActive column');
      }

      if (columns.displayOrder) {
        await queryInterface.removeColumn('storefront_items', 'displayOrder', { transaction });
        console.log('🗑️ Removed displayOrder column');
      }

      await transaction.commit();
      console.log('✅ Migration rollback completed');

    } catch (error) {
      await transaction.rollback();
      console.error('💥 Migration rollback failed:', error);
      throw error;
    }
  }
};