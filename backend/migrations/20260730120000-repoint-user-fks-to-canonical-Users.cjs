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
    return {
      name: r.name,
      src: r.src,
      cols: m[1].trim(),
      refCols: m[2].trim(),
      actions: (m[3] || '').trim(),
    };
  });
}

/** Repoint every FK from `from` to `to`, preserving columns and action clauses. */
async function repoint(queryInterface, transaction, from, to) {
  const fks = await fksTargeting(queryInterface, transaction, from);
  if (!fks.length) {
    // Nothing to do is a legitimate outcome (already migrated, or a fresh DB).
    console.log(`  [SWA-92] no FKs target ${from} — nothing to repoint`);
    return 0;
  }

  // PRE-FLIGHT: refuse if any existing row would violate the new target. Doing this
  // before the first ALTER means a bad dataset fails loudly instead of half-migrating.
  const offenders = [];
  for (const fk of fks) {
    const col = fk.cols.split(',')[0].trim().replace(/"/g, '');
    const refCol = fk.refCols.split(',')[0].trim().replace(/"/g, '');
    const [rows] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS n
         FROM ${fk.src} t
        WHERE t."${col}" IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM "${to}" u WHERE u."${refCol}" = t."${col}")`,
      { transaction },
    );
    if (rows[0].n > 0) offenders.push(`${fk.src}.${col} (${rows[0].n} row(s))`);
  }
  if (offenders.length) {
    throw new Error(
      `[SWA-92] ABORT: ${offenders.length} column(s) reference ids absent from "${to}". `
      + `Reconcile the two tables first — repointing now would fail mid-migration.\n  `
      + offenders.join('\n  '),
    );
  }

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
      // '"Users"' — quoted. The bare form resolves to lowercase `users` and finds nothing,
      // which is exactly the bug this line used to have.
      const fks = await fksTargeting(queryInterface, transaction, '"Users"');
      // Only move back the ones this migration created; everything else legitimately
      // targeted "Users" beforehand and must be left alone.
      const ours = fks.filter((f) => MOVED.has(f.name));
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
  'Communities_createdBy_fkey', 'EnhancedSocialPosts_moderatedBy_fkey',
  'EnhancedSocialPosts_userId_fkey', 'SocialConnections_followerId_fkey',
  'SocialConnections_followingId_fkey', 'admin_specials_createdBy_fkey',
  'client_baseline_measurements_recordedBy_fkey', 'client_baseline_measurements_userId_fkey',
  'client_notes_trainerId_fkey', 'client_notes_userId_fkey',
  'client_nutrition_plans_createdBy_fkey', 'client_nutrition_plans_userId_fkey',
  'client_opt_phases_client_id_fkey', 'client_photos_uploadedBy_fkey',
  'client_photos_userId_fkey', 'client_progress_userId_fkey',
  'clients_pii_created_by_fkey', 'clients_pii_last_modified_by_fkey',
  'corrective_homework_logs_client_id_fkey', 'corrective_protocols_assigned_by_trainer_id_fkey',
  'corrective_protocols_client_id_fkey', 'custom_packages_clientId_fkey',
  'custom_packages_createdByAdminId_fkey', 'exercise_library_created_by_admin_id_fkey',
  'food_scan_history_userId_fkey', 'movement_assessments_assessor_trainer_id_fkey',
  'movement_assessments_client_id_fkey', 'notifications_senderId_fkey',
  'orders_trainer_id_fkey', 'orders_userId_fkey',
  'orientations_userId_fkey', 'phase_progression_history_client_id_fkey',
  'phase_progression_history_trainer_id_fkey', 'progress_reports_userId_fkey',
  'renewal_alerts_contactedBy_fkey', 'renewal_alerts_userId_fkey',
  'session_logs_client_id_fkey', 'session_logs_trainer_id_fkey',
  'sessions_cancellationReviewedBy_fkey', 'sessions_markedPresentBy_fkey',
  'study_progress_user_id_fkey', 'trainer_availability_trainer_id_fkey',
  'trainer_certifications_trainer_id_fkey', 'trainer_certifications_verified_by_admin_id_fkey',
  'trainer_permissions_grantedBy_fkey', 'trainer_permissions_trainerId_fkey',
  'variation_logs_clientId_fkey', 'variation_logs_trainerId_fkey',
  'workout_templates_created_by_admin_id_fkey', 'workout_templates_userId_fkey',
]);
