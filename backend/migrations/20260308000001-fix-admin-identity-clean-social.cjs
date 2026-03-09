'use strict';

/**
 * Fix admin user identity and clean social seed data.
 * - Updates admin user name to "Sean Swan" if it's currently incorrect
 * - Removes all existing seed social posts for clean re-seed
 * - Removes all existing seed challenges for clean re-seed
 */
module.exports = {
  async up(queryInterface) {
    // Fix admin name to Sean Swan
    const [adminResult] = await queryInterface.sequelize.query(
      `SELECT id, "firstName", "lastName" FROM "Users"
       WHERE email = 'loveswanstudios@protonmail.com' LIMIT 1;`
    );

    if (adminResult.length) {
      const admin = adminResult[0];
      if (admin.firstName !== 'Sean' || admin.lastName !== 'Swan') {
        console.log(`Fixing admin name from "${admin.firstName} ${admin.lastName}" to "Sean Swan"`);
        await queryInterface.sequelize.query(
          `UPDATE "Users" SET "firstName" = 'Sean', "lastName" = 'Swan'
           WHERE email = 'loveswanstudios@protonmail.com';`
        );
      } else {
        console.log('Admin name is already "Sean Swan" — no change needed.');
      }
    } else {
      console.log('Admin user not found by email — skipping name fix.');
    }

    // Clean ALL social posts (clean slate as requested)
    try {
      const [postCount] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) AS cnt FROM "SocialPosts";`
      );
      const count = parseInt(postCount[0].cnt);
      if (count > 0) {
        await queryInterface.sequelize.query(`DELETE FROM "SocialPosts";`);
        console.log(`Deleted ${count} social posts for clean slate.`);
      }
    } catch (err) {
      console.log('SocialPosts table may not exist yet:', err.message);
    }

    // Clean ALL social comments
    try {
      await queryInterface.sequelize.query(`DELETE FROM "SocialComments";`);
      console.log('Cleared social comments.');
    } catch (err) {
      console.log('SocialComments cleanup skipped:', err.message);
    }

    // Clean ALL social likes
    try {
      await queryInterface.sequelize.query(`DELETE FROM "SocialLikes";`);
      console.log('Cleared social likes.');
    } catch (err) {
      console.log('SocialLikes cleanup skipped:', err.message);
    }

    // Clean seed challenges
    try {
      await queryInterface.sequelize.query(
        `DELETE FROM "challenges" WHERE "description" LIKE '%[seed]%';`
      );
      console.log('Cleared seed challenges for re-creation.');
    } catch (err) {
      console.log('Challenges cleanup skipped:', err.message);
    }

    console.log('✅ Admin identity fixed, social slate cleaned. Re-run seeder to populate fresh content.');
  },

  async down() {
    // Irreversible — social content was already cleaned
    console.log('Down migration: no-op (social data was cleaned).');
  },
};
