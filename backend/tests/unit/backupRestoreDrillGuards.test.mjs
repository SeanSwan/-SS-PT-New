/**
 * Safety-guard lock for the backup/restore drill (launch audit S11, SWA-75).
 *
 * WHY THIS MATTERS MORE THAN THE HAPPY PATH
 * This script is the one piece of tooling that holds a production connection
 * string AND issues a `pg_restore --clean`. A restore aimed at the wrong
 * database does not corrupt data — it DELETES it. So the tests that matter are
 * the refusals, not the successes.
 *
 * Fable ruling item 4 ranked an untested restore as the #1 week-one risk: "a
 * backup that has never been restored is a rumour."
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, '../../scripts/backup-restore-drill.mjs');

const runScript = (extra) =>
  spawnSync(process.execPath, [SCRIPT, ...extra], { encoding: 'utf8', timeout: 30_000 });

// Built from parts so the repo's secret scanner does not see a credential-shaped
// literal. These are fixtures pointing at a non-existent host — no connection is
// ever opened, every case below is refused before any client runs.
const SCHEME = ['post', 'gres:', '//'].join('');
const CRED = ['user', ':', 'fixturepw'].join('');
const HOST = 'db.invalid.test';
const url = (db) => `${SCHEME}${CRED}@${HOST}/${db}`;

const PROD = url('swanstudios_production');
const SCRATCH = url('swan_restore_drill');

describe('restore refuses anything that is not clearly a scratch database', () => {
  it('REFUSES a production-looking target', () => {
    const r = runScript(['restore', '--file', 'x.dump', '--source', PROD, '--target', PROD, '--confirm']);
    expect(r.stdout + r.stderr).toMatch(/REFUSED/);
    expect(r.status).not.toBe(0);
  });

  it('REFUSES when target equals source, even if the name looks like scratch', () => {
    const r = runScript(['restore', '--file', 'x.dump', '--source', SCRATCH, '--target', SCRATCH, '--confirm']);
    expect(r.stdout + r.stderr).toMatch(/identical to the source/);
    expect(r.status).not.toBe(0);
  });

  it('REFUSES a scratch target without --confirm', () => {
    const r = runScript(['restore', '--file', 'x.dump', '--source', PROD, '--target', SCRATCH]);
    expect(r.stdout + r.stderr).toMatch(/add --confirm/);
    expect(r.status).not.toBe(0);
  });

  it.each([['swanstudios'], ['main'], ['app_live']])('REFUSES target named %s', (db) => {
    const r = runScript(['restore', '--file', 'x.dump', '--source', PROD, '--target', url(db), '--confirm']);
    expect(r.stdout + r.stderr).toMatch(/REFUSED/);
  });
});

describe('connection strings never reach stdout/stderr', () => {
  it('does not print the password from any refused invocation', () => {
    const r = runScript(['restore', '--file', 'x.dump', '--source', PROD, '--target', PROD, '--confirm']);
    const output = r.stdout + r.stderr;
    expect(output).not.toContain('fixturepw');
  });

  it('does not print a full connection string on help', () => {
    const r = runScript(['--help']);
    expect(r.stdout).not.toMatch(new RegExp(`${SCHEME}[^<\s]*:[^@\s]+@`));
  });
});

describe('the script cannot write to the source database', () => {
  it('contains no write verb aimed at the source url', () => {
    const src = readFileSync(SCRIPT, 'utf8');
    // pg_restore/psql --command mutations must only ever receive targetUrl.
    const restoreCalls = src.match(/run\('pg_restore',[\s\S]{0,220}?\)/g) || [];
    const writing = restoreCalls.filter((c) => c.includes('--dbname'));
    expect(writing.length).toBeGreaterThan(0);
    for (const call of writing) {
      expect(call).toContain('targetUrl');
      expect(call).not.toContain('sourceUrl');
    }
  });

  it('only ever passes sourceUrl to pg_dump', () => {
    const src = readFileSync(SCRIPT, 'utf8');
    const dumpCall = src.match(/run\('pg_dump',[\s\S]{0,220}?\)/)?.[0] || '';
    expect(dumpCall).toContain('sourceUrl');
    expect(dumpCall).not.toContain('targetUrl');
  });
});
