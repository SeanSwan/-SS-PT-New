'use strict';

/**
 * Phase 16.2 round 11 (2026-04-18): retarget
 * `daily_workout_forms.client_id` and `daily_workout_forms.trainer_id`
 * FKs from legacy lowercase `users` (9 rows) to active `"Users"`
 * (PascalCase, 17 rows — the real auth table called out in CLAUDE.md).
 *
 * Background (CLAUDE.md calls this drift out explicitly):
 *   "Dual users/'Users' table in production — FK constraints must
 *    reference 'Users'."
 *
 * Path A data repair (Sean's ruling, 2026-04-18):
 *   First attempt of this migration failed validating the new FK because
 *   57 daily_workout_forms rows referenced client_id=6 — Sean's legacy
 *   "SwanStudios" username client account in lowercase users, which
 *   has no counterpart in "Users". Sean's canonical admin account in
 *   "Users" is id=5 (same email loveswanstudios@protonmail.com,
 *   username "Jazzypoo"). Correct semantic repair is to REMAP those
 *   57 historical rows from client_id=6 -> client_id=5. This preserves
 *   Sean's historical workout data under the real active account and
 *   lets the FK retarget complete cleanly.
 *
 *   Auditable path (per Sean's spec):
 *     (1) Log count of rows with client_id=6 BEFORE update.
 *     (2) Remap those rows to client_id=5.
 *     (3) Verify 0 remaining client_id values are missing from "Users".
 *     (4) Verify 0 trainer_id values are missing from "Users".
 *     (5) Retarget both FKs.
 *
 * Safety invariants before the UPDATE runs:
 *   - "Users".id=5 exists AND has Sean's email. If either check fails
 *     in this environment (e.g. fresh install, different data), the
 *     migration aborts before touching any rows — no blind remap.
 *
 * Rules preserved:
 *   Live: ON UPDATE NO ACTION, ON DELETE CASCADE on both FKs. Kept
 *   exactly.
 *
 * Idempotency:
 *   - Data step skips rows already remapped (WHERE client_id = 6
 *     becomes a no-op after first run).
 *   - FK steps inspect current target and skip if already "Users".
 *   - Safe to re-run across environments.
 *
 * Sibling drift flagged (NOT fixed):
 *   61 other FKs in the DB still target lowercase users. Not on the
 *   Phase 16 save path. Needs its own dedicated slice.
 *
 * Down():
 *   - Refuses rollback if rows referencing user 5 now exist that would
 *     become orphans under lowercase users (user 5 isn't in lowercase
 *     users either, so post-remap state can't safely roll back).
 *   - The remap itself is NOT auto-reversed — Sean would have to decide
 *     whether to re-create user 6 or leave the remapped rows under id 5.
 */
const USER_FK_SPECS = [
  {
    constraintName: 'daily_workout_forms_client_id_fkey',
    columnName: 'client_id',
  },
  {
    constraintName: 'daily_workout_forms_trainer_id_fkey',
    columnName: 'trainer_id',
  },
];

const LEGACY_CLIENT_ID = 6;
const CANONICAL_CLIENT_ID = 5;
const SEAN_EMAIL = 'loveswanstudios@protonmail.com';

