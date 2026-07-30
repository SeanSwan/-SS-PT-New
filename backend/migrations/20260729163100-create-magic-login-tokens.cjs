/** Create one-time, hashed email login tokens. */
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('magic_login_tokens', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      tokenHash: { type: Sequelize.STRING(64), allowNull: false },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      consumedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addConstraint('magic_login_tokens', {
      fields: ['tokenHash'], type: 'unique', name: 'magic_login_tokens_hash_uq',
    });
    await queryInterface.addIndex('magic_login_tokens', ['userId'], {
      name: 'magic_login_tokens_user_idx',
    });
    await queryInterface.addIndex('magic_login_tokens', ['userId'], {
      name: 'magic_login_tokens_active_user_uq',
      unique: true,
      where: { consumedAt: null },
    });
    await queryInterface.addIndex('magic_login_tokens', ['expiresAt'], {
      name: 'magic_login_tokens_expiry_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('magic_login_tokens');
  },
};