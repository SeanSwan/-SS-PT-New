/**
 * ============================================================================
 * FILE: 20260716030000-create-support-issues.cjs
 * PURPOSE: Create durable Report Room issues and append-only event history.
 * SAFETY: Transactional, idempotent, reversible, explicit FK indexes/checks.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 */
"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [rows] = await queryInterface.sequelize.query(
        "SELECT to_regclass('public.support_issues') AS exists",
        { transaction },
      );
      if (rows[0]?.exists) return;

      await queryInterface.sequelize.query(
        [
          "CREATE TABLE support_issues (",
          "  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),",
          "  reference_code TEXT NOT NULL CONSTRAINT support_issues_reference_code_key UNIQUE CHECK (reference_code ~ '^SWR-[0-9]{8}-[A-F0-9]{8}$'),",
          '  reporter_user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE RESTRICT,',
          "  client_request_id UUID NOT NULL,",
          '  assigned_owner_user_id INTEGER REFERENCES "Users"(id) ON DELETE SET NULL,',
          "  duplicate_of_issue_id UUID REFERENCES support_issues(id) ON DELETE SET NULL,",
          "  category TEXT NOT NULL CHECK (category IN ('bug','error','access','billing','workout','account','performance','usability','content','other')),",
          "  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical','high','medium','low')),",
          "  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','triaged','in_progress','waiting_on_reporter','resolved','closed','duplicate')),",
          "  source TEXT NOT NULL DEFAULT 'text' CHECK (source IN ('text','voice','swan_coach','error_boundary')),",
          "  title TEXT NOT NULL CHECK (length(title) BETWEEN 4 AND 160),",
          "  description TEXT NOT NULL CHECK (length(description) BETWEEN 10 AND 8000),",
          "  expected_behavior TEXT CHECK (expected_behavior IS NULL OR length(expected_behavior) <= 4000),",
          "  impact TEXT CHECK (impact IS NULL OR length(impact) <= 4000),",
          "  reproduction_steps JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(reproduction_steps) = 'array'),",
          "  diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(diagnostics) = 'object'),",
          "  resolution_summary TEXT CHECK (resolution_summary IS NULL OR length(resolution_summary) <= 4000),",
          "  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),",
          "  first_response_at TIMESTAMPTZ,",
          "  resolved_at TIMESTAMPTZ,",
          "  closed_at TIMESTAMPTZ,",
          "  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),",
          "  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
          ")",
        ].join("\n"),
        { transaction },
      );

      await queryInterface.sequelize.query(
        [
          "CREATE TABLE support_issue_events (",
          "  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,",
          "  issue_id UUID NOT NULL REFERENCES support_issues(id) ON DELETE CASCADE,",
          '  actor_user_id INTEGER REFERENCES "Users"(id) ON DELETE SET NULL,',
          "  event_type TEXT NOT NULL CHECK (event_type IN ('created','reporter_reply','owner_reply','internal_note','triage_updated','resolved','closed','reopened','marked_duplicate')),",
          "  visibility TEXT NOT NULL CHECK (visibility IN ('reporter','owner')),",
          "  body TEXT CHECK (body IS NULL OR length(body) <= 8000),",
          "  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),",
          "  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
          ")",
        ].join("\n"),
        { transaction },
      );

      await queryInterface.sequelize.query(
        "CREATE INDEX support_issues_reporter_created_idx ON support_issues (reporter_user_id, created_at DESC)",
        { transaction },
      );
      await queryInterface.sequelize.query(
        "CREATE UNIQUE INDEX support_issues_reporter_request_key ON support_issues (reporter_user_id, client_request_id)",
        { transaction },
      );
      await queryInterface.sequelize.query(
        "CREATE INDEX support_issues_owner_queue_idx ON support_issues (status, severity, last_activity_at DESC) WHERE status NOT IN ('closed')",
        { transaction },
      );
      await queryInterface.sequelize.query(
        "CREATE INDEX support_issues_assignee_status_idx ON support_issues (assigned_owner_user_id, status)",
        { transaction },
      );
      await queryInterface.sequelize.query(
        "CREATE INDEX support_issue_events_issue_created_idx ON support_issue_events (issue_id, created_at)",
        { transaction },
      );
      await queryInterface.sequelize.query(
        "CREATE INDEX support_issue_events_actor_created_idx ON support_issue_events (actor_user_id, created_at)",
        { transaction },
      );
      await queryInterface.sequelize.query(
        [
          "CREATE OR REPLACE FUNCTION prevent_support_issue_event_mutation()",
          "RETURNS TRIGGER AS $$",
          "BEGIN",
          "  RAISE EXCEPTION 'support_issue_events is append-only' USING ERRCODE = '55000';",
          "END;",
          "$$ LANGUAGE plpgsql",
        ].join("\n"),
        { transaction },
      );
      await queryInterface.sequelize.query(
        [
          "CREATE TRIGGER support_issue_events_append_only",
          "BEFORE UPDATE OR DELETE ON support_issue_events",
          "FOR EACH ROW EXECUTE FUNCTION prevent_support_issue_event_mutation()",
        ].join("\n"),
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        "DROP TABLE IF EXISTS support_issue_events",
        { transaction },
      );
      await queryInterface.sequelize.query(
        "DROP TABLE IF EXISTS support_issues",
        { transaction },
      );
      await queryInterface.sequelize.query(
        "DROP FUNCTION IF EXISTS prevent_support_issue_event_mutation()",
        { transaction },
      );
    });
  },
};
