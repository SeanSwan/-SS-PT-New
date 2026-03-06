'use strict';

/**
 * Expand Challenges.category ENUM with creative/community categories:
 * dance, music, art, gaming, community_meetup
 */
module.exports = {
  async up(queryInterface) {
    const newValues = ['dance', 'music', 'art', 'gaming', 'community_meetup'];
    for (const val of newValues) {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_challenges_category" ADD VALUE IF NOT EXISTS '${val}';`
      );
    }
  },

  async down() {
    // PostgreSQL does not support removing values from an ENUM — intentional no-op.
  },
};
