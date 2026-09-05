'use strict';

/**
 * SCU S3 — durable Swan Coach intent/result ledger.
 * Additive only. The command audit log remains append-only telemetry; this
 * table is the single mutable receipt used for idempotent retries and unknown
 * outcome reconciliation. No raw prompts or client names are stored.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    let tableExists = false;
    try {
      await queryInterface.describeTable('coach_intents');
      tableExists = true;
    } catch (error) {
      const message = String(error?.message || '');
      const missingTable = error?.original?.code === '42P01'
        || error?.parent?.code === '42P01'
        || error?.code === '42P01'
        || /no description found for [\"']?coach_intents[\"']? table/i.test(message)
        || /(?:relation|table).*coach_intents.*(?:does not exist|not found)/i.test(message);
      if (!missingTable) throw error;
      // The additive table is absent; create it below.
    }
    if (!tableExists) {
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
    }

    // Table creation and index creation are separate QueryInterface calls. A
    // retry after an interrupted first run must reconcile every required index.
    const existingIndexes = await queryInterface.showIndex('coach_intents');
    const existingNames = new Set(existingIndexes.map((index) => index.name || index.indexName));
    const requiredIndexes = [
      { fields: ['actorId', 'requestKey'], options: { unique: true, name: 'coach_intents_actor_request_key' } },
      { fields: ['status', 'createdAt'], options: { name: 'coach_intents_status_created_at' } },
      { fields: ['operationId'], options: { name: 'coach_intents_operation_id' } },
    ];
    for (const index of requiredIndexes) {
      if (!existingNames.has(index.options.name)) {
        await queryInterface.addIndex('coach_intents', index.fields, index.options);
      }
    }
  },

  async down(queryInterface) {
    // Durable receipts are the reconciliation record for already-issued Coach
    // commands. Rollback must never erase that evidence; a later migration can
    // explicitly retire the table after an audited retention decision.
    void queryInterface;
  },
};
