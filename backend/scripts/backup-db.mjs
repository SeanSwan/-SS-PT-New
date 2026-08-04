#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: backend/scripts/backup-db.mjs
 * PURPOSE: A production database backup that is PROVEN restorable, not assumed.
 * ADDED: 2026-08-04 (SWA-122 — code had a verified recovery path; data did not)
 * ============================================================================
 *
 * WHY THIS EXISTS. The repo had `backup-database.mjs`, which looks like a database backup and is
 * not one. Measured 2026-08-04: it never reads `DATABASE_URL`, never loads `.env`, and defaults to
 * `localhost:5432/swanstudios` as `swanadmin`. Against production credentials it cannot connect at
 * all; run non-interactively it HANGS on pg_dump's password prompt until something kills it. It also
 * wrote into `backend/backups/` — the same disk as the source. A backup tool that reassures you
 * while backing up nothing is worse than no tool, because it stops you looking for a real one.
 *
 * THE ONE THING THAT MATTERS: this RESTORES what it dumps, every run, into a scratch database, and
 * compares the result against the source. An untested restore path is not a backup — it is a belief
 * about a file. That belief is exactly the error this repo already made once with a migration's
 * `down()`: it looked correct, nothing had ever executed it, and it would have failed the first time
 * it was needed.
 *
 * WHAT A RUN DOES
 *   1. pg_dump -Fc (custom format — compressed, and `pg_restore` can read its table of contents)
 *   2. `pg_restore --list` — proves the archive header and TOC are intact
 *   3. CREATE DATABASE <scratch>, restore into it, compare TABLE COUNT and ROW COUNT against the
 *      live database, then DROP it. Always dropped, including on failure.
 *   4. If it cannot be restored, the dump is DELETED. A corrupt backup is worse than none, and
 *      keeping it means someone reaches for it during an incident.
 *   5. Retention: keep the newest N (default 10).
 *
 * REQUIRES `rolcreatedb` on the connecting role for step 3. Verified present 2026-08-04. If the role
 * loses that grant the script does NOT silently skip the restore test — it fails, because a run that
 * cannot prove restorability has not done the only job that distinguishes it from `backup-database.mjs`.
 *
 * SECURITY. The dump contains ALL production data, including client PII. It is written OUTSIDE the
 * repo (default Z:, never the source disk, never a git-tracked path) and no row content is ever
 * printed — output is counts and file sizes only. The connection string is passed to pg_dump as an
 * argument and is never echoed, never logged, and never written into a filename (CLAUDE.md rule 59).
 *
 * USAGE
 *   node backend/scripts/backup-db.mjs                 # dump + verify + restore-test + prune
 *   node backend/scripts/backup-db.mjs --verify-only   # re-verify existing dumps, create nothing
 *   node backend/scripts/backup-db.mjs --keep 20
 *   node backend/scripts/backup-db.mjs --help
 *
 * ENV: SWAN_DB_BACKUP_DIR (default Z:/SwanStudios-backups/db) · DATABASE_URL (else read from .env)
 *
 * EXIT: 0 = a restorable backup exists · 1 = verification/restore failed · 2 = could not run.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);

if (argv.includes('--help') || argv.includes('-h')) {
  console.log('usage: node backend/scripts/backup-db.mjs [--verify-only] [--keep N]');
  console.log('  Dumps the production database, then PROVES it restorable by restoring into a');
  console.log('  scratch database and comparing table + row counts. Deletes any dump that fails.');
  console.log('  Writes outside the repo. Never prints row content or the connection string.');
  console.log('  Exit 0 = restorable backup exists, 1 = verification failed, 2 = could not run.');
  process.exit(0);
}

const verifyOnly = argv.includes('--verify-only');
const keepIdx = argv.indexOf('--keep');
// VALIDATE, do not coerce. The previous line was `Math.max(1, Number(arg))`, and Number('2o') is
// NaN — Math.max(1, NaN) is NaN, and `array.slice(NaN)` is `array.slice(0)`, i.e. EVERYTHING.
// Reproduced 2026-08-04: `--keep 2o` took a successful backup and then pruned 10 of 10 dumps,
// including the one it had just written, printed `retained: NaN`, and exited 0. A single typo in
// the one argument whose entire job is "how much history do I keep" silently destroyed all of it.
// Fail loudly instead: the whole point of this file is that a backup you cannot trust is worse
// than none, and that applies hardest to its own arguments.
let KEEP = 10;
if (keepIdx !== -1) {
  const raw = argv[keepIdx + 1];
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    console.error(`  --keep expects a positive integer, got "${raw ?? ''}"`);
    console.error('  Refusing to run: an unparseable retention value would prune every dump.');
    process.exit(2);
  }
  KEEP = n;
}
const DEST = process.env.SWAN_DB_BACKUP_DIR || 'Z:/SwanStudios-backups/db';

