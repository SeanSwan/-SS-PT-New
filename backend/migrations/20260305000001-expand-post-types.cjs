'use strict';

/**
 * Expand SocialPosts.type ENUM to include creative post types:
 * creative, dance, music, art, gaming
 *
 * PostgreSQL ALTER TYPE ... ADD VALUE is idempotent with IF NOT EXISTS.
 */
module.exports = {
  async up(queryInterface) {
    const newValues = ['creative', 'dance', 'music', 'art', 'gaming'];
    for (const val of newValues) {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_SocialPosts_type" ADD VALUE IF NOT EXISTS '${val}';`
      );
    }
  },

  async down() {
    // PostgreSQL does not support removing values from an ENUM.
    // To reverse, you'd recreate the type — intentionally left as no-op.
  },
};
