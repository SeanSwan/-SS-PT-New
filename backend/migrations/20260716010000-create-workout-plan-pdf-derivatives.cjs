/**
 * ============================================================================
 * FILE: 20260716010000-create-workout-plan-pdf-derivatives.cjs
 * PURPOSE: Add the durable revision-bound workout-plan PDF outbox.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [rows] = await queryInterface.sequelize.query(
        "SELECT to_regclass('public.workout_plan_pdf_derivatives') AS exists",
        { transaction },
      );
      if (rows[0]?.exists) return;

      await queryInterface.sequelize.query([
        'CREATE TABLE workout_plan_pdf_derivatives (',
        '  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
        '  plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,',
        '  source_revision INTEGER NOT NULL CHECK (source_revision > 0),',
        "  source_hash CHAR(64) NOT NULL CHECK (source_hash ~ '^[a-f0-9]{64}$'),",
        "  render_hash CHAR(64) NOT NULL CHECK (render_hash ~ '^[a-f0-9]{64}$'),",
        '  renderer_version VARCHAR(80) NOT NULL,',
        '  brand_key VARCHAR(64) NOT NULL,',
        "  source_type VARCHAR(16) NOT NULL CHECK (source_type IN ('generated','manual')),",
        "  state VARCHAR(16) NOT NULL CHECK (state IN ('pending','rendering','ready','failed','superseded')),",
        '  idempotency_key VARCHAR(512) NOT NULL UNIQUE,',
        '  reason VARCHAR(64) NOT NULL,',
        '  requested_by INTEGER REFERENCES "Users"(id) ON DELETE SET NULL,',
        '  promote_generated BOOLEAN NOT NULL DEFAULT FALSE,',
        '  needs_review BOOLEAN NOT NULL DEFAULT FALSE,',
        '  attempt_count SMALLINT NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),',
        '  safe_error_code VARCHAR(80),',
        '  storage_key TEXT,',
        '  byte_size BIGINT CHECK (byte_size IS NULL OR byte_size > 0),',
        "  checksum CHAR(64) CHECK (checksum IS NULL OR checksum ~ '^[a-f0-9]{64}$'),",
        '  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),',
        '  claimed_at TIMESTAMPTZ,',
        '  ready_at TIMESTAMPTZ,',
        '  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),',
        '  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
        ')',
      ].join('\n'), { transaction });

      await queryInterface.sequelize.query([
        'CREATE INDEX workout_plan_pdf_derivatives_claim_idx',
        'ON workout_plan_pdf_derivatives (next_attempt_at, created_at)',
        "WHERE state IN ('pending','failed')",
      ].join('\n'), { transaction });
      await queryInterface.sequelize.query([
        'CREATE INDEX workout_plan_pdf_derivatives_plan_idx',
        'ON workout_plan_pdf_derivatives (plan_id, created_at DESC)',
      ].join('\n'), { transaction });
      await queryInterface.sequelize.query([
        'CREATE INDEX workout_plan_pdf_derivatives_manual_review_idx',
        'ON workout_plan_pdf_derivatives (plan_id, source_type, needs_review)',
        "WHERE source_type = 'manual' AND state = 'ready'",
      ].join('\n'), { transaction });

      // Unknown legacy provenance is classified conservatively as manual so the
      // new worker can never silently replace a trainer-uploaded custom file.
      await queryInterface.sequelize.query([
        'INSERT INTO workout_plan_pdf_derivatives (',
        '  plan_id, source_revision, source_hash, render_hash, renderer_version,',
        '  brand_key, source_type, state, idempotency_key, reason, needs_review,',
        '  storage_key, byte_size, ready_at, next_attempt_at, created_at, updated_at',
        ')',
        'SELECT p.id,',
        '  GREATEST(COALESCE(p.content_revision, 1), 1),',
        "  CASE WHEN p.content_hash ~ '^[a-f0-9]{64}$' THEN LOWER(p.content_hash)",
        "       ELSE REPEAT('0', 64) END,",
        "  md5(COALESCE(p.metadata->'planPdf'->>'storageKey', p.id::text)) ||",
        "    md5(COALESCE(p.metadata->'planPdf'->>'storageKey', p.id::text)),",
        "  'legacy-metadata-v1', 'legacy', 'manual', 'ready',",
        "  p.id::text || ':legacy:' || md5(p.metadata->'planPdf'->>'storageKey'),",
        "  'legacy_backfill', TRUE,",
        "  p.metadata->'planPdf'->>'storageKey',",
        "  CASE WHEN p.metadata->'planPdf'->>'size' ~ '^[1-9][0-9]*$'",
        "       THEN (p.metadata->'planPdf'->>'size')::BIGINT ELSE NULL END,",
        '  CASE WHEN pg_input_is_valid(p.metadata->\'planPdf\'->>\'updatedAt\', \'timestamptz\')',
        '       THEN (p.metadata->\'planPdf\'->>\'updatedAt\')::TIMESTAMPTZ',
        '       ELSE p."updatedAt" END,',
        '  NOW(), p."createdAt", NOW()',
        'FROM workout_plans p',
        "WHERE COALESCE(p.metadata->'planPdf'->>'storageKey', '') <> ''",
        'ON CONFLICT (idempotency_key) DO NOTHING',
      ].join('\n'), { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'DROP TABLE IF EXISTS workout_plan_pdf_derivatives',
        { transaction },
      );
    });
  },
};
