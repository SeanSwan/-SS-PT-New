'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('gallery_messages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      visitor_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'gallery_visitors', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      event_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'gallery_events', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      email: { type: Sequelize.STRING(255), allowNull: false },
      first_name: { type: Sequelize.STRING(100), allowNull: true },
      phone: { type: Sequelize.STRING(50), allowNull: true },
      message: { type: Sequelize.TEXT, allowNull: false },
      is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      read_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('gallery_messages', ['email'], { name: 'idx_gallery_messages_email' });
    await queryInterface.addIndex('gallery_messages', ['event_id'], { name: 'idx_gallery_messages_event' });
    await queryInterface.addIndex('gallery_messages', ['is_read'], { name: 'idx_gallery_messages_read' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('gallery_messages');
  },
};
