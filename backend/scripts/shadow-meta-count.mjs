#!/usr/bin/env node
/**
 * shadow-meta-count.mjs — print the number of rows in "SequelizeMeta", nothing else.
 *
 * WHY THIS EXISTS
 * ---------------
 * The migration shadow check has to prove that leg B actually applied migrations against the
 * seeded database. The previous workflow could not: leg 2 ran with an empty pending set,
 * printed "No pending migrations", exited 0, and the job reported "the second time with data"
 * anyway. Counting SequelizeMeta before and after leg B is the difference between asserting
 * that migrations ran and hoping they did.
 *
 * It lives in a file rather than inline in the YAML because the inline form needed nested
 * quoting inside a `run: |` block inside a shell string — the kind of construct that breaks
 * silently and takes a CI round-trip to diagnose.
 *
 * SAFETY: read-only. One SELECT count(*). It takes no lock, writes nothing, and creates
 * nothing. It is nonetheless gated to loopback + "shadow" URLs for the same reason the seeder
 * is: a CI helper that can be pointed at production is a liability even when it only reads.
 *
 * OUTPUT: a single integer on stdout. Any failure exits non-zero with the reason on stderr —
 * never a fallback number, because a plausible-looking zero would make the caller's
 * before/after delta read as "nothing applied" and fail the job for the wrong reason.
 *
 * USAGE:  node scripts/shadow-meta-count.mjs
 */
const url = process.env.DATABASE_URL;

if (!url) {
  console.error('shadow-meta-count: DATABASE_URL is not set');
  process.exit(1);
}

// Same contract as seed-shadow-db.mjs: loopback host AND the word "shadow" in the URL, with
// no override switch. Parsed rather than regex-matched so that a hostname merely *containing*
// "localhost" (e.g. "localhost.evil.example") cannot pass.
let host;
try {
  host = new URL(url).hostname;
} catch {
  console.error('shadow-meta-count: DATABASE_URL does not parse as a URL');
  process.exit(1);
}
// The DATABASE NAME must contain "shadow" — not merely the URL somewhere. Matching the whole
// string lets the CREDENTIALS satisfy the check, so `shadow:shadow@localhost/swanstudios`
// would pass. This helper originally copied that defect verbatim from seed-shadow-db.mjs;
// both are fixed together, and the seeder's own test suite had been failing on it.
const dbName = new URL(url).pathname.slice(1);
const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
const nameOk = /shadow/i.test(dbName);
if (!isLoopback || !nameOk) {
  console.error('shadow-meta-count: refusing to run — this is a shadow-database-only helper.');
  console.error(`  host=${host} loopback=${isLoopback} database="${dbName}" name-ok=${nameOk}`);
  process.exit(1);
}

const { default: pg } = await import('pg');
const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  const res = await client.query('SELECT count(*)::int AS n FROM "SequelizeMeta"');
  console.log(res.rows[0].n);
} catch (e) {
  console.error(`shadow-meta-count: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
