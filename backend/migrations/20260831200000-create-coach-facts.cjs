'use strict';

/**
 * coach_facts — durable, temporally-valid, trainer-approved client facts.
 * Fable blueprint 2026-08-31, slice S1.
 *
 * SCHEMA TRUTH (verified against backend/schema-snapshot.json, digest 89e65293ae1a877a):
 * the canonical users table is "Users" — QUOTED, capital U — and its id is INTEGER.
 * A bare `users` table also exists in production as a stale duplicate; because
 * unquoted identifiers fold to lower case in Postgres, `REFERENCES Users(id)`
 * would silently bind to the dead table. queryInterface quotes the `model:` value
 * it is given, so `model: 'Users'` emits `REFERENCES "Users"` — matching the house
 * pattern in ClientNote and every recent migration.
 *
 * Idempotent in both directions, matching the house style of
 * 20260828000001-add-workout-log-circuit-fields.cjs: re-running up() on a database
 * that already has the table is a no-op rather than an error, so a partially
 * applied deploy can be re-run safely.
 *
 * Plain (non-CONCURRENT) index creation is deliberate and safe here: the table is
 * created in this same migration, is empty, and has no readers. CONCURRENTLY
 * cannot run inside a transaction and would be the wrong tool.
 */

const TABLE = 'coach_facts';

const CATEGORIES = [
  'injury_constraint',
  'preference',
  'goal_context',
  'lifestyle',
  'equipment',
  'motivation_style',
  'schedule_pattern',
  'coaching_cue',
  'milestone',
];

const SOURCE_TYPES = ['chat', 'dictation', 'intake', 'workout_log', 'client_note', 'trainer_manual'];

const STATUSES = ['proposed', 'active', 'invalidated', 'rejected'];

async function tableExists(queryInterface) {
  const tables = await queryInterface.showAllTables();
  return tables.some((entry) => (typeof entry === 'string' ? entry : entry?.tableName) === TABLE);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await tableExists(queryInterface)) return;

    await queryInterface.createTable(TABLE, {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      // The client this fact is about.
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      category: {
        type: Sequelize.ENUM(...CATEGORIES),
        allowNull: false,
      },
      // De-identified prose (Rule 8): the client is identified by userId only.
      statement: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      // Optional machine-readable payload for a future structured consumer.
      structured: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      // 'proposed' is the default because the machine-authored path is the common
      // one, and it must never be able to write an active row by omission.
      status: {
        type: Sequelize.ENUM(...STATUSES),
        allowNull: false,
        defaultValue: 'proposed',
      },
      // Bi-temporal validity: when the fact became true about the client.
      validFrom: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      // When it stopped being true. NULL = still true.
      validTo: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      // When we recorded that it stopped being true (distinct from validTo).
      invalidatedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      // The fact that replaced this one, when there was one.
      invalidatedByFactId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: TABLE, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      sourceType: {
        type: Sequelize.ENUM(...SOURCE_TYPES),
        allowNull: false,
      },
      // IDs only — {conversationId, sessionId, ...}. Never transcript text.
      sourceRef: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdByUserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // NULL until a human approves. This column is the audit trail for the
      // trainer-indispensability invariant.
      approvedByUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // The two read paths: the prompt read (userId + status) and the review
    // queue / category filter (userId + category + status).
    await queryInterface.addIndex(TABLE, ['userId', 'status'], {
      name: 'coach_facts_user_status',
    });
    await queryInterface.addIndex(TABLE, ['userId', 'category', 'status'], {
      name: 'coach_facts_user_cat_status',
    });
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface))) return;

    await queryInterface.dropTable(TABLE);

    // Postgres keeps ENUM types after the owning table is dropped; leaving them
    // behind makes a re-run of up() fail with "type already exists".
    for (const enumName of [
      'enum_coach_facts_category',
      'enum_coach_facts_status',
      'enum_coach_facts_sourceType',
    ]) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${enumName}";`);
    }
  },
};
