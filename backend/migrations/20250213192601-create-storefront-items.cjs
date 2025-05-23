'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Executing migration: 20250213192601-create-storefront-items');

      // Check if table exists (Idempotency)
      const tables = await queryInterface.showAllTables({ transaction });
      if (!tables.includes('storefront_items')) {
        console.log('Table storefront_items does not exist. Creating table...');
        await queryInterface.createTable('storefront_items', {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
          packageType: { type: Sequelize.STRING, allowNull: false, defaultValue: 'fixed' }, // STRING type for simplicity
          name: { type: Sequelize.STRING, allowNull: false },
          description: { type: Sequelize.TEXT, allowNull: true },
          price: { type: Sequelize.FLOAT, allowNull: true }, // Changed to FLOAT to match model
          sessions: { type: Sequelize.INTEGER, allowNull: true },
          pricePerSession: { type: Sequelize.FLOAT, allowNull: false }, // Changed to FLOAT to match model
          months: { type: Sequelize.INTEGER, allowNull: true },
          sessionsPerWeek: { type: Sequelize.INTEGER, allowNull: true },
          totalSessions: { type: Sequelize.INTEGER, allowNull: true },
          totalCost: { type: Sequelize.FLOAT, allowNull: true }, // Changed to FLOAT to match model
          imageUrl: { type: Sequelize.STRING, allowNull: true },
          theme: { type: Sequelize.STRING, allowNull: true, defaultValue: 'cosmic' }, // STRING type for simplicity
          stripeProductId: { type: Sequelize.STRING, allowNull: true }, // Added field
          stripePriceId: { type: Sequelize.STRING, allowNull: true }, // Added field
          isActive: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false }, // Added field
          createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
          updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        }, { transaction });
        console.log('Table storefront_items created.');

        // Add indexes
        await queryInterface.addIndex('storefront_items', ['packageType'], { transaction });
        await queryInterface.addIndex('storefront_items', ['theme'], { transaction });
        await queryInterface.addIndex('storefront_items', ['isActive'], { transaction });
        console.log('Indexes added.');
      } else {
        console.log('Table storefront_items already exists. Checking for missing columns...');
        // Add missing columns if table exists (more robust idempotency)
        const columns = await queryInterface.describeTable('storefront_items', { transaction });

        const addColumnIfMissing = async (colName, definition) => {
          if (!columns[colName]) {
            await queryInterface.addColumn('storefront_items', colName, definition, { transaction });
            console.log(`Added missing column: ${colName}`);
          }
        };

        // Define columns to add/check
        await addColumnIfMissing('price', { type: Sequelize.FLOAT, allowNull: true }); // Changed to FLOAT
        await addColumnIfMissing('stripeProductId', { type: Sequelize.STRING, allowNull: true });
        await addColumnIfMissing('stripePriceId', { type: Sequelize.STRING, allowNull: true });
        await addColumnIfMissing('isActive', { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false });

        // Optional: Add checks/warnings for existing column types if needed
        console.log('Column check complete.');
      }

      await transaction.commit();
      console.log('Migration 20250213192601-create-storefront-items completed successfully.');

    } catch (err) {
      await transaction.rollback();
      console.error("Migration 20250213192601-create-storefront-items failed:", err);
      throw err; // Re-throw error to halt migration process
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Reverting migration 20250213192601-create-storefront-items...');
      await queryInterface.dropTable('storefront_items', { transaction });
      // No ENUM types to drop, as we are using STRING in the migration
      await transaction.commit();
      console.log('Migration 20250213192601-create-storefront-items reverted.');
    } catch (err) {
      await transaction.rollback();
      console.error("Rollback for 20250213192601-create-storefront-items failed:", err);
      throw err;
    }
  },
};