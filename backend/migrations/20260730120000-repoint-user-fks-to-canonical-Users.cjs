'use strict';

/**
 * ============================================================================
 * SWA-92 — repoint every FK from lowercase `users` to canonical `"Users"`
 * ============================================================================
 *
 * THE BUG: the app authenticates and creates accounts ONLY in `"Users"`
 * (`models/User.mjs` -> tableName '"Users"'), but 50 foreign-key columns point at a
 * SECOND, lowercase `users` table. Nothing keeps the two in sync — there are no
 * triggers. So an account created by the app exists in `"Users"` and not in `users`,
 * and any insert constrained to `users` is rejected.
 *
 * MEASURED CONSEQUENCE (2026-07-29, production):
 *   - `orders.userId` REFERENCES users(id)  ->  a client cannot have an order written
 *   - ids in both tables: 2 (both admin)  ·  ids only in "Users": 5 (4 client, 1 user)
 *   - shopping_carts.userId REFERENCES "Users" — so a client CAN build a cart and
 *     then fails at the payment step, which is the worst place to fail
 *   - 5 admin carts + 3 client carts exist; exactly 1 order exists, owned by an admin
 *   - control-verified: inserting an order for a "Users"-only id raises
 *     `violates foreign key constraint "orders_userId_fkey"`, while the identical
 *     insert for an id present in both succeeds
 *
 * WHY THIS IS SAFE TO RUN — checked against production before writing:
 *   - 50 FK columns target `users`; 49 of them contain ZERO rows
 *   - the entire dependent dataset is ONE row: `orders.userId`, whose id exists in
 *     `"Users"` as well, so it satisfies the new constraint unchanged
 *   - therefore NO data migration is required and nothing needs backfilling
 *
 * WHAT THIS DELIBERATELY DOES NOT DO:
 *   - it does NOT drop or empty the lowercase `users` table. That table holds 7 ids
 *     absent from `"Users"`; dropping it would destroy them and is not needed to fix
 *     the money path. After this migration it is simply no longer an FK target.
 *   - it does NOT touch the 16 model files that declare `references: { model: 'users' }`.
 *     Those only recreate wrong FKs under `sync({ alter: true })`, which is gated off
 *     in production (`core/startup.mjs` -> `!isProduction && AUTO_SYNC === 'true'`).
 *     Fixing them is a separate, mechanical follow-up so this slice stays reviewable.
 *
 * DESIGN — DATA-DRIVEN, NOT 50 HARDCODED NAMES. The constraint set is read from
 * `pg_constraint` at run time and each one is recreated with its OWN column list and
 * its OWN action clause. There are five distinct clauses in play (`ON DELETE CASCADE`,
 * `SET NULL`, `RESTRICT`, `ON UPDATE CASCADE`, and none); hardcoding would risk
 * silently flattening delete semantics, which is a data-loss-shaped mistake.
 *
 * FAIL-CLOSED: a pre-flight check counts rows that would violate the new constraint.
 * If any exist the migration throws BEFORE altering anything, and the whole thing runs
 * inside one transaction so a partial repoint cannot be left behind.
 */

/**
 * Pull every FK currently pointing at the given table, with its parts.
 *
 * RESOLVES THE TARGET BY OID, NOT BY RENDERED TEXT. `confrelid::regclass::text` renders a
 * mixed-case relation WITH quotes — `"Users"`, not `Users` — so comparing it to the bare string
 * `'Users'` matches NOTHING. That is not hypothetical: a count query using the bare form returned 0
 * while 172 FKs demonstrably targeted that table. `down()` used the bare form, so it would have
 * found zero constraints and silently reverted nothing while reporting success.
 *
 * `to_regclass` resolves a name to an OID using normal identifier rules, so the caller passes the
 * SQL-quoted form ('"Users"' / 'users') and casing is handled by Postgres rather than by guessing
 * how it will print. It also returns NULL for a missing table instead of raising, which keeps a
 * dropped-table case a normal empty result rather than a migration crash.
 */
