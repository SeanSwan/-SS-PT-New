'use strict';

/**
 * Add reactionType to SocialLikes table.
 * Supports three reaction types: thumbs_up, heart, swan.
 * Changes unique constraint to allow one reaction of each type per user per post.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add reactionType column (default 'swan' for existing likes)
    try {
      await queryInterface.addColumn('SocialLikes', 'reactionType', {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: 'swan',
      });
      console.log('Added reactionType column to SocialLikes.');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
        console.log('reactionType column already exists — skipping.');
      } else {
        throw err;
      }
    }

    // 2. Drop old unique constraint and create new one that includes reactionType
    try {
      await queryInterface.removeIndex('SocialLikes', 'unique_like');
      console.log('Removed old unique_like index.');
    } catch (err) {
      console.log('Old unique_like index may not exist:', err.message);
    }

    try {
      await queryInterface.addIndex('SocialLikes', {
        fields: ['userId', 'targetType', 'targetId', 'reactionType'],
        unique: true,
        name: 'unique_reaction',
      });
      console.log('Created new unique_reaction index.');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('unique_reaction index already exists — skipping.');
      } else {
        throw err;
      }
    }

    console.log('✅ Reaction types migration complete.');
  },

  async down(queryInterface, Sequelize) {
    // Remove new index
    try {
      await queryInterface.removeIndex('SocialLikes', 'unique_reaction');
    } catch (err) {
      console.log('Could not remove unique_reaction:', err.message);
    }

    // Remove column
    try {
      await queryInterface.removeColumn('SocialLikes', 'reactionType');
    } catch (err) {
      console.log('Could not remove reactionType column:', err.message);
    }

    // Restore old unique constraint
    try {
      await queryInterface.addIndex('SocialLikes', {
        fields: ['userId', 'targetType', 'targetId'],
        unique: true,
        name: 'unique_like',
      });
    } catch (err) {
      console.log('Could not restore unique_like:', err.message);
    }
  },
};
