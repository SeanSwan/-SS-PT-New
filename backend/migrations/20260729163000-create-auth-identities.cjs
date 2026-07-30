/**
 * Create provider-neutral authentication identities.
 *
 * Provider subjects are the canonical federated key; email is intentionally
 * not copied into this table because it is mutable and already belongs to User.
 */
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('auth_identities', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      provider: { type: Sequelize.STRING(32), allowNull: false },
      providerSubject: { type: Sequelize.STRING(255), allowNull: false },
      emailVerifiedAt: { type: Sequelize.DATE, allowNull: true },
      lastUsedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addConstraint('auth_identities', {
      fields: ['provider', 'providerSubject'], type: 'unique',
      name: 'auth_identities_provider_subject_uq',
    });
    await queryInterface.addConstraint('auth_identities', {
      fields: ['userId', 'provider'], type: 'unique',
      name: 'auth_identities_user_provider_uq',
    });
    await queryInterface.addIndex('auth_identities', ['userId'], {
      name: 'auth_identities_user_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('auth_identities');
  },
};