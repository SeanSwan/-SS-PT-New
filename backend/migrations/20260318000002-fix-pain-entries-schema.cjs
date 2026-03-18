'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('client_pain_entries').catch(() => null);
    if (!tableInfo) {
      console.log('[Migration] client_pain_entries table does not exist, skipping');
      return;
    }

    // Fix createdById to allow NULL (model says allowNull: true, migration had allowNull: false)
    if (tableInfo.createdById) {
      await queryInterface.changeColumn('client_pain_entries', 'createdById', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }).catch(err => console.log('[Migration] createdById change skipped:', err.message));
    }

    // Convert ENUM columns to VARCHAR to match model (avoids PostgreSQL ENUM alter issues)
    // side: ENUM → VARCHAR(20)
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE client_pain_entries
        ALTER COLUMN "side" TYPE VARCHAR(20) USING "side"::VARCHAR;
      `);
      console.log('[Migration] Converted side from ENUM to VARCHAR');
    } catch (err) {
      console.log('[Migration] side conversion skipped:', err.message);
    }

    // painType: ENUM → VARCHAR(30)
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE client_pain_entries
        ALTER COLUMN "painType" TYPE VARCHAR(30) USING "painType"::VARCHAR;
      `);
      console.log('[Migration] Converted painType from ENUM to VARCHAR');
    } catch (err) {
      console.log('[Migration] painType conversion skipped:', err.message);
    }

    // posturalSyndrome: ENUM → VARCHAR(30)
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE client_pain_entries
        ALTER COLUMN "posturalSyndrome" TYPE VARCHAR(30) USING "posturalSyndrome"::VARCHAR;
      `);
      console.log('[Migration] Converted posturalSyndrome from ENUM to VARCHAR');
    } catch (err) {
      console.log('[Migration] posturalSyndrome conversion skipped:', err.message);
    }

    // Clean up old ENUM types if they exist
    try {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_client_pain_entries_side";');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_client_pain_entries_painType";');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_client_pain_entries_posturalSyndrome";');
      console.log('[Migration] Cleaned up old ENUM types');
    } catch (err) {
      console.log('[Migration] ENUM cleanup skipped:', err.message);
    }
  },

  async down() {
    // Converting back to ENUM is complex and error-prone; intentionally a no-op
    console.log('[Migration] Rollback is a no-op for ENUM→VARCHAR conversion');
  },
};
