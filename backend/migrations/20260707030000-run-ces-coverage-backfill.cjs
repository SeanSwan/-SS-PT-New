'use strict';

/**
 * Launch charter Phase 4B.1 — runs the CES coverage backfill AT RENDER BUILD.
 * Seeders do not auto-run on deploys (only migrations do; the 20260504 starter
 * was run manually) — this thin delegate makes the Mobility Board's content
 * gate land with the batch push, zero manual steps. The seeder itself is
 * idempotent (exercise_key-guarded inserts + set-union retags), so re-runs
 * and already-seeded environments are safe no-ops.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const mod = await import('../seeders/20260707020000-seed-ces-coverage-backfill.mjs');
    await mod.default.up(queryInterface);
  },

  async down(queryInterface) {
    const mod = await import('../seeders/20260707020000-seed-ces-coverage-backfill.mjs');
    await mod.default.down(queryInterface);
  },
};
