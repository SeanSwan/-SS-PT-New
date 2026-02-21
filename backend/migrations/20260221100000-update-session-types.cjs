'use strict';

/**
 * Replace default session types with the owner's actual offerings:
 *   1. Personal Training – 60 min
 *   2. Personal Training – 30 min
 *   3. Intro Session – 60 min
 *   4. Intro Session – 30 min
 *   5. Intro Session – 45 min
 *
 * Soft-deletes old types that no longer match, then upserts the new ones.
 */
const NEW_SESSION_TYPES = [
  {
    name: 'Personal Training – 60 min',
    description: 'Standard 60-minute personal training session',
    duration: 60,
    bufferBefore: 0,
    bufferAfter: 15,
    color: '#00FFFF',
    isActive: true,
    sortOrder: 1
  },
  {
    name: 'Personal Training – 30 min',
    description: 'Express 30-minute personal training session',
    duration: 30,
    bufferBefore: 0,
    bufferAfter: 10,
    color: '#00A0E3',
    isActive: true,
    sortOrder: 2
  },
  {
    name: 'Intro Session – 60 min',
    description: '60-minute introductory session for new clients',
    duration: 60,
    bufferBefore: 0,
    bufferAfter: 15,
    color: '#7851A9',
    isActive: true,
    sortOrder: 3
  },
  {
    name: 'Intro Session – 30 min',
    description: '30-minute introductory session for new clients',
    duration: 30,
    bufferBefore: 0,
    bufferAfter: 10,
    color: '#00FF88',
    isActive: true,
    sortOrder: 4
  },
  {
    name: 'Intro Session – 45 min',
    description: '45-minute introductory session for new clients',
    duration: 45,
    bufferBefore: 0,
    bufferAfter: 10,
    color: '#FF6B6B',
    isActive: true,
    sortOrder: 5
  }
];

module.exports = {
  async up(queryInterface) {
    console.log('🔧 Updating session types to owner-defined offerings...');

    const now = new Date();

    // 1. Soft-delete all existing session types (preserve FK references)
    await queryInterface.sequelize.query(`
      UPDATE session_types
      SET "isActive" = false, "deletedAt" = NOW()
      WHERE "deletedAt" IS NULL;
    `);
    console.log('   Soft-deleted old session types');

    // 2. Insert new session types
    for (const st of NEW_SESSION_TYPES) {
      await queryInterface.sequelize.query(`
        INSERT INTO session_types
          (name, description, duration, "bufferBefore", "bufferAfter", color, "isActive", "sortOrder", "createdAt", "updatedAt")
        VALUES
          (:name, :description, :duration, :bufferBefore, :bufferAfter, :color, :isActive, :sortOrder, :now, :now);
      `, {
        replacements: { ...st, now }
      });
      console.log(`   ✅ Created: ${st.name}`);
    }

    console.log('🎉 Session types updated successfully');
  },

  async down(queryInterface) {
    // Re-activate old types and remove new ones
    await queryInterface.sequelize.query(`
      DELETE FROM session_types
      WHERE name IN (
        'Personal Training – 60 min',
        'Personal Training – 30 min',
        'Intro Session – 60 min',
        'Intro Session – 30 min',
        'Intro Session – 45 min'
      );
    `);
    await queryInterface.sequelize.query(`
      UPDATE session_types
      SET "isActive" = true, "deletedAt" = NULL
      WHERE "deletedAt" IS NOT NULL;
    `);
  }
};
