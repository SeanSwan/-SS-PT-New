'use strict';

/**
 * Add trainerType and payoutPreference to users table
 * Supports two-tier trainer model: independent (15% platform fee) vs hired (35% commission)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('users').catch(() => null);
    if (!tableInfo) return;

    // trainerType: determines commission split tier
    if (!tableInfo.trainerType) {
      await queryInterface.addColumn('users', 'trainerType', {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: null,
        comment: 'Trainer revenue tier: independent (15% platform fee) or hired (35% commission). Null for non-trainers.',
      });
    }

    // payoutPreference: how trainer wants to be paid
    if (!tableInfo.payoutPreference) {
      await queryInterface.addColumn('users', 'payoutPreference', {
        type: Sequelize.STRING(30),
        allowNull: true,
        defaultValue: null,
        comment: 'Trainer payout method preference: zelle, venmo, check, direct_deposit, stripe_connect',
      });
    }

    // payoutDetails: encrypted payout details (email/phone for Zelle/Venmo, account for direct deposit)
    if (!tableInfo.payoutDetails) {
      await queryInterface.addColumn('users', 'payoutDetails', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Encrypted payout details (Zelle email, Venmo handle, bank routing). Admin-only visible.',
      });
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable('users').catch(() => null);
    if (!tableInfo) return;

    if (tableInfo.payoutDetails) await queryInterface.removeColumn('users', 'payoutDetails');
    if (tableInfo.payoutPreference) await queryInterface.removeColumn('users', 'payoutPreference');
    if (tableInfo.trainerType) await queryInterface.removeColumn('users', 'trainerType');
  },
};
