'use strict';

/**
 * Create durable Hermes operator tasks.
 *
 * Uses string-backed status/type columns instead of database ENUMs so the
 * operator queue can grow without production enum rewrite migrations.
 */
const TABLE_NAME = 'hermes_tasks';
const INDEXES = [
  { fields: ['agent_type', 'status'], name: 'idx_hermes_tasks_agent_status' },
  { fields: ['requested_by'], name: 'idx_hermes_tasks_requested_by' },
  { fields: ['status'], name: 'idx_hermes_tasks_status' },
  { fields: ['created_at'], name: 'idx_hermes_tasks_created_at' },
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
  const indexFields = (index.fields || [])
    .map(field => field.attribute || field.name)
    .filter(Boolean);
  return fields.length === indexFields.length
    && fields.every((field, position) => field === indexFields[position]);
}

async function ensureIndexes(queryInterface) {
  const existingIndexes = await queryInterface.showIndex(TABLE_NAME).catch(() => []);
  for (const index of INDEXES) {
    const exists = existingIndexes.some(existing =>
      existing.name === index.name || indexCoversFields(existing, index.fields)
    );
    if (!exists) await queryInterface.addIndex(TABLE_NAME, index.fields, { name: index.name });
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface))) {
      await queryInterface.createTable(TABLE_NAME, {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        agent_type: {
          type: Sequelize.STRING(32),
          allowNull: false,
        },
        task_title: {
          type: Sequelize.STRING(200),
          allowNull: false,
        },
        task_description: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        priority: {
          type: Sequelize.STRING(16),
          allowNull: false,
          defaultValue: 'normal',
        },
        requested_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        status: {
          type: Sequelize.STRING(24),
          allowNull: false,
          defaultValue: 'pending',
        },
        completed_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        completed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        terminal_reason: {
          type: Sequelize.STRING(500),
          allowNull: true,
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
    }

    await ensureIndexes(queryInterface);
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface)) {
      await queryInterface.dropTable(TABLE_NAME);
    }
  },
};
