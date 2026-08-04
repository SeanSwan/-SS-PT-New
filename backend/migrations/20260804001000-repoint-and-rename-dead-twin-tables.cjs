'use strict';

/**
 * SWA-115 item 2 (Sean-approved 2026-08-03, backups taken first) — dead-twin cleanup, stage 1 of 2.
 *
 * STAGE 1 = REPOINT + RENAME ONLY. Nothing is dropped; every table keeps its data under a
 * `_dead_<name>_20260803` name and down() renames back. The drop is a separate, later,
 * Sean-gated migration after a soak window.
 *
 * Live-DB facts this migration was written against (probed 2026-08-04, pg_constraint):
 *   - `users` (dead lowercase twin of "Users"): 9 stale rows, ZERO inbound FKs, zero views,
 *     no Sequelize model maps to it. Backed up to backups/dead-twins-20260804/ (gitignored).
 *   - `"WorkoutPlans"` (empty twin of canonical workout_plans): inbound FKs from CANONICAL
 *     workout_plan_days (0 rows) and dead "WorkoutSessions".
 *   - `"WorkoutSessions"` (empty twin of canonical workout_sessions, 53 rows): inbound FK
 *     from CANONICAL workout_exercises (0 rows, 0 non-null workoutSessionId).
 *   - The PascalCase challenge family (Challenges/ChallengeParticipants/ChallengeTeams) is
 *     NOT touched here: live models still map to two of them (boot sync would resurrect
 *     renamed tables), and ChallengeTeams.challengeId is int4 vs canonical challenges.id
 *     uuid — unrepointable. Deferred on SWA-115 pending a product decision.
 *
 * Order of operations (single transaction):
 *   1. Repoint workout_plan_days.workoutPlanId  -> workout_plans(id)   [uuid↔uuid, 0 orphans]
 *   2. Repoint workout_exercises.workoutSessionId -> workout_sessions(id) [uuid↔uuid, 0 orphans]
 *   3. Rename users, "WorkoutPlans", "WorkoutSessions" to _dead_* — each guarded: skipped
 *      if already renamed/absent; REFUSED if any inbound FK remains from a table outside
 *      the rename set (fail-closed: never strand a canonical table pointing at _dead_*).
 */

const RENAMES = [
  { from: 'users', to: '_dead_users_20260803' },
  { from: 'WorkoutPlans', to: '_dead_WorkoutPlans_20260803' },
  { from: 'WorkoutSessions', to: '_dead_WorkoutSessions_20260803' },
];

async function regclass(qi, name, transaction) {
  const [rows] = await qi.sequelize.query(
    `SELECT to_regclass('public."${name}"') AS t`, { transaction },
  );
  return rows?.[0]?.t || null;
}

async function inboundFks(qi, table, transaction) {
  const [rows] = await qi.sequelize.query(
    `SELECT conname, conrelid::regclass::text AS src
     FROM pg_constraint
     WHERE contype = 'f' AND confrelid = 'public."${table}"'::regclass`,
    { transaction },
  );
  return rows;
}

