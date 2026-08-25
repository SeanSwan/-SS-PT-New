#!/usr/bin/env node
/**
 * shadow-delta-audit.mjs — classify this change's migration delta, and say which parts of it
 * the shadow gate can and cannot actually test.
 *
 * WHY THIS EXISTS (SWA-200 round 3 — GLM 5.3 R3-F1 and Ox Alpha R3-F3, found independently)
 * ----------------------------------------------------------------------------------------
 * The workflow compared two different sets and called the result an honesty gate:
 *
 *   DELTA_COUNT  = `git diff --name-only`  = CHANGED PATHS (added + modified + deleted + renamed)
 *   applied      = SequelizeMeta delta     = EXECUTED NEW NAMES
 *
 * A migration executes only when its NAME is absent from SequelizeMeta, so those sets were
 * never the same shape, and the comparison was wrong in BOTH directions:
 *
 *   - VACUOUS GREEN: a PR that ADDS one migration and MODIFIES an existing one passed. The
 *     added file ran (applied=1 > 0, gate satisfied); the modified file's name was already
 *     recorded by leg A, so it never ran — not here, and not on Render either. The single
 *     riskiest artifact in a migration diff, a hand-edit to an already-applied migration, was
 *     executed zero times while the summary claimed it had been tested against real data.
 *   - FALSE RED: a deletion-only or modify-only PR hit `DELTA_COUNT>0 && applied==0` and
 *     FATAL-ed on a legitimate change, blaming the gate for not running.
 *
 * WHAT IT ASSERTS
 *   ADDED migrations MUST execute in leg B. That is the actual test.
 *   MODIFIED / DELETED / RENAMED migrations CANNOT execute — already in SequelizeMeta. They are
 *     reported loudly and are NOT failures; failing on them was the false red above. They are
 *     nonetheless exactly what a human should look at.
 *   An ADDED migration whose target table the seeder SKIPPED is FATAL. That closes the last
 *     known vacuous-green path (round-2 F3): such a migration meets an EMPTY table in leg B,
 *     passes, and goes green, while in production that table holds rows and the same migration
 *     may fail. Round 2 only printed that into a summary no machine reads; GLM 5.3 ruled it
 *     insufficient — "visibility is not enforcement" — and specified this closure.
 *   UNKNOWN coverage is a failure, not an OK line. See shadow-table-extract.mjs.
 *
 * SAFETY: read-only. Runs `git diff` and reads files. Touches no database.
 *
 * USAGE
 *   node scripts/shadow-delta-audit.mjs --base <sha> --mode classify
 *   node scripts/shadow-delta-audit.mjs --base <sha> --mode verify --applied <n> --skipped "<a; b>"
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { tablesFromSource } from './shadow-table-extract.mjs';

const argv = process.argv.slice(2);
const arg = (f, d = '') => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d;
};

const base = arg('--base');
const mode = arg('--mode', 'classify');
if (!base) {
  console.error('shadow-delta-audit: --base <sha> is required');
  process.exit(2);
}

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

/** Only these extensions ever execute — safe-migrate.mjs getAllMigrationFiles(). */
const RUNS = /\.(cjs|js)$/;

let raw;
try {
  raw = execFileSync(
    'git',
    ['diff', '--name-status', '-M', base, 'HEAD', '--', 'backend/migrations/'],
    { encoding: 'utf8', cwd: root },
  );
} catch (e) {
  // Deliberately NOT swallowed. The previous shell form ended in `|| true`, which turned a
  // failed diff into count=0 and then into a green NOT-APPLICABLE run that had computed
  // nothing (GLM 5.3 R3-F4) — the masked-failure family already fixed twice in the workflow.
  console.error(`shadow-delta-audit: git diff failed — ${e.message}`);
  process.exit(1);
}

const added = [];
const modified = [];
const deleted = [];
const renamed = [];
const inert = []; // files in backend/migrations/ that NO runner will ever execute

