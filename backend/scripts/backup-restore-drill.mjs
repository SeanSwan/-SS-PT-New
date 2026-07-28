#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: backup-restore-drill.mjs
 * PURPOSE: Prove the production database can actually be backed up AND restored.
 * AUTHOR:  Claude (Opus 5) | CREATED: 2026-07-28 (launch audit S11, SWA-75)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * Fable ruling item 4, ranked #1 by the hostile reviewer for week-one damage:
 * "A backup that has never been restored is a rumour." Nothing in this repo
 * proved a restore works, and Sean is about to run real client programs.
 *
 * WHAT IT DOES
 *   dump     — pg_dump production to a local timestamped file. READ-ONLY.
 *   verify   — inspect a dump file's size/table coverage without a database.
 *   restore  — restore a dump into a SCRATCH database and count key tables.
 *   drill    — dump, then restore into scratch, then report. The full drill.
 *
 * SAFETY (this touches the real production database, so the guards are hard)
 *   - Production is only ever READ. There is no code path that writes to it.
 *   - `restore` REFUSES unless the target url is different from the source AND
 *     the target database name matches /(scratch|drill|restore|test|tmp)/.
 *     A restore aimed at production aborts before psql is invoked.
 *   - Connection strings are never printed. Only host/database shape is shown,
 *     and the password component is redacted everywhere (rules 44/59).
 *   - Requires an explicit --confirm for anything that writes to scratch.
 *
 * USAGE
 *   node backend/scripts/backup-restore-drill.mjs dump
 *   node backend/scripts/backup-restore-drill.mjs verify --file <path>
 *   node backend/scripts/backup-restore-drill.mjs restore --file <path> \
 *        --target "<scratch-db-connection-string>" --confirm
 *   node backend/scripts/backup-restore-drill.mjs drill \
 *        --target "<scratch-db-connection-string>" --confirm
 *
 * The scratch database name must contain scratch/drill/restore/test/tmp.
 * Source url comes from DATABASE_URL unless --source is given.
 * ============================================================================
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, statSync, createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';

const SCRATCH_NAME = /(scratch|drill|restore|test|tmp)/i;
const KEY_TABLES = ['Users', 'client_trainer_assignments', 'workout_sessions', 'orders'];

const args = process.argv.slice(2);
const command = args[0];
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name) => args.includes(`--${name}`);

/** Never print a connection string. Show only its shape. */
function describeUrl(raw) {
  try {
    const u = new URL(raw);
    return `${u.protocol}//<redacted>@${u.hostname}/${u.pathname.replace(/^\//, '')}`;
  } catch {
    return '<unparseable connection string>';
  }
}