module.exports = {
  async up(queryInterface /* , Sequelize */) {
    const existingTables = await queryInterface.showAllTables();
    const tableNames = existingTables.map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry.tableName === 'string') return entry.tableName;
      return '';
    });

    if (!tableNames.includes('daily_workout_forms')) {
      console.log('[Migration] daily_workout_forms missing — nothing to alter');
      return;
    }
    if (!tableNames.includes('Users')) {
      throw new Error(
        '[Migration] "Users" table missing — cannot retarget FKs to a nonexistent table'
      );
    }

    // ──────────────────────────────────────────────────────────────
    // Path A data repair: remap legacy client_id=6 rows to canonical 5
    // ──────────────────────────────────────────────────────────────

    // Step 1 — audit: how many rows need remapping?
    const [countBeforeRows] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS n FROM daily_workout_forms WHERE client_id = ${LEGACY_CLIENT_ID};`
    );
    const countBefore = Number(countBeforeRows?.[0]?.n ?? 0);
    console.log(
      `[Migration] Audit: ${countBefore} daily_workout_forms row(s) have client_id=${LEGACY_CLIENT_ID} (legacy Sean account)`
    );

    if (countBefore > 0) {
      // Step 2 — safety invariants: only remap if canonical user exists
      // with Sean's email in "Users". No blind remap in unknown envs.
      const [sean] = await queryInterface.sequelize.query(
        `SELECT id, email FROM "Users" WHERE id = ${CANONICAL_CLIENT_ID};`
      );
      const seanRow = sean?.[0];
      if (!seanRow) {
        throw new Error(
          `[Migration] Refusing remap — "Users".id=${CANONICAL_CLIENT_ID} does not exist in this environment. Path A requires the canonical target account.`
        );
      }
      if ((seanRow.email || '').toLowerCase() !== SEAN_EMAIL) {
        throw new Error(
          `[Migration] Refusing remap — "Users".id=${CANONICAL_CLIENT_ID} exists but has email ${seanRow.email}, expected ${SEAN_EMAIL}. This is not the same environment the remap was authorized against.`
        );
      }
      console.log(
        `[Migration] Canonical target verified: "Users".id=${CANONICAL_CLIENT_ID} (${seanRow.email})`
      );

      // Step 3 — remap
      const [, updateMeta] = await queryInterface.sequelize.query(
        `UPDATE daily_workout_forms SET client_id = ${CANONICAL_CLIENT_ID} WHERE client_id = ${LEGACY_CLIENT_ID};`
      );
      const updated = updateMeta?.rowCount ?? countBefore;
      console.log(
        `[Migration] Remapped ${updated} row(s) from client_id=${LEGACY_CLIENT_ID} to client_id=${CANONICAL_CLIENT_ID}`
      );
    } else {
      console.log(
        `[Migration] No rows with client_id=${LEGACY_CLIENT_ID} — remap is a no-op (prior run or already clean)`
      );
    }

    // Step 4 — post-remap invariants: no client_id left missing from "Users"
    const [clientOrphans] = await queryInterface.sequelize.query(
      `SELECT DISTINCT client_id FROM daily_workout_forms dwf
        WHERE client_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u.id = dwf.client_id);`
    );
    if (clientOrphans && clientOrphans.length > 0) {
      const ids = clientOrphans.map((r) => r.client_id).join(', ');
      throw new Error(
        `[Migration] Refusing FK retarget — daily_workout_forms still has client_id values missing from "Users": ${ids}. Remap all before retargeting.`
      );
    }
    console.log(
      '[Migration] Verified: all daily_workout_forms.client_id values exist in "Users"'
    );

    // Step 5 — same invariant for trainer_id
    const [trainerOrphans] = await queryInterface.sequelize.query(
      `SELECT DISTINCT trainer_id FROM daily_workout_forms dwf
        WHERE trainer_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u.id = dwf.trainer_id);`
    );
    if (trainerOrphans && trainerOrphans.length > 0) {
      const ids = trainerOrphans.map((r) => r.trainer_id).join(', ');
      throw new Error(
        `[Migration] Refusing FK retarget — daily_workout_forms has trainer_id values missing from "Users": ${ids}. Remap or archive those rows before retargeting.`
      );
    }
    console.log(
      '[Migration] Verified: all daily_workout_forms.trainer_id values exist in "Users"'
    );

    // ──────────────────────────────────────────────────────────────
    // FK retarget — both constraints, idempotent per-constraint check
    // ──────────────────────────────────────────────────────────────

    for (const { constraintName, columnName } of USER_FK_SPECS) {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT ccu.table_name AS target_table
           FROM information_schema.table_constraints tc
           JOIN information_schema.constraint_column_usage ccu
             ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_name = '${constraintName}'
            AND tc.table_name = 'daily_workout_forms';`
      );
      const currentTarget = rows?.[0]?.target_table;
      if (currentTarget === 'Users') {
        console.log(
          `[Migration] ${constraintName} already targets "Users", skipping`
        );
        continue;
      }

      console.log(
        `[Migration] Retargeting ${constraintName}: currently points at "${currentTarget || '<none>'}"`
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE daily_workout_forms DROP CONSTRAINT IF EXISTS "${constraintName}";`
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE daily_workout_forms
           ADD CONSTRAINT "${constraintName}"
           FOREIGN KEY (${columnName})
           REFERENCES "Users"(id)
           ON UPDATE NO ACTION
           ON DELETE CASCADE;`
      );
      console.log(`[Migration] ${constraintName} now targets "Users"(id)`);
    }
  },

  async down(queryInterface /* , Sequelize */) {
    // Safe-rollback precheck: rolling back retargets FKs to lowercase users.
    // The Path A remap would be orphaned because user 5 is NOT in lowercase
    // users either — we moved data TO the canonical table. Refuse if any
    // daily_workout_forms rows reference a user not present in lowercase
    // users.
    const [clientOrphans] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS n FROM daily_workout_forms dwf
        WHERE client_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = dwf.client_id);`
    );
    const [trainerOrphans] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS n FROM daily_workout_forms dwf
        WHERE trainer_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = dwf.trainer_id);`
    );
    const clientN = Number(clientOrphans?.[0]?.n ?? 0);
    const trainerN = Number(trainerOrphans?.[0]?.n ?? 0);
    if (clientN + trainerN > 0) {
      throw new Error(
        `[Phase 16.2 round 11 rollback refused] daily_workout_forms has ` +
        `${clientN} client_id and ${trainerN} trainer_id row(s) whose user ` +
        `does NOT exist in lowercase users. This is expected post-Path-A ` +
        `remap (data moved to the canonical "Users" table). Rolling back ` +
        `would break the restored FKs. Re-create the missing legacy users ` +
        `or archive the rows before re-running down(). Note: the Path A ` +
        `client_id 6->5 remap is NOT auto-reversed.`
      );
    }

    for (const { constraintName, columnName } of USER_FK_SPECS) {
      await queryInterface.sequelize.query(
        `ALTER TABLE daily_workout_forms DROP CONSTRAINT IF EXISTS "${constraintName}";`
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE daily_workout_forms
           ADD CONSTRAINT "${constraintName}"
           FOREIGN KEY (${columnName})
           REFERENCES users(id)
           ON UPDATE NO ACTION
           ON DELETE CASCADE;`
      );
      console.log(`[Migration] ${constraintName} restored to users(id)`);
    }
  },
};
