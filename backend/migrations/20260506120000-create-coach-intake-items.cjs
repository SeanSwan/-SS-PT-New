/**
 * Migration: Create Coach intake queue tables
 * ===========================================
 *
 * Canonical queue foundation for Swan Coach voice-first intake. This stores
 * encrypted trainer/admin notes and audit events without replacing the
 * existing PLAUD clip / merge tables.
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT to_regclass('public.coach_intake_items') AS exists`,
        { transaction },
      );
      if (rows[0]?.exists) {
        console.log('coach_intake_items already exists (continuing table checks)');
      }

      await queryInterface.sequelize.query(
        `CREATE TABLE IF NOT EXISTS coach_intake_items (
           id                    UUID PRIMARY KEY,
           user_id               INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
           created_by_user_id    INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
           source_type           VARCHAR(32) NOT NULL
             CHECK (source_type IN (
               'voice_note','plaud_clip','audio_upload','transcript_file',
               'pdf_transcript','typed_note','chat_narrative'
             )),
           source_ref            TEXT,
           legacy_ref            TEXT,
           status                VARCHAR(32) NOT NULL DEFAULT 'RECEIVED'
             CHECK (status IN (
               'RECEIVED','STORED','TRANSCRIBING','TRANSCRIBED','REDACTED',
               'ANALYZED','GROUPED','NEEDS_CLARIFICATION','READY_FOR_REVIEW',
               'DUPLICATE_HOLD','APPROVED','APPLIED','FAILED','ARCHIVED'
             )),
           resolved_client_id    INTEGER REFERENCES "Users"(id),
           recorded_at_start     TIMESTAMPTZ,
           recorded_at_end       TIMESTAMPTZ,
           uploaded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
           active_bundle_id      UUID,
           payload_cipher        BYTEA,
           payload_iv            BYTEA,
           payload_tag           BYTEA,
           cipher_key_id         VARCHAR(64),
           metadata_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
           resolver_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
           duplicate_scan_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
           latest_proposal_id    UUID,
           error_code            VARCHAR(64),
           error_detail_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
           idempotency_key       VARCHAR(255),
           archived_at           TIMESTAMPTZ,
           created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
           updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
         )`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS coach_intake_items_idempotency_idx
           ON coach_intake_items (user_id, idempotency_key)
           WHERE idempotency_key IS NOT NULL`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS coach_intake_items_user_status_idx
           ON coach_intake_items (user_id, status, uploaded_at DESC)`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `CREATE TABLE IF NOT EXISTS coach_action_proposals (
           id                    UUID PRIMARY KEY,
           created_by_user_id    INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
           conversation_id       INTEGER,
           source_message_id     VARCHAR(128),
           proposal_type         VARCHAR(40) NOT NULL
             CHECK (proposal_type IN (
               'client_onboarding','workout_log','client_data_update','frontend_dispatch',
               'clarification','split_plan'
             )),
           status                VARCHAR(24) NOT NULL DEFAULT 'PENDING'
             CHECK (status IN ('PENDING','APPLYING','APPROVED','APPLIED','REJECTED','FAILED')),
           schema_version        VARCHAR(32) NOT NULL,
           summary_json          JSONB NOT NULL DEFAULT '{}'::jsonb,
           proposal_cipher       BYTEA NOT NULL,
           proposal_iv           BYTEA NOT NULL,
           proposal_tag          BYTEA NOT NULL,
           cipher_key_id         VARCHAR(64) NOT NULL,
           applied_result_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
           error_code            VARCHAR(64),
           error_detail_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
           created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
           updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
         )`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE coach_action_proposals
           DROP CONSTRAINT IF EXISTS coach_action_proposals_proposal_type_check`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE coach_action_proposals
           ADD CONSTRAINT coach_action_proposals_proposal_type_check
           CHECK (proposal_type IN (
             'client_onboarding','workout_log','client_data_update','frontend_dispatch',
             'clarification','split_plan'
           ))`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE coach_action_proposals
           DROP CONSTRAINT IF EXISTS coach_action_proposals_status_check`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE coach_action_proposals
           ADD CONSTRAINT coach_action_proposals_status_check
           CHECK (status IN ('PENDING','APPLYING','APPROVED','APPLIED','REJECTED','FAILED'))`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS coach_action_proposals_user_status_idx
           ON coach_action_proposals (created_by_user_id, status, created_at DESC)`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `CREATE TABLE IF NOT EXISTS coach_intake_events (
           id                 UUID PRIMARY KEY,
           intake_item_id     UUID NOT NULL REFERENCES coach_intake_items(id) ON DELETE CASCADE,
           actor_type         VARCHAR(16) NOT NULL
             CHECK (actor_type IN ('user','system','model','webhook')),
           actor_id           VARCHAR(64),
           event_type         VARCHAR(32) NOT NULL,
           correlation_id     VARCHAR(128),
           idempotency_key    VARCHAR(255),
           event_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
           created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
         )`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS coach_intake_events_item_created_idx
           ON coach_intake_events (intake_item_id, created_at DESC)`,
        { transaction },
      );

      await transaction.commit();
      console.log('coach_intake_items, coach_action_proposals, and coach_intake_events ready');
    } catch (err) {
      await transaction.rollback();
      console.error('coach_intake_items migration failed:', err.message);
      throw err;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `DROP TABLE IF EXISTS coach_action_proposals CASCADE`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `DROP TABLE IF EXISTS coach_intake_events CASCADE`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `DROP TABLE IF EXISTS coach_intake_items CASCADE`,
        { transaction },
      );
      await transaction.commit();
      console.log('coach_intake_items and coach_intake_events dropped');
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