async function repointFk(qi, transaction, { table, column, constraint, oldTarget, newTarget }) {
  const [cur] = await qi.sequelize.query(
    `SELECT confrelid::regclass::text AS tgt FROM pg_constraint
     WHERE conname = :constraint AND conrelid = 'public.${table}'::regclass`,
    { transaction, replacements: { constraint } },
  );
  const tgt = cur?.[0]?.tgt;
  if (!tgt) {
    console.log(`[repoint] ${table}.${column}: constraint ${constraint} absent — adding fresh FK -> ${newTarget}`);
  } else if (tgt.replace(/"/g, '') === newTarget) {
    console.log(`[repoint] ${table}.${column}: already targets ${newTarget} — skip`);
    return;
  } else if (tgt.replace(/"/g, '') !== oldTarget) {
    throw new Error(
      `[repoint] REFUSED: ${table}.${constraint} targets unexpected ${tgt} (expected ${oldTarget} or ${newTarget})`,
    );
  }

  // Fail-closed orphan check before adding the new FK.
  const [orph] = await qi.sequelize.query(
    `SELECT count(*)::int AS n FROM ${table} src
     WHERE src."${column}" IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM ${newTarget} t WHERE t.id = src."${column}")`,
    { transaction },
  );
  if (orph[0].n > 0) {
    throw new Error(
      `[repoint] REFUSED: ${orph[0].n} row(s) in ${table}.${column} missing from ${newTarget} — resolve orphans first`,
    );
  }

  if (tgt) {
    await qi.sequelize.query(
      `ALTER TABLE ${table} DROP CONSTRAINT "${constraint}"`, { transaction },
    );
  }
  // Mirror the ORIGINAL constraint semantics exactly (probed live 2026-08-04:
  // confupdtype='a' NO ACTION, confdeltype='c' CASCADE; both columns are NOT NULL,
  // so SET NULL would have errored on parent deletes).
  await qi.sequelize.query(
    `ALTER TABLE ${table}
       ADD CONSTRAINT "${constraint}" FOREIGN KEY ("${column}")
       REFERENCES ${newTarget}(id) ON DELETE CASCADE`,
    { transaction },
  );
  console.log(`[repoint] ${table}.${column} -> ${newTarget}(id) done`);
}

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1-2. Repoint canonical tables away from the twins BEFORE any rename.
      if (await regclass(queryInterface, 'WorkoutPlans', transaction)) {
        await repointFk(queryInterface, transaction, {
          table: 'workout_plan_days', column: 'workoutPlanId',
          constraint: 'workout_plan_days_workoutPlanId_fkey',
          oldTarget: 'WorkoutPlans', newTarget: 'workout_plans',
        });
      }
      if (await regclass(queryInterface, 'WorkoutSessions', transaction)) {
        await repointFk(queryInterface, transaction, {
          table: 'workout_exercises', column: 'workoutSessionId',
          constraint: 'workout_exercises_workoutSessionId_fkey',
          oldTarget: 'WorkoutSessions', newTarget: 'workout_sessions',
        });
      }

      // 3. Guarded renames.
      const renameSet = new Set(RENAMES.flatMap(r => [r.from, r.to]));
      for (const { from, to } of RENAMES) {
        if (await regclass(queryInterface, to, transaction)) {
          console.log(`[rename] ${to} already exists — skip (idempotent)`);
          continue;
        }
        if (!(await regclass(queryInterface, from, transaction))) {
          console.log(`[rename] ${from} absent — skip (idempotent)`);
          continue;
        }
        const inbound = (await inboundFks(queryInterface, from, transaction))
          .filter(fk => !renameSet.has(fk.src.replace(/"/g, '')));
        if (inbound.length > 0) {
          throw new Error(
            `[rename] REFUSED for ${from}: inbound FK(s) from outside the rename set: ` +
            inbound.map(f => `${f.src}.${f.conname}`).join(', '),
          );
        }
        await queryInterface.sequelize.query(
          `ALTER TABLE "${from}" RENAME TO "${to}"`, { transaction },
        );
        console.log(`[rename] ${from} -> ${to}`);
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  // Rollback restores queryability under the original names. It deliberately does NOT
  // re-point the repointed FKs back at the twins — restoring FKs onto dead twins is the
  // disease this migration cures (same refusal pattern as 20260418000003).
  //
  // ⚠ down() is a QUERYABILITY restore, not a SAFETY restore (Kimi F6): renaming
  // `_dead_users_20260803` back to `users` re-opens the unquoted-identifier trap — any
  // future raw SQL writing `FROM users` (or unquoted `FROM Users`, which Postgres folds
  // to lowercase) silently hits the stale 9-row twin with live-looking password hashes
  // instead of canonical "Users". Run down() only for an emergency restore, and re-run
  // the rename forward as soon as the emergency clears.
  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      for (const { from, to } of RENAMES) {
        const have = await regclass(queryInterface, to, transaction);
        const clash = await regclass(queryInterface, from, transaction);
        if (have && !clash) {
          await queryInterface.sequelize.query(
            `ALTER TABLE "${to}" RENAME TO "${from}"`, { transaction },
          );
          console.log(`[rollback] ${to} -> ${from}`);
        }
      }
      console.log('[rollback] FK repoints intentionally NOT reverted (rollback to dead-twin FKs refused).');
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
