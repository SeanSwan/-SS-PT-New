'use strict';

/**
 * PHASE 6 - ADMIN SPECIALS TABLE
 * ==============================
 * Creates admin_specials for bonus-session promotions (no discounts).
 *
 * Blueprint: STORE-PACKAGE-PHASE-6-REDESIGN.md
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('admin_specials', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      bonusSessions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      bonusDuration: {
        type: Sequelize.INTEGER,
        defaultValue: 60
      },
      applicablePackageIds: {
        type: Sequelize.ARRAY(Sequelize.INTEGER),
        allowNull: true
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('admin_specials', ['isActive'], {
      name: 'idx_admin_specials_active'
    });
    await queryInterface.addIndex('admin_specials', ['startDate', 'endDate'], {
      name: 'idx_admin_specials_dates'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('admin_specials');
  }
};