for (const line of raw.split('\n')) {
  if (!line.trim()) continue;
  const parts = line.split('\t');
  const status = parts[0][0];
  const file = status === 'R' ? parts[2] : parts[1];
  if (!file) continue;
  if (!RUNS.test(file)) {
    // A file that lives in backend/migrations/, is named like a migration, and executes
    // NOWHERE. Tencent HY3, round 4: silently dropping these meant a PR adding only .mjs
    // "migrations" produced added=0, leg B reported NOT APPLICABLE, and the job went green —
    // while the migration never ran here and never will on Render. That is precisely how the
    // 36 inert .mjs files already sitting in this directory got there, one green PR at a time.
    // Skipping them quietly made this gate an accomplice to the drift it exists to catch.
    if (status !== 'D') inert.push(file);
    continue;
  }
  if (status === 'A') added.push(file);
  else if (status === 'M') modified.push(file);
  else if (status === 'D') deleted.push(file);
  else if (status === 'R') {
    renamed.push(`${parts[1]} -> ${parts[2]}`);
    added.push(parts[2]); // the new name has never run
  }
}

/** @returns {string[]|null} null means UNDETERMINABLE, never "no tables". */
function targetTables(file) {
  const p = path.join(root, file);
  if (!existsSync(p)) return null;
  return tablesFromSource(readFileSync(p, 'utf8'));
}

const report = (extra = {}) =>
  JSON.stringify({
    added: added.length,
    modified: modified.length,
    deleted: deleted.length,
    renamed: renamed.length,
    ...extra,
  });

if (mode === 'classify') {
  console.log(`SHADOW-DELTA ${report()}`);
  console.log(`added_count=${added.length}`);
  for (const f of added) console.log(`  ADDED     ${f}   (leg B WILL execute this)`);
  for (const f of modified) console.log(`  MODIFIED  ${f}   (already in SequelizeMeta — executes NOWHERE, here or in prod)`);
  for (const f of deleted) console.log(`  DELETED   ${f}   (nothing to execute)`);
  for (const f of renamed) console.log(`  RENAMED   ${f}   (new name executes; old name stays recorded)`);
  process.exit(0);
}

