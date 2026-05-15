'use strict';

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [columns] = await queryInterface.sequelize.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'plaud_clips'
           AND column_name = 'recorded_at'`,
        { transaction },
      );
      if (!columns || columns.length === 0) {
        await queryInterface.sequelize.query(
          `ALTER TABLE plaud_clips ADD COLUMN recorded_at TIMESTAMPTZ NULL`,
          { transaction },
        );
      }

      const [indexes] = await queryInterface.sequelize.query(
        `SELECT indexname
         FROM pg_indexes
         WHERE schemaname = 'public'
           AND tablename = 'plaud_clips'
           AND indexname = 'idx_plaud_clips_recorded_at'`,
        { transaction },
      );
      if (!indexes || indexes.length === 0) {
        await queryInterface.sequelize.query(
          `CREATE INDEX idx_plaud_clips_recorded_at ON plaud_clips (user_id, recorded_at DESC)
           WHERE recorded_at IS NOT NULL`,
          { transaction },
        );
      }
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

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_plaud_clips_recorded_at', { transaction });
      await queryInterface.sequelize.query(
        `UPDATE plaud_clips SET clip_source = 'manual_upload'
         WHERE clip_source = 'applaud_local_sync'`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE plaud_clips DROP CONSTRAINT IF EXISTS plaud_clips_clip_source_check',
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE plaud_clips ADD CONSTRAINT plaud_clips_clip_source_check
         CHECK (clip_source IN ('manual_upload', 'applaud_webhook'))`,
        { transaction },
      );
      await queryInterface.sequelize.query('ALTER TABLE plaud_clips DROP COLUMN IF EXISTS recorded_at', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