async function fksTargeting(queryInterface, transaction, target) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT c.conname                    AS name,
            c.conrelid::regclass::text   AS src,
            pg_get_constraintdef(c.oid)  AS def
       FROM pg_constraint c
      WHERE c.contype = 'f'
        AND c.confrelid = to_regclass(:target)
      ORDER BY 1`,
    { replacements: { target }, transaction },
  );
  return rows.map((r) => {
    // FOREIGN KEY (a, b) REFERENCES <tbl>(x, y) [ON UPDATE ...] [ON DELETE ...]
    const m = r.def.match(/FOREIGN KEY \(([^)]+)\) REFERENCES [^(]+\(([^)]+)\)(.*)$/);
    if (!m) throw new Error(`could not parse constraint ${r.name}: ${r.def}`);
    // REFUSE composite FKs rather than half-checking them. The offender pre-flight inspects only
    // the FIRST column, so a multi-column FK would be recreated correctly but VALIDATED partially —
    // the pre-flight could pass while ADD CONSTRAINT fails mid-migration. Measured 2026-08-04: zero
    // composite FKs exist anywhere in this database, so this cannot fire today. It is here because
    // "silently checks one column" is a limitation nobody reads at 2am; a throw announces itself
    // the moment it becomes reachable.
    if (m[1].includes(',')) {
      throw new Error(
        `[SWA-92] ABORT: ${r.name} on ${r.src} is a COMPOSITE foreign key (${m[1].trim()}). `
        + 'This migration validates only the first column and must not guess at the rest. '
        + 'Extend the pre-flight to all columns before running it.',
      );
    }
    return {
      name: r.name,
      src: r.src,
      cols: m[1].trim(),
      refCols: m[2].trim(),
      actions: (m[3] || '').trim(),
    };
  });
}

/**
 * Bound how long this transaction will WAIT for a lock. Measured 2026-08-04: the server has
 * `lock_timeout`, `statement_timeout` and `idle_in_transaction_session_timeout` all set to 0 —
 * wait forever. This migration takes DDL locks across 31 tables in ONE transaction, so a single
 * conflicting long-running query would block it indefinitely AND queue every subsequent query on
 * `sessions`, `orders`, `notifications` and 28 others behind it. That is an outage, not a slow
 * migration.
 *
 * 5s, and FAILING, is the better outcome: the transaction rolls back whole (nothing is left
 * half-repointed) and can be retried in a quieter moment. This matters most for `down()`, which by
 * definition runs during an incident — the worst possible time to hold a queue open.
 *
 * SET LOCAL scopes it to this transaction only; the session default is untouched.
 *
 * Today the risk is small — 17 live rows across all 31 tables, which is why `up()` ran instantly —
 * but the guard costs one statement and the row count only goes up.
 */
async function boundLockWait(queryInterface, transaction) {
  await queryInterface.sequelize.query("SET LOCAL lock_timeout = '5s'", { transaction });
}

/**
 * Refuse if any existing row would violate the PROPOSED target. Runs before the first ALTER so a
 * bad dataset fails loudly instead of half-migrating.
 *
 * SHARED BY up() AND down() — and `down()` is why this is a separate function. It used to drop and
 * re-add blind. That was survivable only while the two tables happened to agree; the moment this
 * migration SUCCEEDS at its actual purpose — the first client places an order — `orders.userId`
 * holds an id present in `"Users"` and absent from `users`, and a blind `down()` fails on ADD
 * CONSTRAINT partway through. That failure would land during an incident, after someone had already
 * committed to rolling back. A revert path that quietly expires the day the feature starts working
 * is worse than no revert path, because it changes what you reach for under pressure. Now it
 * refuses up front and names the rows to reconcile.
 *
 * `target` is the SQL identifier to check against, quoted by the caller ('"Users"' / 'users').
 */
async function assertNoOffenders(queryInterface, transaction, fks, target) {
  const offenders = [];
  for (const fk of fks) {
    const col = fk.cols.split(',')[0].trim().replace(/"/g, '');
    const refCol = fk.refCols.split(',')[0].trim().replace(/"/g, '');
    const [rows] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS n
         FROM ${fk.src} t
        WHERE t."${col}" IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM ${target} u WHERE u."${refCol}" = t."${col}")`,
      { transaction },
    );
    if (rows[0].n > 0) offenders.push(`${fk.src}.${col} (${rows[0].n} row(s))`);
  }
  if (offenders.length) {
    throw new Error(
      `[SWA-92] ABORT: ${offenders.length} column(s) reference ids absent from ${target}. `
      + `Reconcile the two tables first — proceeding would fail mid-migration.\n  `
      + offenders.join('\n  '),
    );
  }
}

