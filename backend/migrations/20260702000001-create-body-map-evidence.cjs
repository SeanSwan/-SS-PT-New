'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.describeTable('body_map_evidence').catch(() => null);
    if (existing) {
      console.log('body_map_evidence already exists, skipping');
      return;
    }

    await queryInterface.createTable('body_map_evidence', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      painEntryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'client_pain_entries', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      uploadedById: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reviewedById: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      mediaKey: { type: Sequelize.TEXT, allowNull: false },
      thumbnailKey: { type: Sequelize.TEXT, allowNull: true },
      originalFilename: { type: Sequelize.STRING(255), allowNull: true },
      mimeType: { type: Sequelize.STRING(80), allowNull: false },
      fileSize: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      mediaType: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'image' },
      captureContext: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      analysisStatus: { type: Sequelize.STRING(24), allowNull: false, defaultValue: 'pending' },
      aiAnalysis: { type: Sequelize.JSONB, allowNull: true },
      trainerReview: { type: Sequelize.JSONB, allowNull: true },
      reviewedAt: { type: Sequelize.DATE, allowNull: true },
      isDeleted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('body_map_evidence', ['painEntryId', 'isDeleted'], {
      name: 'idx_body_map_evidence_entry_active',
    });
    await queryInterface.addIndex('body_map_evidence', ['userId', 'createdAt'], {
      name: 'idx_body_map_evidence_user_created',
    });
    await queryInterface.addIndex('body_map_evidence', ['analysisStatus'], {
      name: 'idx_body_map_evidence_analysis_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('body_map_evidence');
  },
};