/** Read DATABASE_URL without ever echoing it. */
function connectionUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL.trim();
  for (const rel of ['backend/.env', '.env']) {
    const p = path.join(REPO, rel);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

function human(bytes) {
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)}${u[i]}`;
}

function existingDumps() {
  try {
    return fs.readdirSync(DEST)
      .filter((f) => f.startsWith('swanstudios-') && f.endsWith('.dump'))
      .map((f) => ({ f, p: path.join(DEST, f), mtime: fs.statSync(path.join(DEST, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
  } catch { return []; }
}

/** Run psql for a single scalar, against `url`. Returns trimmed stdout or null. */
function psqlScalar(url, sql, dbOverride) {
  const target = dbOverride ? url.replace(/\/[^/?]+(\?|$)/, `/${dbOverride}$1`) : url;
  const r = spawnSync('psql', [target, '-tAc', sql], { encoding: 'utf8', timeout: 120000 });
  if (r.status !== 0) return null;
  return (r.stdout || '').trim();
}

/** Archive TOC is readable => header + structure intact. Analogous to `git bundle verify`. */
function verifyArchive(file) {
  const r = spawnSync('pg_restore', ['--list', file], { encoding: 'utf8', timeout: 300000 });
  if (r.status !== 0) {
    const why = `${r.stderr || ''}`.split('\n').filter(Boolean).slice(-1)[0] || 'pg_restore --list failed';
    return { ok: false, detail: why.trim() };
  }
  const entries = (r.stdout || '').split('\n').filter((l) => l && !l.startsWith(';')).length;
  return entries > 0
    ? { ok: true, entries }
    : { ok: false, detail: 'archive lists ZERO objects' };
}

/**
 * Drop any scratch database left behind by a previous run.
 *
 * `finally` does not run if the process is SIGKILLed, the machine loses power, or the terminal is
 * closed mid-restore. What survives is a COMPLETE UNENCRYPTED COPY OF PRODUCTION sitting on the
 * database server under a predictable name. Sweeping at startup means the window is one run, not
 * forever. Named-pattern only, and never touches anything that is not ours.
 */
function reapScratchDatabases(url) {
  const admin = url.replace(/\/[^/?]+(\?|$)/, '/postgres$1');
  const list = spawnSync('psql', [admin, '-tAc',
    `SELECT datname FROM pg_database WHERE datname LIKE 'swan\\_restoretest\\_%'`],
  { encoding: 'utf8', timeout: 60000 });
  const names = (list.stdout || '').split('\n').map((s) => s.trim()).filter(Boolean);
  for (const n of names) {
    if (!/^swan_restoretest_\d+$/.test(n)) continue; // belt-and-braces: never drop an unexpected name
    spawnSync('psql', [admin, '-tAc',
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${n}'`],
    { encoding: 'utf8', timeout: 60000 });
    const rm = spawnSync('psql', [admin, '-tAc', `DROP DATABASE IF EXISTS ${n}`], { encoding: 'utf8', timeout: 120000 });
    console.log(`  reaped       : leftover scratch database ${n}${rm.status === 0 ? '' : ' (DROP FAILED — drop it manually)'}`);
  }
  return names.length;
}

/** Exact per-table row counts. Not pg_stat estimates — those are ANALYZE-refreshed and lie. */
function tableCounts(url, db) {
  const target = db ? url.replace(/\/[^/?]+(\?|$)/, `/${db}$1`) : url;
  const sql = `SELECT string_agg(t || '=' || n, ',' ORDER BY t) FROM (
     SELECT c.relname AS t, (xpath('/row/c/text()',
       query_to_xml(format('SELECT count(*) AS c FROM %I.%I', n.nspname, c.relname), false, true, '')))[1]::text::bigint AS n
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind='r' AND n.nspname='public') s`;
  const r = spawnSync('psql', [target, '-tAc', sql], { encoding: 'utf8', timeout: 600000 });
  if (r.status !== 0) return null;
  const out = (r.stdout || '').trim();
  if (!out) return null;
  const map = new Map();
  for (const pair of out.split(',')) {
    const i = pair.lastIndexOf('=');
    if (i > 0) map.set(pair.slice(0, i), Number(pair.slice(i + 1)));
  }
  return map;
}

/** md5 over the highest-value table. Taken pre-dump so the comparison is against the same
 *  instant pg_dump snapshots — see the note at its use site. */
