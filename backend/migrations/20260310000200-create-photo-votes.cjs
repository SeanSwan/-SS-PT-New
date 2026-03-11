'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('gallery_photo_votes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      photo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'gallery_photos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      visitor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'gallery_visitors', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      session_hash: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'Fallback identifier when visitor is not logged in',
      },
      vote_type: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        comment: '1 = thumbs up, -1 = thumbs down',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // One vote per visitor per photo
    await queryInterface.addIndex('gallery_photo_votes', ['photo_id', 'visitor_id'], {
      unique: true,
      where: { visitor_id: { [Sequelize.Op.ne]: null } },
      name: 'idx_photo_votes_visitor_unique',
    });

    // One vote per session per photo (fallback for anonymous)
    await queryInterface.addIndex('gallery_photo_votes', ['photo_id', 'session_hash'], {
      unique: true,
      where: { session_hash: { [Sequelize.Op.ne]: null } },
      name: 'idx_photo_votes_session_unique',
    });

    // Fast aggregation by photo
    await queryInterface.addIndex('gallery_photo_votes', ['photo_id'], {
      name: 'idx_photo_votes_photo',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('gallery_photo_votes');
  },
};