/** Repoint every FK from `from` to `to`, preserving columns and action clauses. */
async function repoint(queryInterface, transaction, from, to) {
  const fks = await fksTargeting(queryInterface, transaction, from);
  if (!fks.length) {
    // Nothing to do is a legitimate outcome (already migrated, or a fresh DB).
    console.log(`  [SWA-92] no FKs target ${from} — nothing to repoint`);
    return 0;
  }

  await assertNoOffenders(queryInterface, transaction, fks, `"${to}"`);

  for (const fk of fks) {
    await queryInterface.sequelize.query(
      `ALTER TABLE ${fk.src} DROP CONSTRAINT "${fk.name}"`, { transaction },
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE ${fk.src} ADD CONSTRAINT "${fk.name}" `
      + `FOREIGN KEY (${fk.cols}) REFERENCES "${to}"(${fk.refCols}) ${fk.actions}`.trim(),
      { transaction },
    );
  }
  console.log(`  [SWA-92] repointed ${fks.length} FK constraint(s): ${from} -> "${to}"`);
  return fks.length;
}

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await boundLockWait(queryInterface, transaction);
      // Targets are passed as SQL identifiers: bare `users` folds to lowercase, `"Users"`
      // must stay quoted or Postgres would fold it to `users` and resolve the WRONG table.
      await repoint(queryInterface, transaction, 'users', 'Users');
    });
  },

  /**
   * Reverses the repoint. Note this restores the BROKEN state on purpose — `down` exists
   * so the change is revertible, not because lowercase `users` is a correct target.
   */
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await boundLockWait(queryInterface, transaction);
      // '"Users"' — quoted. The bare form resolves to lowercase `users` and finds nothing,
      // which is exactly the bug this line used to have.
      const fks = await fksTargeting(queryInterface, transaction, '"Users"');
      // Only move back the ones this migration created; everything else legitimately targeted
      // "Users" beforehand and must be left alone. Matched on TABLE + NAME, not name alone:
      // Postgres scopes constraint names to their table, so a bare-name match could drag an
      // unrelated table's identically-named FK onto the broken target. Measured 2026-08-04: zero
      // FK names are reused across tables here — the key shape makes that a fact the code enforces
      // rather than an assumption it inherits.
      const ours = fks.filter((f) => MOVED.has(`${f.src}|${f.name}`));

      // Refuse if CURRENT data cannot satisfy the restored constraints. Without this, down() fails
      // partway through ADD CONSTRAINT as soon as a client id exists in "Users" but not in `users`
      // — i.e. the moment this migration has done its job. See assertNoOffenders.
      await assertNoOffenders(queryInterface, transaction, ours, 'users');

      for (const fk of ours) {
        await queryInterface.sequelize.query(
          `ALTER TABLE ${fk.src} DROP CONSTRAINT "${fk.name}"`, { transaction },
        );
        await queryInterface.sequelize.query(
          `ALTER TABLE ${fk.src} ADD CONSTRAINT "${fk.name}" `
          + `FOREIGN KEY (${fk.cols}) REFERENCES users(${fk.refCols}) ${fk.actions}`.trim(),
          { transaction },
        );
      }
      console.log(`  [SWA-92] reverted ${ours.length} FK constraint(s) -> users`);
    });
  },
};

/**
 * The exact constraint names this migration moves, captured from production on
 * 2026-07-29. `down` uses this so a revert cannot accidentally drag constraints that
 * already targeted `"Users"` back onto the broken table.
 */
const MOVED = new Set([
  'admin_specials|admin_specials_createdBy_fkey',
  'client_baseline_measurements|client_baseline_measurements_recordedBy_fkey',
  'client_baseline_measurements|client_baseline_measurements_userId_fkey',
  'client_notes|client_notes_trainerId_fkey',
  'client_notes|client_notes_userId_fkey',
  'client_nutrition_plans|client_nutrition_plans_createdBy_fkey',
  'client_nutrition_plans|client_nutrition_plans_userId_fkey',
  'client_opt_phases|client_opt_phases_client_id_fkey',
  'client_photos|client_photos_uploadedBy_fkey',
  'client_photos|client_photos_userId_fkey',
  'client_progress|client_progress_userId_fkey',
  'clients_pii|clients_pii_created_by_fkey',
  'clients_pii|clients_pii_last_modified_by_fkey',
  '"Communities"|Communities_createdBy_fkey',
  'corrective_homework_logs|corrective_homework_logs_client_id_fkey',
  'corrective_protocols|corrective_protocols_assigned_by_trainer_id_fkey',
  'corrective_protocols|corrective_protocols_client_id_fkey',
  'custom_packages|custom_packages_clientId_fkey',
  'custom_packages|custom_packages_createdByAdminId_fkey',
  '"EnhancedSocialPosts"|EnhancedSocialPosts_moderatedBy_fkey',
  '"EnhancedSocialPosts"|EnhancedSocialPosts_userId_fkey',
  'exercise_library|exercise_library_created_by_admin_id_fkey',
  'food_scan_history|food_scan_history_userId_fkey',
  'movement_assessments|movement_assessments_assessor_trainer_id_fkey',
  'movement_assessments|movement_assessments_client_id_fkey',
  'notifications|notifications_senderId_fkey',
  'orders|orders_trainer_id_fkey',
  'orders|orders_userId_fkey',
  'orientations|orientations_userId_fkey',
  'phase_progression_history|phase_progression_history_client_id_fkey',
  'phase_progression_history|phase_progression_history_trainer_id_fkey',
  'progress_reports|progress_reports_userId_fkey',
  'renewal_alerts|renewal_alerts_contactedBy_fkey',
  'renewal_alerts|renewal_alerts_userId_fkey',
  'session_logs|session_logs_client_id_fkey',
  'session_logs|session_logs_trainer_id_fkey',
  'sessions|sessions_cancellationReviewedBy_fkey',
  'sessions|sessions_markedPresentBy_fkey',
  '"SocialConnections"|SocialConnections_followerId_fkey',
  '"SocialConnections"|SocialConnections_followingId_fkey',
  'study_progress|study_progress_user_id_fkey',
  'trainer_availability|trainer_availability_trainer_id_fkey',
  'trainer_certifications|trainer_certifications_trainer_id_fkey',
  'trainer_certifications|trainer_certifications_verified_by_admin_id_fkey',
  'trainer_permissions|trainer_permissions_grantedBy_fkey',
  'trainer_permissions|trainer_permissions_trainerId_fkey',
  'variation_logs|variation_logs_clientId_fkey',
  'variation_logs|variation_logs_trainerId_fkey',
  'workout_templates|workout_templates_created_by_admin_id_fkey',
  'workout_templates|workout_templates_userId_fkey',
]);