function digestOf(url, db) {
  return psqlScalar(url,
    `SELECT md5(string_agg(t::text, '|' ORDER BY t.id)) FROM (SELECT id, email, role FROM "Users") t`, db);
}

/**
 * The real test: restore into a scratch database and compare against the source.
 * The scratch database is dropped in `finally` — including when the restore throws.
 */
function proveRestorable(url, file, srcTables, srcCounts, srcDigest) {
  const scratch = `swan_restoretest_${process.pid}`;
  const admin = url.replace(/\/[^/?]+(\?|$)/, '/postgres$1');
  let created = false;
  try {
    const mk = spawnSync('psql', [admin, '-tAc', `CREATE DATABASE ${scratch}`], { encoding: 'utf8', timeout: 120000 });
    if (mk.status !== 0) {
      const why = `${mk.stderr || ''}`.split('\n').filter(Boolean).slice(-1)[0] || 'CREATE DATABASE failed';
      return { ok: false, detail: `cannot create scratch db (needs rolcreatedb): ${why.trim()}` };
    }
    created = true;

    const target = url.replace(/\/[^/?]+(\?|$)/, `/${scratch}$1`);
    // --no-owner / --no-privileges: the scratch db has no matching roles, and ownership is not what
    // we are testing. Exit status is not trusted alone — pg_restore warns noisily on a clean restore,
    // so the counts below are the actual verdict.
    spawnSync('pg_restore', ['--no-owner', '--no-privileges', '-d', target, file],
      { encoding: 'utf8', timeout: 900000 });

    // PER-TABLE EXACT COUNTS, not a summed estimate. The first version compared
    // sum(n_live_tup) — an ANALYZE-refreshed estimate — which cannot distinguish "restored
    // correctly" from "one table truncated and another over-counted to match". It also drifted
    // against a live source, so the check had to be given a tolerance, and a tolerance on the only
    // number that mattered made the whole test decorative.
    const gotCounts = tableCounts(url, scratch);
    if (!gotCounts || gotCounts.size === 0) {
      return { ok: false, detail: 'restored database has ZERO tables' };
    }
    if (gotCounts.size !== srcTables) {
      return { ok: false, detail: `table count ${gotCounts.size} != source ${srcTables}` };
    }

    // Compare table by table against the source snapshot taken just before the dump. A table that
    // GAINED rows is the live source moving under us — expected, and not a restore failure. A table
    // that LOST rows means the dump did not capture what was there. Only the second is fatal.
    const missing = [];
    const short = [];
    for (const [t, srcN] of srcCounts) {
      if (!gotCounts.has(t)) { missing.push(t); continue; }
      const got = gotCounts.get(t);
      if (got < srcN) short.push(`${t} ${got}<${srcN}`);
    }
    if (missing.length) {
      return { ok: false, detail: `${missing.length} table(s) absent from the restore: ${missing.slice(0, 5).join(', ')}` };
    }
    if (short.length) {
      return { ok: false, detail: `${short.length} table(s) restored with FEWER rows: ${short.slice(0, 5).join(', ')}` };
    }

    // Content check on the highest-value table: identical rows produce an identical digest, so this
    // catches truncated text and encoding corruption that a row count cannot see.
    //
    // The baseline is passed IN, captured before pg_dump ran. It used to be computed here — after
    // dump and restore, potentially minutes later — and compared against a dump that is an MVCC
    // snapshot as of dump START. Any user changing their email or role in that window produced a
    // mismatch, and the mismatch path DELETES the dump. So a routine profile edit during a backup
    // could destroy a perfectly good backup. The row-count check never had this flaw because it is
    // asymmetric (only FEWER rows is fatal); the digest is an equality test and fails both ways,
    // which is exactly why its baseline has to be taken at the same instant the dump sees.
    const gotDigest = digestOf(url, scratch);
    const digestNote = srcDigest && gotDigest
      ? (srcDigest === gotDigest ? 'Users digest MATCHES' : 'Users digest DIFFERS')
      : 'Users digest unavailable';
    if (srcDigest && gotDigest && srcDigest !== gotDigest) {
      return { ok: false, detail: 'restored "Users" content does not match the source digest' };
    }

    const total = [...gotCounts.values()].reduce((a, b) => a + b, 0);
    return {
      ok: true,
      detail: `restored ${gotCounts.size} tables, ${total} rows, every table >= source; ${digestNote}`,
    };
  } finally {
    if (created) {
      // Terminate stragglers first; a lingering connection makes DROP DATABASE fail and would
      // leave a full copy of production data sitting on the server.
      spawnSync('psql', [admin, '-tAc',
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${scratch}'`],
      { encoding: 'utf8', timeout: 60000 });
      const rm = spawnSync('psql', [admin, '-tAc', `DROP DATABASE IF EXISTS ${scratch}`],
        { encoding: 'utf8', timeout: 120000 });
      if (rm.status !== 0) {
        console.error(`  WARNING: scratch database ${scratch} could not be dropped — remove it manually`);
      }
    }
  }
}

function main() {
  console.log('\n=== database backup (pg_dump -Fc + real restore test) ===');

  const url = connectionUrl();
  if (!url) {
    console.error('  no DATABASE_URL (env or .env) — nothing to back up');
    process.exit(2);
  }
  for (const bin of ['pg_dump', 'pg_restore', 'psql']) {
    if (spawnSync(bin, ['--version'], { encoding: 'utf8' }).status !== 0) {
      console.error(`  ${bin} not on PATH — install the PostgreSQL client tools`);
      process.exit(2);
    }
  }

  if (verifyOnly) {
    const dumps = existingDumps();
    if (!dumps.length) {
      console.error(`  NO DUMPS FOUND in ${DEST} — there is no database backup to verify.`);
      process.exit(1);
    }
    let bad = 0;
    for (const d of dumps) {
      const v = verifyArchive(d.p);
      console.log(`  ${v.ok ? 'OK  ' : 'FAIL'}  ${d.f}  (${human(fs.statSync(d.p).size)}${v.ok ? `, ${v.entries} objects` : ''})`);
      if (!v.ok) { bad += 1; console.log(`        ${v.detail}`); }
    }
    console.log(bad ? `\n  ${bad} UNREADABLE dump(s) — do not rely on them\n` : '\n  all dumps verified\n');
    process.exit(bad ? 1 : 0);
  }

  try {
    fs.mkdirSync(DEST, { recursive: true });
    fs.accessSync(DEST, fs.constants.W_OK);
  } catch {
    console.error(`  target not writable: ${DEST}`);
    console.error('  set SWAN_DB_BACKUP_DIR to a writable path on a DIFFERENT disk than the database host');
    process.exit(2);
  }

  // Sweep first: a previous run killed mid-restore leaves a full unencrypted copy of production
  // on the server, and `finally` cannot help once the process is gone.
  reapScratchDatabases(url);

  // Exact per-table counts, captured BEFORE the dump so the comparison has a real baseline.
  const srcCounts = tableCounts(url);
  if (!srcCounts || srcCounts.size === 0) {
    console.error('  could not read the source schema — refusing to write a backup I cannot compare against');
    process.exit(2);
  }
  // Baseline captured BEFORE pg_dump, same as the counts — see digestOf.
  const srcDigest = digestOf(url);
  const srcTables = srcCounts.size;
  const srcRows = [...srcCounts.values()].reduce((a, b) => a + b, 0);
  console.log(`  source       : ${srcTables} tables, ${srcRows} rows (exact)`);

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const file = path.join(DEST, `swanstudios-${stamp}.dump`);
  console.log(`  target       : ${file}`);

  try {
    execFileSync('pg_dump', ['-Fc', '--no-owner', '--no-privileges', '-f', file, url],
      { stdio: ['ignore', 'ignore', 'pipe'], timeout: 900000 });
  } catch (error) {
    // Never surface the raw message unfiltered — it can contain the connection string.
    console.error(`  pg_dump FAILED (${String(error.code || 'error')})`);
    try { fs.unlinkSync(file); } catch { /* nothing to clean */ }
    process.exit(2);
  }

  console.log(`  size         : ${human(fs.statSync(file).size)}`);
  const v = verifyArchive(file);
  console.log(`  archive check: ${v.ok ? `OK — ${v.entries} objects` : 'FAILED'}`);

  const rr = v.ok ? proveRestorable(url, file, srcTables, srcCounts, srcDigest) : { ok: false, detail: 'skipped — archive check failed' };
  console.log(`  restore test : ${rr.ok ? `OK — ${rr.detail}` : 'FAILED'}`);

  if (!v.ok || !rr.ok) {
    console.error(`        ${v.ok ? rr.detail : v.detail}`);
    try {
      fs.unlinkSync(file);
      console.error('  UNRESTORABLE dump DELETED — you have no NEW backup (older ones untouched)');
    } catch { /* already gone */ }
    process.exit(1);
  }

  const all = existingDumps();
  for (const s of all.slice(KEEP)) {
    try { fs.unlinkSync(s.p); console.log(`  pruned       : ${s.f}`); } catch { /* */ }
  }
  console.log(`  retained     : ${Math.min(all.length, KEEP)} dump(s) (keep=${KEEP})`);
  console.log('\n  RESTORE:  createdb <name> && pg_restore --no-owner -d <name> <dump-file>\n');
  process.exit(0);
}

main();
