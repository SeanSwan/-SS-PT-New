/**
 * ============================================================================
 * FILE: supportIssueConstants.mjs
 * PURPOSE: Canonical Report Room workflow vocabulary shared by validation,
 *          models, services, and UI contracts.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 */
export const SUPPORT_ISSUE_CATEGORIES = Object.freeze([
  "bug",
  "error",
  "access",
  "billing",
  "workout",
  "account",
  "performance",
  "usability",
  "content",
  "other",
]);

export const SUPPORT_ISSUE_SEVERITIES = Object.freeze([
  "critical",
  "high",
  "medium",
  "low",
]);

export const SUPPORT_ISSUE_STATUSES = Object.freeze([
  "new",
  "triaged",
  "in_progress",
  "waiting_on_reporter",
  "resolved",
  "closed",
  "duplicate",
]);

export const SUPPORT_ISSUE_SOURCES = Object.freeze([
  "text",
  "voice",
  "swan_coach",
  "error_boundary",
]);

export const SUPPORT_EVENT_TYPES = Object.freeze([
  "created",
  "reporter_reply",
  "owner_reply",
  "internal_note",
  "triage_updated",
  "resolved",
  "closed",
  "reopened",
  "marked_duplicate",
]);

export const SUPPORT_EVENT_VISIBILITIES = Object.freeze(["reporter", "owner"]);
