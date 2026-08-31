#!/usr/bin/env node
/** Exit-code contracts for the validator CLI, including false-green refusal. */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CLI = join(ROOT, 'scripts/assets/validate-asset.mjs');
let passed = 0;
let failed = 0;

function run(args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, SWAN_ALLOW_DEGRADED: '' },
  });
}

function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

check('no manifest input exits 2 as an instrument failure', () => {
  const result = run([]);
  if (result.status !== 2) throw new Error(`exit ${result.status}`);
  if (!/INSTRUMENT FAILURE/.test(result.stderr)) throw new Error('missing instrument-failure receipt');
});

check('unreadable manifest exits 2', () => {
  const result = run(['definitely-missing-manifest.json']);
  if (result.status !== 2) throw new Error(`exit ${result.status}`);
  if (!/manifest not readable/.test(result.stderr)) throw new Error('missing unreadable-manifest receipt');
});

check('checked-in runtime manifests exit 0', () => {
  const result = run(['--all']);
  if (result.status !== 0) throw new Error(`exit ${result.status}: ${result.stdout} ${result.stderr}`);
  if (!/4\/4 valid/.test(result.stdout)) throw new Error('missing exact all-valid count');
});

const fixtureRoot = mkdtempSync(join(tmpdir(), 'swan-asset-cli-'));
const fixtureAsset = join(fixtureRoot, 'fryling');

try {
  cpSync(join(ROOT, 'assets/runtime/enemy/fryling'), fixtureAsset, { recursive: true });
  const manifestPath = join(fixtureAsset, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.status = 'not-a-real-status';
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  check('invalid manifest exits 1 with the exact rule finding', () => {
    const result = run([manifestPath]);
    if (result.status !== 1) throw new Error(`exit ${result.status}: ${result.stdout} ${result.stderr}`);
    if (!/status must be one of/.test(result.stdout)) throw new Error('missing exact status finding');
  });
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log(`${passed}/${passed + failed} checks passed`);
process.exit(failed === 0 ? 0 : 1);
