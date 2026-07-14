'use strict';

/**
 * Migration: trainer_commissions FK + nullability repair
 * ======================================================
 * Hostile-review round 3 (2026-07-14) confirmed two production defects
 * that silently kill EVERY commission insert (errors are swallowed by
 * design in the accrual/commission services):
 *
 * 1. package_id is NOT NULL with an FK to storefront_items(id) — the
 *    session-flat lane (packageId sentinel) and any packageless purchase
 *    flow violate it. → make package_id nullable.
 * 2. client_id / trainer_id FKs reference the STALE lowercase `users`
 *    table. Production doctrine (CLAUDE.md gotcha): FKs must reference
 *    `"Users"`. Probe 2026-07-14: Users ids 35/84/89/108 are missing
 *    from `users`, so their commissions can never insert. → repoint.
 *
 * Every step is individually guarded (idempotent) because
 * scripts/safe-migrate.mjs stamps the WHOLE migration applied on any
 * "already exists" error — unguarded multi-step DDL could half-apply.
 */

module.exports = {
  async up(queryInterface) {
    const sql = (q) => queryInterface.sequelize.query(q);

    // 1. package_id nullable (no-op if already nullable)
    await sql(`ALTER TABLE trainer_commissions ALTER COLUMN package_id DROP NOT NULL`);

    // 2. Repoint client_id/trainer_id FKs to "Users"(id), guarded.
    await sql(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trainer_commissions_client_id_fkey'
                     AND confrelid = 'users'::regclass) THEN
          ALTER TABLE trainer_commissions DROP CONSTRAINT trainer_commissions_client_id_fkey;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trainer_commissions_client_id_fkey') THEN
          ALTER TABLE trainer_commissions
            ADD CONSTRAINT trainer_commissions_client_id_fkey
            FOREIGN KEY (client_id) REFERENCES "Users"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await sql(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trainer_commissions_trainer_id_fkey'
                     AND confrelid = 'users'::regclass) THEN
          ALTER TABLE trainer_commissions DROP CONSTRAINT trainer_commissions_trainer_id_fkey;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trainer_commissions_trainer_id_fkey') THEN
          ALTER TABLE trainer_commissions
            ADD CONSTRAINT trainer_commissions_trainer_id_fkey
            FOREIGN KEY (trainer_id) REFERENCES "Users"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    console.log('✅ trainer_commissions: package_id nullable + FKs repointed to "Users"');
  },

  async down(queryInterface) {
    const sql = (q) => queryInterface.sequelize.query(q);
    // Restore NOT NULL only if no null rows exist (down() must stay runnable).
    await sql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM trainer_commissions WHERE package_id IS NULL) THEN
          ALTER TABLE trainer_commissions ALTER COLUMN package_id SET NOT NULL;
        ELSE
          RAISE NOTICE 'package_id has NULL rows - skipping SET NOT NULL';
        END IF;
      END $$;
    `);
    // FK repoint is a correctness repair; down() intentionally keeps "Users"
    // as the target (reverting to the stale lowercase table is never right).
    console.log('✅ trainer_commissions down: NOT NULL conditionally restored; FK repair retained');
  }
};
