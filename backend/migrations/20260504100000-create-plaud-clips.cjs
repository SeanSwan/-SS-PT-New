/**
 * Migration: Create `plaud_clips` (Phase 3 Slice 3.1)
 * ====================================================
 *
 * Durable metadata for PLAUD wristband audio clips uploaded by trainers
 * for the multi-clip merge ingestion workflow.
 *
 * v3.3 plan reference: §4.1
 * Schema preflight (Rule 58, 2026-05-04): Users table is "Users"
 * (PascalCase, double-quoted in raw SQL).
 *
 * Status state machine (v3.2 — Codex Round 3 HIGH #2):
 *   uploading      -> bytes pending; not yet eligible for merge
 *   pending_merge  -> bytes on disk + mirror_job created; mergeable
 *   merged         -> consumed by a merge_request
 *   expired        -> past 24h TTL
 *   deleted        -> soft-deleted by user
 *   lost           -> abandoned (uploading >5min, or disk eviction without R2)
 *
 * R2 mirror status (v3.1 — Codex Round 2 CRIT #3):
 *   pending          -> awaiting first upload attempt
 *   in_flight        -> worker has picked it up
 *   mirrored         -> R2 upload succeeded
 *   failed_retryable -> upload failed, will retry per backoff
 *   failed_terminal  -> max attempts hit; alert logged
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT to_regclass('public.plaud_clips') AS exists`,
        { transaction },
      );
      if (rows[0]?.exists) {
        console.log('plaud_clips already exists (no-op)');
        await transaction.commit();
        return;
      }

      await queryInterface.sequelize.query(
        `CREATE TABLE plaud_clips (
           id                BIGSERIAL PRIMARY KEY,
           clip_id           UUID UNIQUE NOT NULL,
           user_id           INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
           client_id         INTEGER REFERENCES "Users"(id),
           filename_original VARCHAR(255) NOT NULL,
           storage_ext       VARCHAR(8)   NOT NULL,
           mimetype          VARCHAR(64)  NOT NULL,
           size_bytes        INTEGER      NOT NULL,
           duration_sec      NUMERIC(7,2),
           sha256            CHAR(64)     NOT NULL,
           disk_path         TEXT,
           r2_key            TEXT,
           r2_mirror_status  VARCHAR(24)  NOT NULL DEFAULT 'pending'
             CHECK (r2_mirror_status IN ('pending','in_flight','mirrored','failed_retryable','failed_terminal')),
           status            VARCHAR(24)  NOT NULL DEFAULT 'uploading'
             CHECK (status IN ('uploading','pending_merge','merged','expired','deleted','lost')),
           uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
           merged_at         TIMESTAMPTZ,
           expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
           deleted_at        TIMESTAMPTZ,
           created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
           updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
         )`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `CREATE INDEX plaud_clips_user_status_uploaded_idx
           ON plaud_clips (user_id, status, uploaded_at DESC)
           WHERE deleted_at IS NULL`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `CREATE INDEX plaud_clips_expires_idx
           ON plaud_clips (expires_at)
           WHERE deleted_at IS NULL`,
        { transaction },
      );

      await transaction.commit();
      console.log('plaud_clips created');
    } catch (err) {
      await transaction.rollback();
      console.error('plaud_clips migration failed:', err.message);
      throw err;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `DROP TABLE IF EXISTS plaud_clips CASCADE`,
        { transaction },
      );
      await transaction.commit();
      console.log('plaud_clips dropped');
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
