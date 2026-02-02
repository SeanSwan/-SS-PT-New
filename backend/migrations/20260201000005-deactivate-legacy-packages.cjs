'use strict';

/**
 * PHASE 6 - DEACTIVATE LEGACY PACKAGES
 * ===================================
 * Ensures only Phase 6 packages remain active by deactivating all
 * storefront items not in the Phase 6 list, and normalizes displayOrder.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const phase6Names = [
      '10-Pack Bundle',
      '24-Pack Bundle',
      '6-Month Unlimited',
      '12-Month Unlimited',
      'Express 30'
    ];

    // Deactivate anything not in Phase 6
    await queryInterface.bulkUpdate(
      'storefront_items',
      { isActive: false },
      {
        name: { [Sequelize.Op.notIn]: phase6Names }
      }
    );

    // Ensure Phase 6 items are active
    await queryInterface.bulkUpdate(
      'storefront_items',
      { isActive: true },
      { name: { [Sequelize.Op.in]: phase6Names } }
    );

    // Normalize display order for Phase 6 packages
    const displayOrderMap = {
      '10-Pack Bundle': 1,
      '24-Pack Bundle': 2,
      '6-Month Unlimited': 3,
      '12-Month Unlimited': 4,
      'Express 30': 5
    };

    for (const [name, displayOrder] of Object.entries(displayOrderMap)) {
      await queryInterface.bulkUpdate(
        'storefront_items',
        { displayOrder },
        { name }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    const phase6Names = [
      '10-Pack Bundle',
      '24-Pack Bundle',
      '6-Month Unlimited',
      '12-Month Unlimited',
      'Express 30'
    ];

    // Re-activate all packages (best-effort rollback)
    await queryInterface.bulkUpdate(
      'storefront_items',
      { isActive: true },
      {}
    );

    // Clear displayOrder for Phase 6 packages only
    await queryInterface.bulkUpdate(
      'storefront_items',
      { displayOrder: null },
      { name: { [Sequelize.Op.in]: phase6Names } }
    );
  }
};
