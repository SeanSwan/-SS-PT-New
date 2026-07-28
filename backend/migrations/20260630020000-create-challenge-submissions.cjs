'use strict';

/**
 * Create challenge_submissions for entitlement-gated client challenge proposals.
 */
const TABLE_NAME = 'challenge_submissions';
const INDEXES = [
  { fields: ['status', 'submitted_at'], name: 'idx_challenge_submissions_status_submitted' },
  { fields: ['submitted_by_user_id', 'created_at'], name: 'idx_challenge_submissions_submitter_created' },
  { fields: ['assigned_trainer_id', 'status'], name: 'idx_challenge_submissions_trainer_status' },
  { fields: ['moderation_status'], name: 'idx_challenge_submissions_moderation_status' },
];

async function tableExists(queryInterface) {
  try {
    await queryInterface.describeTable(TABLE_NAME);
    return true;
  } catch {
    return false;
  }
}

function indexCoversFields(index, fields) {
  const indexFields = (index.fields || []).map(field => field.attribute || field.name).filter(Boolean);
  return fields.length === indexFields.length && fields.every((field, indexPosition) => field === indexFields[indexPosition]);
}

async function ensureIndexes(queryInterface) {
  const existingIndexes = await queryInterface.showIndex(TABLE_NAME).catch(() => []);
  for (const index of INDEXES) {
    const exists = existingIndexes.some(existing => existing.name === index.name || indexCoversFields(existing, index.fields));
    if (!exists) await queryInterface.addIndex(TABLE_NAME, index.fields, { name: index.name });
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface))) {
      await queryInterface.createTable(TABLE_NAME, {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.UUIDV4 },
        submitted_by_user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
        assigned_trainer_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        reviewed_by_user_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        approved_challenge_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'challenges', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        title: { type: Sequelize.STRING(120), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: false },
        challenge_type: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'weekly' },
        archetype: { type: Sequelize.STRING(64), allowNull: false, defaultValue: 'consistency' },
        requested_visibility: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'trainer_visible' },
        status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'pending' },
        moderation_status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'pending' },
        review_notes: { type: Sequelize.TEXT, allowNull: true },
        proposal_payload: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        submitted_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        reviewed_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deleted_at: { type: Sequelize.DATE, allowNull: true },
      });
    }

    await ensureIndexes(queryInterface);
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface)) await queryInterface.dropTable(TABLE_NAME);
  },
};