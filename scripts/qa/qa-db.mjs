#!/usr/bin/env node
/**
 * SCRIPT: QA database guard — proves a target database is safe to write to.
 * PURPOSE: Bootstrap, verify, and tear down the isolated QA Postgres.
 * SAFETY: This is the gate that stands between the write-lane tests and Sean's
 *         production data. It fails CLOSED on every uncertainty.
 *
 * WHY THIS EXISTS (2026-08-12):
 * CLAUDE.md:50 records that local dev uses the PRODUCTION database via
 * DATABASE_URL. So the obvious way to run write tests "locally" writes workout
 * records against live client data. Before any write lane can exist, something
 * has to prove the target is not production — and prove it in a way that cannot
 * quietly stop working.
 *
 * HOW THE PROOF WORKS — positive identity, not a blocklist:
 * `bootstrap` writes a sentinel table into the QA database. Every later command
 * refuses unless that sentinel is present and well-formed. Production will never
 * contain it, because nothing but this script creates it.
 *
 * A blocklist ("reject render.com, reject amazonaws.com") was rejected as the
 * primary check: it fails OPEN on any host it has not been taught, which is the
 * exact shape of a rule that works until the day it matters. The blocklist is
 * kept only as a redundant early rejection, never as the proof.
 *
 * USAGE:
 *   node scripts/qa/qa-db.mjs bootstrap   # create sentinel (run once after `up`)
 *   node scripts/qa/qa-db.mjs assert      # exit 0 only if safe to write
 *   node scripts/qa/qa-db.mjs status      # human-readable, never throws on unsafe
 *   node scripts/qa/qa-db.mjs reset       # drop all data, keep the sentinel
 *
 * The connection string comes from SWAN_QA_DATABASE_URL. It is deliberately NOT
 * DATABASE_URL: reusing that name is how a QA run ends up pointed at production.
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// `pg` is a backend dependency, and ESM resolves bare specifiers from THIS
// file's directory — which walks up to the repo root, where nothing is
// installed. Resolve it explicitly against backend/ instead, so the guard works
// regardless of the caller's cwd. A guard that fails to start is a guard that
// gets skipped, and this one stands between the tests and production data.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const requireFromBackend = createRequire(path.join(repoRoot, 'backend', 'package.json'));

let pg;
try {
  pg = requireFromBackend('pg');
} catch {
  console.error(
    'Cannot load the "pg" driver from backend/node_modules.\n'
    + 'Run `npm install` in backend/ first. Refusing to continue: without a driver\n'
    + 'this script cannot verify the target database is safe to write to.',
  );
  process.exit(1);
}

// Every part is overridable, so nothing here is load-bearing for a real target.
// The assembled default trips the scanner's postgres-url pattern; that is
// registered in .secretignore scoped to THIS file and THAT pattern only, rather
// than obfuscated to slip past — a scanner people learn to dodge is worse than
// no scanner.
const QA_HOST = process.env.SWAN_QA_DB_HOST || '127.0.0.1';
const QA_PORT = process.env.SWAN_QA_DB_PORT || '15433';
const QA_USER = process.env.SWAN_QA_DB_USER || 'swan_qa';
const QA_NAME = process.env.SWAN_QA_DB_NAME || 'swan_qa';
// Must match POSTGRES_PASSWORD in docker-compose.qa.yml. Local container only:
// bound to loopback, holds nothing real, destroyed by `down -v`.
const QA_PASS = process.env.SWAN_QA_DB_PASSWORD || 'swan_qa_local_only';
const DEFAULT_URL = `postgresql://${QA_USER}:${QA_PASS}@${QA_HOST}:${QA_PORT}/${QA_NAME}`;
// Deliberately NOT named `URL`. A module-scope `const URL = "postgres://…"`
// shadows the global URL constructor, so `new URL(...)` below tries to construct
// a string and throws — which surfaced as "not a parseable connection string"
// for a perfectly valid one.
const TARGET_URL = process.env.SWAN_QA_DATABASE_URL || DEFAULT_URL;

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

function parsed() {
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
function preflight() {
  const url = parsed();
  const host = url.hostname;

  if (OBVIOUSLY_REMOTE.test(TARGET_URL)) fail(`target host looks remote (${host}) — QA writes are local-only`);
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    fail(`target host is ${host}; QA writes are restricted to loopback`);
  }
  if (url.port === '5432') {
    fail('port 5432 is the developer Postgres; the QA database runs on 15433 so the two cannot be confused');
  }
}

/** The actual proof: this database self-identifies as disposable. */
async function assertSentinel(client) {
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
async function assertNotPopulated(client) {
  const { rows } = await client.query(`
    SELECT COALESCE((SELECT COUNT(*)::int FROM "Users"), 0) AS count
    WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Users')
  `).catch(() => ({ rows: [] }));

  const count = rows[0]?.count ?? 0;
  if (count > MAX_PLAUSIBLE_QA_USERS) {
    fail(
      `"Users" holds ${count} rows — far more than a seeded QA database should. `
      + 'Refusing, because this looks like real data.',
    );
  }
  return count;
}

const commands = {
  async bootstrap() {
    preflight();
    const client = await connect();
    try {
      // Guard the guard: never stamp a sentinel onto a database that already
      // holds real-looking data, or the marker itself becomes the lie.
      const count = await assertNotPopulated(client);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${SENTINEL_TABLE} (
          marker text PRIMARY KEY,
          created_at timestamptz NOT NULL DEFAULT now(),
          note text
        )
      `);
      await client.query(
        `INSERT INTO ${SENTINEL_TABLE} (marker, note) VALUES ($1, $2)
         ON CONFLICT (marker) DO NOTHING`,
        [SENTINEL_MARKER, 'Created by scripts/qa/qa-db.mjs. Presence of this row is what allows QA writes.'],
      );
      console.log(`bootstrapped: ${redact(TARGET_URL)}`);
      console.log(`sentinel: ${SENTINEL_MARKER} (pre-existing "Users" rows: ${count})`);
    } finally {
      await client.end();
    }
  },

  async assert() {
    preflight();
    const client = await connect();
    try {
      await assertSentinel(client);
      await assertNotPopulated(client);
      console.log(`SAFE TO WRITE: ${redact(TARGET_URL)}`);
    } finally {
      await client.end();
    }
  },

  async status() {
    const url = parsed();
    console.log(`target   : ${redact(TARGET_URL)}`);
    console.log(`host/port: ${url.hostname}:${url.port}`);
    const client = new pg.Client({ connectionString: TARGET_URL });
    try {
      await client.connect();
    } catch (error) {
      console.log(`reachable: no (${error.message})`);
      return;
    }
    try {
      const { rows } = await client.query(
        `SELECT marker FROM ${SENTINEL_TABLE} LIMIT 1`,
      ).catch(() => ({ rows: [] }));
      console.log(`reachable: yes`);
      console.log(`sentinel : ${rows[0]?.marker ?? 'ABSENT — writes will be refused'}`);
      const { rows: v } = await client.query('SELECT version()');
      console.log(`server   : ${v[0].version.split(',')[0]}`);
    } finally {
      await client.end();
    }
  },

  /** Wipe data between runs without destroying the container or the sentinel. */
  async reset() {
    preflight();
    const client = await connect();
    try {
      await assertSentinel(client);          // never reset something unproven
      await client.query(`
        DO $$
        DECLARE r record;
        BEGIN
          FOR r IN
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public' AND tablename <> '${SENTINEL_TABLE}'
          LOOP
            EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
          END LOOP;
        END $$;
      `);
      console.log(`reset: all public tables dropped except ${SENTINEL_TABLE}`);
    } finally {
      await client.end();
    }
  },
};

const command = process.argv[2];
const run = commands[command];
if (!run) {
  console.error(`usage: node scripts/qa/qa-db.mjs <${Object.keys(commands).join('|')}>`);
  process.exit(1);
}

try {
  await run();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}