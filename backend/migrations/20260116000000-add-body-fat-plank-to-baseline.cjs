/**
 * Migration: Add bodyFatPercentage and plankDuration to client_baseline_measurements
 * Created: 2026-01-16
 * Phase: 1.2 - Admin UI Implementation
 * Purpose: Add missing fields required by BaselineMeasurementsEntry.tsx
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Adding bodyFatPercentage and plankDuration columns to client_baseline_measurements...');

    await queryInterface.addColumn('client_baseline_measurements', 'bodyFatPercentage', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Body fat percentage (0-100)',
    });

    await queryInterface.addColumn('client_baseline_measurements', 'plankDuration', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Plank hold duration in seconds',
    });

    console.log('✅ Successfully added bodyFatPercentage and plankDuration columns');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Removing bodyFatPercentage and plankDuration columns...');

    await queryInterface.removeColumn('client_baseline_measurements', 'bodyFatPercentage');
    await queryInterface.removeColumn('client_baseline_measurements', 'plankDuration');

    console.log('✅ Successfully removed bodyFatPercentage and plankDuration columns');
  }
};
