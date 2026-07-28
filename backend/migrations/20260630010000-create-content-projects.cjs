'use strict';

/**
 * Create content_projects for Content Studio creator workflow persistence.
 */
const TABLE_NAME = 'content_projects';
const INDEXES = [
  { fields: ['status'], name: 'idx_content_projects_status' },
  { fields: ['source_type'], name: 'idx_content_projects_source_type' },
  { fields: ['publish_due_at'], name: 'idx_content_projects_publish_due_at' },
  { fields: ['created_by'], name: 'idx_content_projects_created_by' },
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
        title: { type: Sequelize.STRING(180), allowNull: false },
        status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'idea' },
        source_type: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'manual' },
        source_id: { type: Sequelize.STRING(120), allowNull: true },
        priority: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'normal' },
        script_draft: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        shot_list: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        editing_handoff: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        youtube_package: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        assets: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        scheduled_at: { type: Sequelize.DATE, allowNull: true },
        filmed_at: { type: Sequelize.DATE, allowNull: true },
        editing_due_at: { type: Sequelize.DATE, allowNull: true },
        publish_due_at: { type: Sequelize.DATE, allowNull: true },
        created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        updated_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
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
