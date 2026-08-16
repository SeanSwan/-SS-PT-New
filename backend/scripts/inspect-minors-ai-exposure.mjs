// Read-only counts-only probe: do guardian-signed waivers link to active user
// accounts, and could those accounts reach the AI chat pipeline?
// Outputs COUNTS ONLY — no names, no emails, no IDs (Rule 8/59).
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: 'c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/backend/.env' });

const url = process.env.DATABASE_URL;
if (!url) { console.log('DATABASE_URL: missing'); process.exit(1); }

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false }, statement_timeout: 15000 });
await client.connect();

const q = async (label, sql) => {
  try {
    const r = await client.query(sql);
    console.log(label + ':', JSON.stringify(r.rows[0] ?? { n: 0, note: 'empty set' }));
  } catch (e) {
    console.log(label + ': ERROR', e.message.slice(0, 120));
  }
};

await q('guardian_waivers_total',
  `SELECT COUNT(*)::int AS n FROM waiver_records WHERE "submittedByGuardian" = true`);
await q('guardian_waivers_linked_to_user',
  `SELECT COUNT(*)::int AS n FROM waiver_records WHERE "submittedByGuardian" = true AND "userId" IS NOT NULL`);
await q('guardian_linked_users_active',
  `SELECT COUNT(DISTINCT u.id)::int AS n FROM waiver_records w JOIN "Users" u ON u.id = w."userId"
   WHERE w."submittedByGuardian" = true AND (u."isActive" IS DISTINCT FROM false)`);
await q('guardian_linked_users_by_role',
  `SELECT COALESCE(u.role::text,'null') AS role, COUNT(DISTINCT u.id)::int AS n
   FROM waiver_records w JOIN "Users" u ON u.id = w."userId"
   WHERE w."submittedByGuardian" = true GROUP BY u.role ORDER BY n DESC LIMIT 1`);
await q('guardian_linked_users_with_ai_conversations',
  `SELECT COUNT(DISTINCT c."userId")::int AS n FROM waiver_records w
   JOIN "Users" u ON u.id = w."userId"
   JOIN ai_conversations c ON c."userId" = u.id
   WHERE w."submittedByGuardian" = true`);
// Sanity + coverage denominators (R2 hostile review: zeros are meaningless without them —
// a null-DOB minor is invisible to the DOB signal, and an empty table manufactures zeros).
await q('SANITY_total_users',
  `SELECT COUNT(*)::int AS n FROM "Users"`);
await q('SANITY_total_waiver_records',
  `SELECT COUNT(*)::int AS n FROM waiver_records`);
await q('COVERAGE_users_with_null_dob',
  `SELECT COUNT(*)::int AS n FROM "Users" WHERE "dateOfBirth" IS NULL`);
await q('COVERAGE_ai_conversation_users_with_null_dob',
  `SELECT COUNT(DISTINCT c."userId")::int AS n FROM ai_conversations c
   JOIN "Users" u ON u.id = c."userId" WHERE u."dateOfBirth" IS NULL`);
await q('minors_by_dob_all_users',
  `SELECT COUNT(*)::int AS n FROM "Users"
   WHERE "dateOfBirth" IS NOT NULL AND "dateOfBirth" > (CURRENT_DATE - INTERVAL '18 years')`);
await q('minors_by_dob_with_ai_conversations',
  `SELECT COUNT(DISTINCT c."userId")::int AS n FROM "Users" u
   JOIN ai_conversations c ON c."userId" = u.id
   WHERE u."dateOfBirth" IS NOT NULL AND u."dateOfBirth" > (CURRENT_DATE - INTERVAL '18 years')`);

await client.end();
