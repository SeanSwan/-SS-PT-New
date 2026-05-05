/**
 * Migration: Phase 5 Slice 5.1 — PLAUD Applaud auto-ingestion schema
 * ====================================================================
 *
 * Additive schema for PLAUD Auto-Ingestion via Applaud webhook.
 *
 * Plan: PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md §7.1, §7.2.
 *
 * Adds:
 *   1. Three nullable/defaulted columns to plaud_clips:
 *        - clip_source        VARCHAR(32) NOT NULL DEFAULT 'manual_upload'
 *                              CHECK IN ('manual_upload', 'applaud_webhook')
 *        - clip_external_id   VARCHAR(255)  NULL  (Plaud's recording_id)
 *        - applaud_event_id   VARCHAR(255)  NULL  (Applaud's event_id, for tracing)
 *   2. Partial unique index on (clip_source, clip_external_id, user_id)
 *      WHERE clip_external_id IS NOT NULL — enables atomic ON CONFLICT
 *      dedup for webhook ingestion (CR-3) without affecting the existing
 *      manual_upload rows where clip_external_id is always NULL.
 *   3. New plaud_webhook_nonces table with composite primary key
 *      (source, nonce) — source-scoped per Codex CR-2. Insertion is
 *      atomic via INSERT ... ON CONFLICT DO NOTHING. expires_at index
 *      supports the 60-second cleanup cron added in plaudCronJobs.mjs.
 *
 * All changes are additive and non-breaking:
 *   - Existing plaud_clips rows automatically get clip_source='manual_upload'
 *     via the column default.
 *   - clip_external_id and applaud_event_id are nullable so existing rows
 *     remain valid without backfill.
 *   - The partial unique index only enforces uniqueness for new
 *     applaud_webhook rows (where clip_external_id is set).
 *   - plaud_webhook_nonces is a brand-new table; no impact on existing data.
 *
 * Schema preflight (Rule 58, 2026-05-04): plaud_clips already exists from
 * Slice 3.1 migration 20260504100000-create-plaud-clips.cjs. This migration
 * runs AFTER that one (filename ordering is timestamp-prefixed).
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Add columns to plaud_clips. Use IF NOT EXISTS pattern to make
      //    the migration idempotent (matches Slice 3.1 conventions).
      const [colCheck] = await queryInterface.sequelize.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'plaud_clips'
           AND column_name IN ('clip_source', 'clip_external_id', 'applaud_event_id')`,
        { transaction },
      );
      const existingCols = new Set((colCheck || []).map((r) => r.column_name));

      if (!existingCols.has('clip_source')) {
        await queryInterface.sequelize.query(
          `ALTER TABLE plaud_clips
           ADD COLUMN clip_source VARCHAR(32) NOT NULL DEFAULT 'manual_upload'
             CHECK (clip_source IN ('manual_upload', 'applaud_webhook'))`,
          { transaction },
        );
        console.log('[5.1] added plaud_clips.clip_source');
      }

      if (!existingCols.has('clip_external_id')) {
        await queryInterface.sequelize.query(
          `ALTER TABLE plaud_clips
           ADD COLUMN clip_external_id VARCHAR(255) NULL`,
          { transaction },
        );
        console.log('[5.1] added plaud_clips.clip_external_id');
      }

      if (!existingCols.has('applaud_event_id')) {
        await queryInterface.sequelize.query(
          `ALTER TABLE plaud_clips
           ADD COLUMN applaud_event_id VARCHAR(255) NULL`,
          { transaction },
        );
        console.log('[5.1] added plaud_clips.applaud_event_id');
      }

      // 2. Partial unique index for atomic ON CONFLICT dedup (CR-3).
      //    Only enforces uniqueness when clip_external_id IS NOT NULL,
      //    so manual uploads (NULL external_id) can coexist freely.
      const [idxCheck] = await queryInterface.sequelize.query(
        `SELECT indexname
         FROM pg_indexes
         WHERE schemaname = 'public'
           AND tablename = 'plaud_clips'
           AND indexname = 'idx_plaud_clips_external_id_source'`,
        { transaction },
      );
      if (!idxCheck || idxCheck.length === 0) {
        await queryInterface.sequelize.query(
          `CREATE UNIQUE INDEX idx_plaud_clips_external_id_source
           ON plaud_clips (clip_source, clip_external_id, user_id)
           WHERE clip_external_id IS NOT NULL`,
          { transaction },
        );
        console.log('[5.1] created idx_plaud_clips_external_id_source');
      }

      // 3. New plaud_webhook_nonces table (composite PK source-scoped per CR-2).
      const [tblCheck] = await queryInterface.sequelize.query(
        `SELECT to_regclass('public.plaud_webhook_nonces') AS exists`,
        { transaction },
      );
      if (!tblCheck[0]?.exists) {
        await queryInterface.sequelize.query(
          `CREATE TABLE plaud_webhook_nonces (
             source       VARCHAR(32)  NOT NULL,
             nonce        VARCHAR(64)  NOT NULL,
             received_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
             expires_at   TIMESTAMPTZ  NOT NULL,
             PRIMARY KEY (source, nonce)
           )`,
          { transaction },
        );
        console.log('[5.1] created plaud_webhook_nonces');

        await queryInterface.sequelize.query(
          `CREATE INDEX idx_plaud_webhook_nonces_expires_at
           ON plaud_webhook_nonces (expires_at)`,
          { transaction },
        );
        console.log('[5.1] created idx_plaud_webhook_nonces_expires_at');
      }

      await transaction.commit();
      console.log('[5.1] Phase 5 Applaud source columns migration complete');
    } catch (err) {
      await transaction.rollback();
      console.error('[5.1] migration failed:', err.message);
      throw err;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `DROP TABLE IF EXISTS plaud_webhook_nonces CASCADE`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS idx_plaud_clips_external_id_source`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE plaud_clips
         DROP COLUMN IF EXISTS clip_source,
         DROP COLUMN IF EXISTS clip_external_id,
         DROP COLUMN IF EXISTS applaud_event_id`,
        { transaction },
      );
      await transaction.commit();
      console.log('[5.1] Phase 5 columns + nonce table dropped');
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
