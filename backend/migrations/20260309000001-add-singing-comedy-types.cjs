'use strict';

/**
 * Add 'singing' and 'comedy' to SocialPosts type ENUM and Challenges category ENUM.
 */
module.exports = {
  async up(queryInterface) {
    // Add to SocialPosts type ENUM
    for (const val of ['singing', 'comedy']) {
      try {
        await queryInterface.sequelize.query(
          `ALTER TYPE "enum_SocialPosts_type" ADD VALUE IF NOT EXISTS '${val}';`
        );
        console.log(`Added '${val}' to SocialPosts type ENUM.`);
      } catch (err) {
        console.log(`Could not add '${val}' to SocialPosts: ${err.message}`);
      }
    }

    // Add to Challenges category ENUM
    for (const val of ['singing', 'comedy']) {
      try {
        await queryInterface.sequelize.query(
          `ALTER TYPE "enum_challenges_category" ADD VALUE IF NOT EXISTS '${val}';`
        );
        console.log(`Added '${val}' to challenges category ENUM.`);
      } catch (err) {
        console.log(`Could not add '${val}' to challenges: ${err.message}`);
      }
    }

    console.log('✅ Singing + Comedy types migration complete.');
  },

  async down() {
    // PostgreSQL cannot remove ENUM values — intentional no-op
    console.log('Down migration: no-op (PostgreSQL ENUM values cannot be removed).');
  },
};
