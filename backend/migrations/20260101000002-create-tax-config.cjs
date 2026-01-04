'use strict';

/**
 * Migration: Create Tax Configuration Table
 * Purpose: Store state-specific tax rates for all 50 US states
 * Features:
 * - Per-state tax rate configuration
 * - Active/inactive toggle
 * - Support for future tax rate updates
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tax_config', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },

      state_code: {
        type: Sequelize.STRING(2),
        allowNull: false,
        unique: true,
        comment: 'Two-letter state abbreviation (e.g., CA, TX, NY)'
      },

      state_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Full state name (e.g., California, Texas, New York)'
      },

      tax_rate: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: false,
        comment: 'Tax rate as decimal (e.g., 0.0725 for 7.25%)'
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether this tax config is active'
      },

      effective_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When this tax rate becomes effective'
      },

      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Admin notes about tax rate changes'
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Indexes
    await queryInterface.addIndex('tax_config', ['state_code'], {
      name: 'idx_tax_config_state_code',
      unique: true
    });

    await queryInterface.addIndex('tax_config', ['is_active'], {
      name: 'idx_tax_config_is_active'
    });

    console.log('✅ Created tax_config table');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tax_config');
    console.log('✅ Dropped tax_config table');
  }
};
