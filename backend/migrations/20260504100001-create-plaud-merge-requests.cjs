/**
 * Migration: Create `plaud_merge_requests` (Phase 3 Slice 3.1)
 * =============================================================
 *
 * Durable merge state for the PLAUD multi-clip merge workflow. Each row
 * represents one merge attempt (2-5 clips → one merged audio → transcribe →
 * parse → review → approve).
 *
 * v3.3 plan reference: §4.2
 * Schema preflight (Rule 58, 2026-05-04): caught two drifts vs the plan:
 *   - DailyWorkoutForm.id is UUID, not INTEGER (plan said INTEGER)
 *   - Table is `daily_workout_forms` (snake_case), not `"DailyWorkoutForms"`
 *   These corrections are applied here.
 *
 * Status state machine (v3.1 Codex Round 2 HIGH #1 + Round 4 MEDIUM #3):
 *   processing  -> row inserted before ffmpeg starts (failsafe recovery anchor)
 *   completed   -> parse succeeded, awaiting trainer review
 *   failed      -> ffmpeg/transcribe/parse error, error_code populated
 *   approved    -> trainer confirmed, workout logged, cipher purged
 *   discarded   -> trainer rejected, cipher purged
 *   expired     -> 24h TTL hit, cipher purged
 *
 * Encryption (v3.1 Codex Round 2 CRIT #2 fix):
 *   Single combined `payload_cipher` column holds AES-256-GCM-encrypted
 *   JSON `{ transcript, parsedWorkout }`. One IV+tag per row prevents IV
 *   reuse across two plaintexts (the original two-cipher-one-IV design
 *   was GCM-unsafe).
 *
 * Key rotation: cipher_key_id stores the version tag (e.g. 'V2') that
 * identifies which env var holds the encryption key. Decrypt loads
 * PLAUD_TRANSCRIPT_ENCRYPTION_KEY_<cipher_key_id>.
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT to_regclass('public.plaud_merge_requests') AS exists`,
        { transaction },
      );
      if (rows[0]?.exists) {
        console.log('plaud_merge_requests already exists (no-op)');
        await transaction.commit();
        return;
      }

      await queryInterface.sequelize.query(
        `CREATE TABLE plaud_merge_requests (
           id                       BIGSERIAL PRIMARY KEY,
           merge_request_id         UUID UNIQUE NOT NULL,
           user_id                  INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
           client_id                INTEGER NOT NULL REFERENCES "Users"(id),
           clip_ids                 JSONB NOT NULL,
           status                   VARCHAR(24) NOT NULL DEFAULT 'processing'
             CHECK (status IN ('processing','completed','failed','approved','discarded','expired')),
           transcript_hash          CHAR(64),
           payload_cipher           BYTEA,
           payload_iv               BYTEA,
           payload_tag              BYTEA,
           cipher_key_id            VARCHAR(64),
           error_code               VARCHAR(48),
           boundary_warning         JSONB,
           parsed_exercise_count    INTEGER,
           approved_workout_form_id UUID REFERENCES daily_workout_forms(id),
           created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
           completed_at             TIMESTAMPTZ,
           approved_at              TIMESTAMPTZ,
           expires_at               TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
           cipher_purged_at         TIMESTAMPTZ
         )`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `CREATE INDEX plaud_merge_requests_user_status_idx
           ON plaud_merge_requests (user_id, status, created_at DESC)`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `CREATE INDEX plaud_merge_requests_expires_idx
           ON plaud_merge_requests (expires_at)
           WHERE cipher_purged_at IS NULL`,
        { transaction },
      );

      await transaction.commit();
      console.log('plaud_merge_requests created');
    } catch (err) {
      await transaction.rollback();
      console.error('plaud_merge_requests migration failed:', err.message);
      throw err;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `DROP TABLE IF EXISTS plaud_merge_requests CASCADE`,
        { transaction },
      );
      await transaction.commit();
      console.log('plaud_merge_requests dropped');
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
