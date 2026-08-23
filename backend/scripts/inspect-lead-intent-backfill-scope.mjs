/**
 * inspect-lead-intent-backfill-scope.mjs — READ-ONLY audit for the two deferred lead migrations.
 * ==============================================================================================
 * Produces the numbers that make two owner decisions concrete. Writes NOTHING.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE MIGRATIONS: `render.yaml` runs `npm run migrate:production`
 * inside the backend buildCommand, so a migration file merged to `main` EXECUTES against production
 * on the next deploy with no manual gate between. There is no "write it and see". The preview has to
 * happen before the file exists.
 *
 * (1) BACKFILL SCOPE — how many existing leads carry the trainer signal only as prose in `notes`.
 *     Until the intent tag shipped, a trainer inquiry's only machine-readable marker was the literal
 *     string "Subject: Trainer inquiry" folded into the message body. Those leads are invisible to
 *     `byIntent`, so the counter launches at zero for all history.
 *     The match is a HEURISTIC on free text — it will also catch a lead who quoted or forwarded that
 *     phrase. This script reports the precision risk (how many matches do NOT look like a
 *     self-declared subject line) so the owner can judge whether the heuristic is tight enough.
 *
 * (2) DUPLICATE EMAILS — whether a UNIQUE constraint on `Lead.email` can be added at all.
 *     `Lead.mjs:91` declares a NON-unique index and no migration adds uniqueness, so
 *     `findOrCreate({ where: { email } })` can race and create duplicates. Adding the constraint
 *     FAILS OUTRIGHT if duplicates already exist — and because migrations run inside the Render
 *     buildCommand, a failed migration fails the DEPLOY. Count first.
 *     NULL emails are excluded: Postgres permits many NULLs under a UNIQUE constraint, so they are
 *     not a blocker and counting them as one would overstate the problem.
 *
 * PRIVACY (rules 8 / 59): counts and shapes ONLY. No email address, name, or note body is selected
 * or printed. The duplicate probe returns how many addresses are duplicated and the worst
 * multiplicity — never which addresses. Safe to paste into a chat or a handoff.
 *
 * Usage:  cd backend && node scripts/inspect-lead-intent-backfill-scope.mjs
 */
import 'dotenv/config';
import sequelize from '../database.mjs';

const PROSE_MARKER = 'Subject: Trainer inquiry';

async function main() {
  await sequelize.authenticate();
  const out = {};

  // --- (1) backfill scope -------------------------------------------------------------------
  const [[totals]] = await sequelize.query(`
    SELECT
      COUNT(*)::int AS total_leads,
      COUNT(*) FILTER (WHERE notes ILIKE :marker)::int AS prose_marker_leads,
      COUNT(*) FILTER (WHERE tags @> '["prism:intent:trainer"]'::jsonb)::int AS already_tagged,
      COUNT(*) FILTER (WHERE notes ILIKE :marker
                         AND NOT (tags @> '["prism:intent:trainer"]'::jsonb))::int AS would_backfill
    FROM leads
  `, { replacements: { marker: `%${PROSE_MARKER}%` } });
  out.backfill = totals;

  // Precision probe: a genuine self-declared subject sits at the END of the message, on its own
  // line, exactly as the contact form appends it. A match anywhere ELSE is likely quoted text.
  const [[precision]] = await sequelize.query(`
    SELECT
      COUNT(*) FILTER (WHERE notes ILIKE :suffix)::int AS looks_appended,
      COUNT(*) FILTER (WHERE notes ILIKE :marker AND notes NOT ILIKE :suffix)::int AS mid_body_match
    FROM leads
    WHERE notes ILIKE :marker
  `, { replacements: { marker: `%${PROSE_MARKER}%`, suffix: `%${PROSE_MARKER}` } });
  out.backfillPrecision = precision;

  // --- (2) duplicate-email audit ------------------------------------------------------------
  const [[dupes]] = await sequelize.query(`
    SELECT
      COALESCE(COUNT(*), 0)::int      AS duplicated_addresses,
      COALESCE(SUM(n) - COUNT(*), 0)::int AS rows_to_reconcile,
      COALESCE(MAX(n), 0)::int        AS worst_multiplicity
    FROM (
      SELECT LOWER(email) AS e, COUNT(*)::int AS n
      FROM leads
      WHERE email IS NOT NULL AND email <> ''
      GROUP BY LOWER(email)
      HAVING COUNT(*) > 1
    ) d
  `);
  out.duplicateEmails = dupes;

  const [[nulls]] = await sequelize.query(`
    SELECT COUNT(*) FILTER (WHERE email IS NULL OR email = '')::int AS null_or_empty_email
    FROM leads
  `);
  out.nullEmails = nulls;

  // --- verdicts -----------------------------------------------------------------------------
  const canAddUnique = out.duplicateEmails.duplicated_addresses === 0;
  out.verdict = {
    uniqueConstraint: canAddUnique
      ? 'SAFE to add — zero duplicate addresses. NULLs do not block a UNIQUE constraint in Postgres.'
      : `BLOCKED — ${out.duplicateEmails.duplicated_addresses} duplicated address(es), ` +
        `${out.duplicateEmails.rows_to_reconcile} surplus row(s) must be merged or deleted FIRST. ` +
        'Adding the constraint now would fail the migration, and migrations run inside the Render ' +
        'buildCommand, so it would fail the DEPLOY.',
    backfill: out.backfill.would_backfill === 0
      ? 'NO-OP — nothing carries the prose marker without already being tagged.'
      : `${out.backfill.would_backfill} lead(s) would gain prism:intent:trainer. ` +
        `${out.backfillPrecision.mid_body_match} of the matches are mid-body rather than an ` +
        'appended subject line — review those before trusting the heuristic.',
  };

  console.log(JSON.stringify(out, null, 2));
  await sequelize.close();
}

main().catch(async (err) => {
  console.error('[inspect] FAILED:', err.message);
  try { await sequelize.close(); } catch { /* already closed */ }
  process.exit(1);
});