if (mode === 'verify') {
  const appliedRaw = arg('--applied', '');
  const applied = Number(appliedRaw);
  const skipped = arg('--skipped', '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.split(':')[0].trim()) // entries look like "Table: reason"
    // Defense in depth (Ox Alpha, round 4). The workflow no longer emits the "(none)" sentinel,
    // but a human-readable placeholder reaching this list would make skipped.length >= 1 on
    // every run — permanently arming the coverage FATAL and printing "OK ... (1 skipped)" when
    // nothing was skipped. Two independent places must agree for that to happen again.
    .filter((s) => s && !/^\(?none\)?$/i.test(s));

  if (!Number.isInteger(applied)) {
    console.error(`FATAL: --applied is not an integer ("${appliedRaw}")`);
    process.exit(1);
  }

  let fatal = false;

  if (inert.length) {
    console.error('');
    console.error('FATAL: this change adds migration-shaped file(s) that NO runner will execute.');
    console.error('safe-migrate.mjs selects only .cjs/.js; these will sit in backend/migrations/');
    console.error('looking authoritative and doing nothing — here, and on every production deploy.');
    for (const f of inert) console.error(`  INERT  ${f}`);
    console.error('');
    console.error('There are already 36 such files in this directory. Rename to .cjs, or put the');
    console.error('file somewhere that does not claim to be a migration.');
    fatal = true;
  }

  if (applied !== added.length) {
    console.error(`FATAL: this change ADDS ${added.length} migration(s) but leg B applied ${applied}.`);
    console.error('Every added migration must execute against the populated database. It did not.');
    fatal = true;
  } else if (added.length > 0) {
    console.log(`OK: all ${added.length} added migration(s) executed against populated tables.`);
  }

  if (modified.length || deleted.length || renamed.length) {
    console.log('');
    console.log('NOT TESTED BY THIS GATE — and untestable by it, by construction:');
    for (const f of modified) console.log(`  MODIFIED  ${f}`);
    for (const f of deleted) console.log(`  DELETED   ${f}`);
    for (const f of renamed) console.log(`  RENAMED   ${f}`);
    console.log('A migration already recorded in SequelizeMeta never re-runs — not here, not on');
    console.log('Render. Editing one changes only what a FRESH install would do.');

    // MODIFIED MIGRATIONS MUST BE ACKNOWLEDGED, not merely mentioned.
    //
    // Kimi K3, round 4: round 3 turned these from a false red into "green with a note", which
    // is "visibility is not enforcement" reintroduced — for the class this file's own header
    // calls the riskiest artifact in a migration diff. A note nothing reads is not a control.
    //
    // A modified file still exists, so it can carry its own acknowledgement. Deleted and
    // renamed-away files cannot, and are left as reported-only — a stated limit, not a fix.
    const unacked = modified.filter((f) => {
      const p = path.join(root, f);
      if (!existsSync(p)) return true;
      return !/\/\/\s*shadow-ack:/i.test(readFileSync(p, 'utf8'));
    });
    if (unacked.length) {
      console.error('');
      console.error('FATAL: this change edits already-applied migration(s) without acknowledgement.');
      console.error('Their names are in SequelizeMeta, so the edit runs NOWHERE — not in this job,');
      console.error('and not on Render. It changes only what a FRESH install would build, which is');
      console.error('exactly the drift nobody notices until a rebuild.');
      for (const f of unacked) console.error(`  UNACKED  ${f}`);
      console.error('');
      console.error('If the edit is deliberate, say so in the file:');
      console.error('    // shadow-ack: <why editing an applied migration is correct here>');
      console.error('Deliberate and greppable — the reviewer sees a decision, not a log line.');
      fatal = true;
    }
  }

  if (added.length > 0 && skipped.length > 0) {
    const hits = [];
    const unresolved = [];
    for (const f of added) {
      const tables = targetTables(f);
      if (tables === null) { unresolved.push(f); continue; }
      for (const t of tables) {
        if (skipped.some((s) => s.toLowerCase() === t.toLowerCase())) hits.push(`${f} -> ${t}`);
      }
    }

    if (hits.length) {
      console.error('');
      console.error('FATAL: added migration(s) target tables the seeder could not populate.');
      console.error('Leg B ran them against an EMPTY table, so this job proves nothing about them —');
      console.error('while in production those tables hold rows and the same migration may fail.');
      for (const h of hits) console.error(`  ${h}`);
      fatal = true;
    }

    if (unresolved.length) {
      // FAIL CLOSED. "I could not read this migration" is not "this migration is fine", and
      // printing OK for it would be the same vacuous-green shape as the defects that produced
      // three rejected review rounds.
      console.error('');
      console.error(`FATAL: could not determine which tables ${unresolved.length} added migration(s) touch,`);
      console.error(`and the seeder skipped ${skipped.length} table(s). Coverage is UNKNOWN, which this`);
      console.error('gate reports as a failure rather than as an OK line.');
      for (const f of unresolved) console.error(`  UNRESOLVED  ${f}`);
      console.error('');
      console.error('Fix, in order of preference:');
      console.error('  1. Use a string literal, or a file-local const, for the table name.');
      console.error('  2. If the table set is genuinely computed at runtime, declare it in the');
      console.error('     migration:   // shadow-tables: users, sessions');
      console.error('     Deliberate and greppable.');
      fatal = true;
    }

    if (!hits.length && !unresolved.length) {
      console.log(`OK: no added migration targets a skipped table (${skipped.length} skipped).`);
    }
  }

  console.log(`SHADOW-DELTA ${report({ applied, verdict: fatal ? 'FAIL' : 'PASS' })}`);
  process.exit(fatal ? 1 : 0);
}

console.error(`shadow-delta-audit: unknown --mode "${mode}"`);
process.exit(2);
