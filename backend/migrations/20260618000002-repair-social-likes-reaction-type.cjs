'use strict';

/**
 * Repair SocialLikes reaction schema drift.
 *
 * Production can have the base SocialLikes table from the legacy social
 * migration while still missing the later reactionType column. The mounted
 * /api/social/posts/feed route calls SocialLike reaction helpers that select
 * and group by reactionType, so this repair converges the database schema with
 * the canonical SocialLike model without touching existing reactions.
 */
const TABLE_NAME = 'SocialLikes';
const REACTION_COLUMN = 'reactionType';
const UNIQUE_LIKE_INDEX = 'unique_like';
const UNIQUE_REACTION_INDEX = 'unique_reaction';

async function socialLikesTableExists(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = '${TABLE_NAME}'
    LIMIT 1
  `);

  return rows.length > 0;
}

async function indexExists(queryInterface, indexName) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = :tableName
      AND indexname = :indexName
    LIMIT 1
  `, {
    replacements: {
      tableName: TABLE_NAME,
      indexName,
    },
  });

  return rows.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await socialLikesTableExists(queryInterface))) {
      console.log('SocialLikes table is absent; reactionType repair is a no-op.');
      return;
    }

    const columns = await queryInterface.describeTable(TABLE_NAME);
    if (!columns[REACTION_COLUMN]) {
      await queryInterface.addColumn(TABLE_NAME, REACTION_COLUMN, {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: 'swan',
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE "${TABLE_NAME}"
      SET "${REACTION_COLUMN}" = 'swan'
      WHERE "${REACTION_COLUMN}" IS NULL
    `);

    await queryInterface.changeColumn(TABLE_NAME, REACTION_COLUMN, {
      type: Sequelize.STRING(16),
      allowNull: false,
      defaultValue: 'swan',
    });

    if (await indexExists(queryInterface, UNIQUE_LIKE_INDEX)) {
      await queryInterface.removeIndex(TABLE_NAME, UNIQUE_LIKE_INDEX);
    }

    if (!(await indexExists(queryInterface, UNIQUE_REACTION_INDEX))) {
      await queryInterface.addIndex(TABLE_NAME, {
        fields: ['userId', 'targetType', 'targetId', REACTION_COLUMN],
        unique: true,
        name: UNIQUE_REACTION_INDEX,
      });
    }
  },

  async down() {
    console.log('SocialLikes reactionType repair down migration is intentionally a no-op.');
  },
};
