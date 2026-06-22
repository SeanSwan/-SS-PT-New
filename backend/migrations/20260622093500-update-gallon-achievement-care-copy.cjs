'use strict';

const CARE_TITLE = 'Hydration Check-In';
const CARE_DESCRIPTION = 'Log a hydration check-in for one day';

module.exports = {
  async up(queryInterface) {
    const [tables] = await queryInterface.sequelize.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = 'Achievements';`
    );

    if (tables.length === 0) {
      console.log('Achievements table not found; skipping hydration badge copy update.');
      return;
    }

    await queryInterface.sequelize.query(
      `UPDATE "Achievements"
       SET "title" = :title,
           "description" = :description,
           "updatedAt" = NOW()
       WHERE name = 'gallon_a_day';`,
      {
        replacements: {
          title: CARE_TITLE,
          description: CARE_DESCRIPTION,
        },
      }
    );

    console.log('Updated hydration badge copy for care-first achievement language.');
  },

  async down() {
    console.log('No-op: care-first achievement copy is intentionally retained.');
  },
};