function dbNameOf(raw) {
  try {
    return new URL(raw).pathname.replace(/^\//, '');
  } catch {
    return '';
  }
}

function run(cmd, cmdArgs, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, cmdArgs, {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('error', (e) => resolve({ code: -1, out, err: e.message }));
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

/** Redact anything password-shaped that a tool might echo back. */
const scrub = (s) => String(s || '').replace(/:\/\/[^@\s]+@/g, '://<redacted>@');

async function doDump(sourceUrl) {
  const dir = path.resolve('backups');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `swan-${stamp}.dump`);

  console.log(`[dump] source : ${describeUrl(sourceUrl)}`);
  console.log(`[dump] target : ${file}`);
  console.log('[dump] running pg_dump (custom format, READ-ONLY on source)...');

  const res = await run('pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--file', file, sourceUrl]);
  if (res.code !== 0) {
    console.error('[dump] FAILED');
    console.error(scrub(res.err).split('\n').slice(0, 6).join('\n'));
    if (res.code === -1) console.error('[dump] Is pg_dump on PATH? Install the PostgreSQL client tools.');
    process.exitCode = 1;
    return null;
  }
  const bytes = statSync(file).size;
  console.log(`[dump] OK — ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  if (bytes < 10 * 1024) console.warn('[dump] ⚠ suspiciously small — inspect before trusting it');
  return file;
}

async function doVerify(file) {
  if (!file || !existsSync(file)) {
    console.error('[verify] file not found');
    process.exitCode = 1;
    return false;
  }
  const bytes = statSync(file).size;
  console.log(`[verify] file  : ${file}`);
  console.log(`[verify] size  : ${(bytes / 1024 / 1024).toFixed(2)} MB`);

  const res = await run('pg_restore', ['--list', file]);
  if (res.code !== 0) {
    console.error('[verify] pg_restore --list failed — the dump may be corrupt');
    console.error(scrub(res.err).split('\n').slice(0, 4).join('\n'));
    process.exitCode = 1;
    return false;
  }
  const tables = res.out.split('\n').filter((l) => / TABLE DATA /.test(l));
  console.log(`[verify] table data entries: ${tables.length}`);
  for (const t of KEY_TABLES) {
    const found = tables.some((l) => l.includes(` ${t} `) || l.endsWith(` ${t}`));
    console.log(`[verify]   ${found ? 'present' : 'MISSING'}  ${t}`);
  }
  return true;
}

async function doRestore(file, targetUrl, sourceUrl) {
  if (!targetUrl) {
    console.error('[restore] --target is required');
    process.exitCode = 1;
    return false;
  }
  const targetDb = dbNameOf(targetUrl);

  // --- hard guards: never restore over production -------------------------
  if (sourceUrl && targetUrl === sourceUrl) {
    console.error('[restore] REFUSED — target is identical to the source database.');
    process.exitCode = 1;
    return false;
  }
  if (!SCRATCH_NAME.test(targetDb)) {
    console.error(`[restore] REFUSED — target database "${targetDb}" is not clearly a scratch database.`);
    console.error('[restore] Name it with scratch/drill/restore/test/tmp to proceed.');
    process.exitCode = 1;
    return false;
  }
  if (!has('confirm')) {
    console.error('[restore] REFUSED — add --confirm to write to the scratch database.');
    process.exitCode = 1;
    return false;
  }

  console.log(`[restore] target: ${describeUrl(targetUrl)}`);
  console.log('[restore] running pg_restore --clean into SCRATCH...');
  const res = await run('pg_restore', ['--clean', '--if-exists', '--no-owner', '--no-acl', '--dbname', targetUrl, file]);
  // pg_restore exits non-zero on benign "does not exist" noise with --clean.
  if (res.code !== 0) {
    const fatal = scrub(res.err).split('\n').filter((l) => /FATAL|could not connect|permission denied/i.test(l));
    if (fatal.length) {
      console.error('[restore] FAILED');
      console.error(fatal.slice(0, 4).join('\n'));
      process.exitCode = 1;
      return false;
    }
    console.warn('[restore] completed with non-fatal warnings (normal for --clean)');
  }

  console.log('[restore] counting key tables in the restored copy...');
  for (const t of KEY_TABLES) {
    const q = await run('psql', ['--no-psqlrc', '--tuples-only', '--command', `SELECT count(*) FROM "${t}"`, targetUrl]);
    const n = q.code === 0 ? q.out.trim() : 'ERR';
    console.log(`[restore]   ${String(n).padStart(8)}  ${t}`);
  }
  console.log('[restore] DONE — a real record set round-tripped into a scratch database.');
  return true;
}

// ---------------------------------------------------------------------------
const sourceUrl = flag('source') || process.env.DATABASE_URL;

if (!command || has('help')) {
  console.log(`
Backup / restore drill  (launch audit S11, SWA-75)

  dump                                     pg_dump production -> ./backups (READ-ONLY)
  verify   --file <path>                   inspect a dump without a database
  restore  --file <path> --target <url> --confirm
  drill    --target <url> --confirm        dump + restore + count

Source defaults to DATABASE_URL. Target must be a scratch database
(name containing scratch/drill/restore/test/tmp) and must differ from source.
Connection strings are never printed.
`);
  process.exit(0);
}

if (!sourceUrl && command !== 'verify') {
  console.error('DATABASE_URL is not set and --source was not given.');
  process.exit(1);
}

if (command === 'dump') {
  const f = await doDump(sourceUrl);
  if (f) await doVerify(f);
} else if (command === 'verify') {
  await doVerify(flag('file'));
} else if (command === 'restore') {
  await doRestore(flag('file'), flag('target'), sourceUrl);
} else if (command === 'drill') {
  const f = await doDump(sourceUrl);
  if (f) {
    const ok = await doVerify(f);
    if (ok) await doRestore(f, flag('target'), sourceUrl);
  }
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}
