/**
 * userResetLists.mjs — the SINGLE source of truth for the prod data-reset
 * keep/delete partition (packet §6, Sean-approved 2026-07-07).
 * ===========================================================================
 * Imported by BOTH the read-only preview and the destructive executor so the
 * two can never drift. Editing this list is editing what gets deleted — any
 * change re-opens Sean's approval.
 *
 * KEEP = the six real people. DELETE = confirmed test/QA/duplicate accounts,
 * including 88 (soft-deleted Ron twin), 105 (confirmed test), 107 (Sean's own
 * test signup) per Sean's explicit ruling. Hard-delete mode.
 * Scope: canonical "Users" table ONLY. The 9 legacy lowercase `users` rows are
 * a SEPARATE follow-on (different table, 58 distinct FKs) — not touched here.
 */

/** The six real people to keep: Sean, Jasmine, Vicky, Anand, Ron, Jesse. */
export const KEEP = [2, 5, 35, 84, 89, 108];

/** 24 confirmed test/QA/duplicate accounts to hard-delete from "Users". */
export const DELETE_IDS = [
  3, 4, 33, 34, 55, 56, 57, 61, 87, 88, 90, 91, 92, 93, 94,
  96, 97, 98, 99, 102, 103, 104, 105, 107,
];
