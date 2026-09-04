'use strict';

/**
 * SCU S3 — durable Swan Coach intent/result ledger.
 * Additive only. The command audit log remains append-only telemetry; this
 * table is the single mutable receipt used for idempotent retries and unknown
 * outcome reconciliation. No raw prompts or client names are stored.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.describeTable('coach_intents');
      return;
    } catch (error) {
      if (error?.original?.code !== '42P01' && error?.parent?.code !== '42P01' && error?.code !== '42P01') throw error;
      // The additive table is absent; create it below.
    }
    await queryInterface.createTable('coach_intents', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      actorId: { type: Sequelize.INTEGER, allowNull: false },
      requestKey: { type: Sequelize.STRING(128), allowNull: false },
      requestHash: { type: Sequelize.STRING(64), allowNull: false },
      commandType: { type: Sequelize.STRING(100), allowNull: false },
      targetClientId: { type: Sequelize.INTEGER, allowNull: true },
      status: { type: Sequelize.STRING(24), allowNull: false, defaultValue: 'claimed' },
      operationId: { type: Sequelize.STRING(64), allowNull: true },
      proposalId: { type: Sequelize.STRING(64), allowNull: true },
      result: { type: Sequelize.JSONB, allowNull: true },
      errorCode: { type: Sequelize.STRING(100), allowNull: true },
      expiresAt: { type: Sequelize.DATE, allowNull: true },
      completedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('coach_intents', ['actorId', 'requestKey'], { unique: true, name: 'coach_intents_actor_request_key' });
    await queryInterface.addIndex('coach_intents', ['status', 'createdAt'], { name: 'coach_intents_status_created_at' });
    await queryInterface.addIndex('coach_intents', ['operationId'], { name: 'coach_intents_operation_id' });
  },

  async down(queryInterface) {
    try {
      await queryInterface.describeTable('coach_intents');
      await queryInterface.dropTable('coach_intents');
    } catch (error) {
      if (error?.original?.code !== '42P01' && error?.parent?.code !== '42P01' && error?.code !== '42P01') throw error;
      // Idempotent rollback when the table was never created.
    }
  },
};
