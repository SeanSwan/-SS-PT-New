'use strict';

const SOURCES = [
  'manual_upload',
  'applaud_webhook',
  'applaud_local_sync',
  'plaud_official_sync',
];

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `ALTER TABLE plaud_clips
         DROP CONSTRAINT IF EXISTS plaud_clips_clip_source_check`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE plaud_clips
         ADD CONSTRAINT plaud_clips_clip_source_check
         CHECK (clip_source IN (${SOURCES.map((source) => `'${source}'`).join(', ')}))`,
        { transaction },
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `UPDATE plaud_clips
            SET clip_source = 'manual_upload'
          WHERE clip_source = 'plaud_official_sync'`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE plaud_clips
         DROP CONSTRAINT IF EXISTS plaud_clips_clip_source_check`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE plaud_clips
         ADD CONSTRAINT plaud_clips_clip_source_check
         CHECK (clip_source IN ('manual_upload', 'applaud_webhook', 'applaud_local_sync'))`,
        { transaction },
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
