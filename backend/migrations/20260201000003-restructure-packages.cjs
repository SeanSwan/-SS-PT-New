'use strict';

/**
 * PHASE 6 - PACKAGE RESTRUCTURE MIGRATION
 * ======================================
 * Deactivates legacy storefront packages and inserts the new 5-package lineup.
 *
 * Blueprint: STORE-PACKAGE-PHASE-6-REDESIGN.md
 * Why: Reduce decision paralysis and align offerings to premium, simplified tiers.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Deactivate old packages (IDs 50-57)
    await queryInterface.bulkUpdate(
      'storefront_items',
      { isActive: false },
      { id: { [Sequelize.Op.between]: [50, 57] } }
    );

    // Insert 5 new packages
    await queryInterface.bulkInsert('storefront_items', [
      {
        name: '10-Pack Bundle',
        description: '10 personal training sessions (60 min each). Valid for 6 months.',
        packageType: 'fixed',
        price: 1650.0,
        sessions: 10,
        pricePerSession: 165.0,
        months: 6,
        isActive: true,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '24-Pack Bundle',
        description: '24 personal training sessions (60 min each). Valid for 12 months.',
        packageType: 'fixed',
        price: 3600.0,
        sessions: 24,
        pricePerSession: 150.0,
        months: 12,
        isActive: true,
        displayOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '6-Month Unlimited',
        description: 'Unlimited sessions for 6 months. Maximum 5 per week.',
        packageType: 'monthly',
        price: 7200.0,
        sessions: null,
        pricePerSession: 60.0,
        months: 6,
        isActive: true,
        displayOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: '12-Month Unlimited',
        description: 'Unlimited sessions for 12 months. Maximum 5 per week.',
        packageType: 'monthly',
        price: 12000.0,
        sessions: null,
        pricePerSession: 50.0,
        months: 12,
        isActive: true,
        displayOrder: 4,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Express 30',
        description: '10 quick sessions (30 min each). Valid for 3 months.',
        packageType: 'fixed',
        price: 1100.0,
        sessions: 10,
        pricePerSession: 110.0,
        months: 3,
        isActive: true,
        displayOrder: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    // Remove new packages
    await queryInterface.bulkDelete('storefront_items', {
      name: {
        [Sequelize.Op.in]: [
          '10-Pack Bundle',
          '24-Pack Bundle',
          '6-Month Unlimited',
          '12-Month Unlimited',
          'Express 30'
        ]
      }
    });

    // Reactivate old packages
    await queryInterface.bulkUpdate(
      'storefront_items',
      { isActive: true },
      { id: { [Sequelize.Op.between]: [50, 57] } }
    );
  }
};
