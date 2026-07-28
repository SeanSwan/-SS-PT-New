'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('equipment_scan_sessions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      profileId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'equipment_profiles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      trainerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      photoUrl: { type: Sequelize.STRING(500), allowNull: true },
      schemaVersion: { type: Sequelize.STRING(80), allowNull: true },
      promptVersion: { type: Sequelize.STRING(120), allowNull: true },
      imageQuality: { type: Sequelize.STRING(30), allowNull: true },
      sceneSummary: { type: Sequelize.TEXT, allowNull: true },
      model: { type: Sequelize.STRING(120), allowNull: true },
      latencyMs: { type: Sequelize.INTEGER, allowNull: true },
      candidateCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      reviewableCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      possibleItemCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      duplicateCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdItemCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      approvedCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      rejectedCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'pending_review' },
      rawResponse: { type: Sequelize.JSONB, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('equipment_scan_sessions', ['profileId'], { name: 'idx_equipment_scan_session_profile' });
    await queryInterface.addIndex('equipment_scan_sessions', ['trainerId'], { name: 'idx_equipment_scan_session_trainer' });
    await queryInterface.addIndex('equipment_scan_sessions', ['status'], { name: 'idx_equipment_scan_session_status' });
    await queryInterface.addIndex('equipment_scan_sessions', ['createdAt'], { name: 'idx_equipment_scan_session_created' });

    await queryInterface.createTable('equipment_scan_candidates', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      sessionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'equipment_scan_sessions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      profileId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'equipment_profiles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      equipmentItemId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'equipment_items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      duplicateOfItemId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'equipment_items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      candidateIndex: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      status: { type: Sequelize.STRING(30), allowNull: false },
      suggestedName: { type: Sequelize.STRING(150), allowNull: false },
      suggestedCategory: { type: Sequelize.STRING(50), allowNull: true },
      resistanceType: { type: Sequelize.STRING(30), allowNull: true },
      confidence: { type: Sequelize.FLOAT, allowNull: true },
      visibility: { type: Sequelize.STRING(30), allowNull: true },
      quantity: { type: Sequelize.INTEGER, allowNull: true },
      boundingBox: { type: Sequelize.JSONB, allowNull: true },
      dedupeKey: { type: Sequelize.STRING(180), allowNull: true },
      matchType: { type: Sequelize.STRING(40), allowNull: true },
      candidateData: { type: Sequelize.JSONB, allowNull: true },
      reviewedAt: { type: Sequelize.DATE, allowNull: true },
      reviewedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      trainerCorrection: { type: Sequelize.JSONB, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('equipment_scan_candidates', ['sessionId'], { name: 'idx_equipment_scan_candidate_session' });
    await queryInterface.addIndex('equipment_scan_candidates', ['profileId'], { name: 'idx_equipment_scan_candidate_profile' });
    await queryInterface.addIndex('equipment_scan_candidates', ['equipmentItemId'], { name: 'idx_equipment_scan_candidate_item' });
    await queryInterface.addIndex('equipment_scan_candidates', ['duplicateOfItemId'], { name: 'idx_equipment_scan_candidate_duplicate' });
    await queryInterface.addIndex('equipment_scan_candidates', ['status'], { name: 'idx_equipment_scan_candidate_status' });
    await queryInterface.addIndex('equipment_scan_candidates', ['reviewedBy'], { name: 'idx_equipment_scan_candidate_reviewer' });
    await queryInterface.addIndex('equipment_scan_candidates', ['reviewedAt'], { name: 'idx_equipment_scan_candidate_reviewed_at' });
    await queryInterface.addIndex('equipment_scan_candidates', ['dedupeKey'], { name: 'idx_equipment_scan_candidate_dedupe' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('equipment_scan_candidates');
    await queryInterface.dropTable('equipment_scan_sessions');
  },
};