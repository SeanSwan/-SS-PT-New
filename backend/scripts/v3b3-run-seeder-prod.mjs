/**
 * V3b.3.3 Direct Seeder Runner
 * =============================
 *
 * Bypasses sequelize-cli (which has a known issue resolving the
 * `--seed` flag against `.mjs` seeder files in 6.6.2) by importing
 * the seeder module directly and calling its up() handler with the
 * live sequelize queryInterface.
 *
 * Connects to whatever DATABASE_URL points at — per CLAUDE.md, that's
 * the production DB even from local dev.
 *
 * Run:
 *   cd backend && node scripts/v3b3-run-seeder-prod.mjs
 *
 * Re-run safe: the seeder uses `ON CONFLICT (exercise_key) DO UPDATE`
 * to refresh corrective metadata on already-seeded rows.
 */
import sequelize from '../database.mjs';
import seederModule from '../seeders/20260504-seed-nasm-corrective-starter.mjs';

const start = Date.now();

try {
  // Sanity: confirm we can talk to the DB before kicking off any writes.
  await sequelize.authenticate();
  console.log('✓ DB connection live');

  const queryInterface = sequelize.getQueryInterface();
  await seederModule.up(queryInterface);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`✓ V3b.3.3 seeder run completed in ${elapsed}s`);
  process.exitCode = 0;
} catch (err) {
  console.error('❌ V3b.3.3 seeder run failed:', err?.message || err);
  if (err?.parent) console.error('   parent:', err.parent.message);
  process.exitCode = 1;
} finally {
  await sequelize.close().catch(() => {});
}
