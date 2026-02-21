'use strict';

const resolveUsersTable = require('./helpers/resolveUsersTable.cjs');

/**
 * Rename the "admin" account (username='admin') from "Admin User" to "Sean Swan".
 * This is the owner's primary login, so the display name should match.
 */
module.exports = {
  async up(queryInterface) {
    const usersTable = await resolveUsersTable(queryInterface);
    console.log(`Updating admin display name in "${usersTable}" table...`);

    const [results] = await queryInterface.sequelize.query(
      `UPDATE "${usersTable}"
       SET "firstName" = 'Sean', "lastName" = 'Swan'
       WHERE username = 'admin'
       RETURNING id, "firstName", "lastName";`
    );

    if (results.length > 0) {
      console.log(`✅ Admin user (id=${results[0].id}) renamed to Sean Swan`);
    } else {
      console.log('⚠️ No user with username="admin" found — skipping');
    }
  },

  async down(queryInterface) {
    const usersTable = await resolveUsersTable(queryInterface);
    await queryInterface.sequelize.query(
      `UPDATE "${usersTable}"
       SET "firstName" = 'Admin', "lastName" = 'User'
       WHERE username = 'admin';`
    );
  }
};
