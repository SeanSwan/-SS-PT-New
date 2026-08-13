/**
 * MODULE: qa-db.guards.mjs — the check primitives behind scripts/qa/qa-db.mjs.
 * Extracted 2026-08-13 (Rule 4, 300-line cap). Same contracts, same fail-closed
 * posture; qa-db.mjs remains the only entry point and injects fail/TARGET_URL so
 * this module stays dependency-free and testable.
 */

export function createGuards({ TARGET_URL, pg }) {
const SENTINEL_TABLE = 'swan_qa_sentinel';
const SENTINEL_MARKER = 'SWAN-QA-DISPOSABLE-DATABASE';

/** Hosts that are unambiguously not local. Redundant early exit, never the proof. */
const OBVIOUSLY_REMOTE = /render\.com|amazonaws\.com|neon\.tech|supabase\.co|azure|gcp|rds\./i;

/** Real users would mean this is not the empty QA database it claims to be. */
const MAX_PLAUSIBLE_QA_USERS = 50;

function fail(message) {
  console.error(`REFUSED: ${message}`);
  process.exit(1);
}

const parsed = function() {
  try {
    return new URL(TARGET_URL.replace(/^postgres(ql)?:\/\//, 'http://'));
  } catch {
    fail('SWAN_QA_DATABASE_URL is not a parseable connection string');
    return null;
  }
}

async function connect() {
  const client = new pg.Client({ connectionString: TARGET_URL });
  try {
    await client.connect();
  } catch (error) {
    fail(`cannot reach the QA database at ${redact(TARGET_URL)} — is the container up? (${error.message})`);
  }
  return client;
}

/** Never print credentials, even for a throwaway local password. */
function redact(url) {
  return url.replace(/\/\/[^@]*@/, '//<redacted>@');
}

/**
 * Cheap checks that need no connection. These can only REJECT; passing them
 * proves nothing, which is why the sentinel check always runs afterwards.
 */
const preflight = function() {
  const url = parsed();
  const host = url.hostname;

  if (OBVIOUSLY_REMOTE.test(TARGET_URL)) fail(`target host looks remote (${host}) — QA writes are local-only`);
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    fail(`target host is ${host}; QA writes are restricted to loopback`);
  }
  // Kimi 2026-08-13: a URL with NO port ("postgresql://localhost/db") defaults
  // to 5432 while url.port is the empty string — which sailed past the string
  // compare. Treat absent as 5432, because that is what it is.
  if ((url.port || '5432') === '5432') {
    fail('port 5432 is the developer Postgres; the QA database runs on 15433 so the two cannot be confused');
  }
}

/** The actual proof: this database self-identifies as disposable. */
const assertSentinel = async function(client) {
  const { rows } = await client.query(
    `SELECT marker, created_at FROM ${SENTINEL_TABLE} LIMIT 2`,
  ).catch(() => ({ rows: null }));

  if (!rows) {
    fail(
      `no ${SENTINEL_TABLE} table — this database has not been bootstrapped as a QA database.\n`
      + '         If you believe it should be, run: node scripts/qa/qa-db.mjs bootstrap\n'
      + '         If you did NOT expect this, STOP: you may be pointed at real data.',
    );
  }
  if (rows.length !== 1 || rows[0].marker !== SENTINEL_MARKER) {
    fail(`${SENTINEL_TABLE} exists but is malformed — refusing to treat this as a QA database`);
  }
}

/** A populated user table means this is not the disposable database it claims to be. */
const assertNotPopulated = async function(client) {
  // BUG-6 (Kimi 2026-08-13): a blanket .catch defaulted to 0 users — the
  // SAFE-LOOKING answer — on permission errors, poisoned connections, anything.
  // This check fails CLOSED like the rest of the file: only "table does not
  // exist" (42P01) is an acceptable reason to see no users.
  let rows;
  try {
    ({ rows } = await client.query(`
      SELECT COALESCE((SELECT COUNT(*)::int FROM "Users"), 0) AS count
      WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Users')
    `));
  } catch (error) {
    if (error?.original?.code === '42P01' || error?.code === '42P01') {
      rows = [];
    } else {
      fail(`could not verify the "Users" table is empty (${error.message}) — refusing on uncertainty`);
    }
  }

  const count = rows[0]?.count ?? 0;
  if (count > MAX_PLAUSIBLE_QA_USERS) {
    fail(
      `"Users" holds ${count} rows — far more than a seeded QA database should. `
      + 'Refusing, because this looks like real data.',
    );
  }
  return count;
}


  return { SENTINEL_TABLE, SENTINEL_MARKER, fail, parsed, connect, redact, preflight, assertSentinel, assertNotPopulated };
}
