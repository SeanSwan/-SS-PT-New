/**
 * Read-only probe: verify the personal_records lower() unique index landed
 * and no case-duplicate groups remain. Prints structural facts only.
 * Usage: node scripts/inspect-pr-lower-index.mjs  (reads DATABASE_URL from env/.env)
 */
import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  const idx = await client.query(
    `SELECT indexname FROM pg_indexes WHERE tablename = 'personal_records' ORDER BY indexname`,
  );
  console.log('indexes:', idx.rows.map((r) => r.indexname).join(', ') || '(none)');
  const dups = await client.query(
    `SELECT COUNT(*) AS groups FROM (
       SELECT "userId", lower("exerciseName") AS lname, metric
       FROM personal_records GROUP BY 1, 2, 3 HAVING COUNT(*) > 1
     ) g`,
  );
  console.log('case-duplicate groups remaining:', dups.rows[0].groups);
  const total = await client.query(`SELECT COUNT(*)::int AS n FROM personal_records`);
  console.log('total rows:', total.rows[0].n);
} finally {
  await client.end();
}
