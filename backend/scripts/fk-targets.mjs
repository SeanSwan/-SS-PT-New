#!/usr/bin/env node
/**
 * fk-targets.mjs — which tables do this database's foreign keys actually point at?
 *
 * WHY THIS FILE EXISTS: schema-drift-check's FK_TARGET_DRIFT is the one detector never
 * proven able to fire. It reports zero FKs targeting lowercase `users` — but zero is
 * ambiguous: either the database genuinely has none (the check is working and quiet), or
 * the reporting path is dead (the check is broken and silent). Those look identical.
 *
 * WHY A FILE AND NOT A ONE-LINER: seven `node -e` probes failed with
 * "Cannot find package 'sequelize'" because a `-e` dynamic import resolves from the CWD,
 * not from the importing module. A script file inside backend/scripts/ resolves correctly —
 * which is exactly why schema-drift-check.mjs has always worked. Write the file.
 *
 * READ-ONLY. One SELECT against pg_catalog. Exit 0 always — this is a question, not a gate.
 */
import sequelize from '../database.mjs';

async function main() {
  await sequelize.authenticate();

  const [targets] = await sequelize.query(
    `SELECT f.relname AS target, count(*)::int AS n
       FROM pg_constraint con
       JOIN pg_class f ON f.oid = con.confrelid
      WHERE con.contype = 'f'
      GROUP BY 1
      ORDER BY n DESC`,
  );

  const total = targets.reduce((a, r) => a + r.n, 0);
  const userish = targets.filter((r) => r.target.toLowerCase() === 'users');

  console.log('');
  console.log(`  FK TARGETS — ${total} foreign keys across ${targets.length} target tables`);
  console.log('');
  for (const r of targets.slice(0, 15)) {
    console.log(`    ${String(r.n).padStart(4)} x  ${r.target}`);
  }
  if (targets.length > 15) console.log(`    ... and ${targets.length - 15} more target tables`);

  console.log('');
  console.log('  VERDICT for FK_TARGET_DRIFT:');
  if (userish.length === 0) {
    console.log('    No FK targets any user table (neither "Users" nor "users").');
    console.log('    => the detector reporting ZERO is a TRUE DATA FACT, not a dead code path.');
    console.log('    => it remains untriggered, therefore still unfalsified. Inverting its');
    console.log('       predicate cannot prove it fires, because there is nothing to match.');
  } else {
    for (const r of userish) {
      console.log(`    ${r.n} FK(s) target "${r.target}".`);
    }
    const lower = userish.find((r) => r.target === 'users');
    if (lower) {
      console.log('    => FKs DO target lowercase "users" and the detector reported zero.');
      console.log('    => THE DETECTOR IS BROKEN. Fix before trusting any clean report.');
    } else {
      console.log('    => FKs target canonical "Users" only; lowercase has none.');
      console.log('    => detector is correct and quiet; falsify it by inverting the');
      console.log('       predicate to "Users", which should then fire on these rows.');
    }
  }
  console.log('');

  await sequelize.close();
}

main().catch(async (err) => {
  console.error('fk-targets could not run:', err.message);
  try { await sequelize.close(); } catch { /* already closed */ }
  process.exit(2);
});
