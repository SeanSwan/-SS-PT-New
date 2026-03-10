'use strict';

/**
 * Migration: Add FDA nutrition warning fields to daily_macro_logs
 *
 * Adds: addedSugar, saturatedFat, transFat, cholesterol, novaGroup,
 *        flagSodium, flagSugar, flagCholesterol, flagProcessed,
 *        brandName, mealSource
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('daily_macro_logs').catch(() => null);
    if (!tableInfo) {
      console.log('[Migration] daily_macro_logs table does not exist, skipping');
      return;
    }

    const columnsToAdd = {
      addedSugar: { type: Sequelize.FLOAT, allowNull: true, defaultValue: null },
      saturatedFat: { type: Sequelize.FLOAT, allowNull: true, defaultValue: null },
      transFat: { type: Sequelize.FLOAT, allowNull: true, defaultValue: null },
      cholesterol: { type: Sequelize.FLOAT, allowNull: true, defaultValue: null },
      novaGroup: { type: Sequelize.INTEGER, allowNull: true, defaultValue: null, comment: 'NOVA food processing level 1-4' },
      brandName: { type: Sequelize.STRING(200), allowNull: true, defaultValue: null, comment: 'Restaurant or brand name' },
      mealSource: { type: Sequelize.STRING(50), allowNull: true, defaultValue: null, comment: 'restaurant, fast_food, homemade, packaged' },
      flagSodium: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, comment: 'Auto-flag: sodium >800mg per meal' },
      flagSugar: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, comment: 'Auto-flag: added sugar >12g per meal' },
      flagCholesterol: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, comment: 'Auto-flag: cholesterol >100mg per meal' },
      flagSaturatedFat: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, comment: 'Auto-flag: saturated fat >7g per meal' },
      flagTransFat: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, comment: 'Auto-flag: any trans fat present' },
      flagProcessed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false, comment: 'Auto-flag: NOVA group 4 (ultra-processed)' },
    };

    for (const [colName, colDef] of Object.entries(columnsToAdd)) {
      if (!tableInfo[colName]) {
        await queryInterface.addColumn('daily_macro_logs', colName, colDef);
        console.log(`[Migration] Added column: daily_macro_logs.${colName}`);
      } else {
        console.log(`[Migration] Column daily_macro_logs.${colName} already exists, skipping`);
      }
    }
  },

  async down(queryInterface) {
    const columns = [
      'addedSugar', 'saturatedFat', 'transFat', 'cholesterol', 'novaGroup',
      'brandName', 'mealSource',
      'flagSodium', 'flagSugar', 'flagCholesterol', 'flagSaturatedFat',
      'flagTransFat', 'flagProcessed',
    ];

    for (const col of columns) {
      await queryInterface.removeColumn('daily_macro_logs', col).catch(() => {});
    }
  },
};
