import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORGE_DOCS } from '../lib/mega-blueprint-mandate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SPLITTER = join(ROOT, 'scripts/split-astra-blueprint.mjs');
const DEFAULT_DIR = 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19';
const REPLY = [
  '# Claude fixture reply',
  '## PART A — HOSTILE REVIEW', 'Synthetic findings.',
  '## PART B — FORGED PACKAGE',
  ...FORGE_DOCS.flatMap((name) => [`### ${name}`, `Synthetic content for ${name}.`]),
  '## PART C — DECISION-DENSITY SELF-TEST', 'Synthetic decisions.',
].join('\n');

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'split-provenance-'));
  t.after(() => {
    const underTemp = relative(resolve(tmpdir()), resolve(dir));
    assert.ok(underTemp && !underTemp.startsWith('..') && !isAbsolute(underTemp));
    rmSync(dir, { recursive: true, force: true });
  });
  const input = join(dir, 'inputs', 'REPLY.md');
  const outDir = join(dir, 'package');
  mkdirSync(dirname(input));
  writeFileSync(input, REPLY);
  return { dir, input, outDir };
}

function run(f, extra = [], args = ['--in', f.input, '--out-dir', f.outDir]) {
  const result = spawnSync(process.execPath, [SPLITTER, ...args, ...extra], {
    cwd: f.dir, encoding: 'utf8', timeout: 10_000,
  });
  assert.ifError(result.error);
  return result;
}

function manifest(f) { return readFileSync(join(f.outDir, 'MANIFEST.md'), 'utf8'); }
function field(text, label) {
  const line = text.split('\n').find((entry) => entry.startsWith(`**${label}:** `));
  assert.ok(line, `manifest must include ${label}`);
  return line.slice(`**${label}:** `.length).replace(/^`|`$/g, '');
}

test('T1: omitted seat stays unreported regardless of reply author text', (t) => {
  const f = fixture(t);
  const result = run(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(field(manifest(f), 'Reviewer seat'), 'unreported');
  assert.equal(readFileSync(join(f.outDir, 'HOSTILE-REVIEW.md'), 'utf8').split('\n')[0],
    '# PART A — Hostile Review (unreported)');
});

test('T2: explicit seat is reported in the actual review header and manifest', (t) => {
  const f = fixture(t);
  const seat = 'Claude Opus 5.5 / Cowork';
  const result = run(f, ['--seat', seat]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(field(manifest(f), 'Reviewer seat'), seat);
  assert.equal(readFileSync(join(f.outDir, 'HOSTILE-REVIEW.md'), 'utf8').split('\n')[0],
    `# PART A — Hostile Review (${seat})`);
});

test('T3: absolute inputs become manifest-relative paths that survive relocation', (t) => {
  const f = fixture(t);
  mkdirSync(f.outDir);
  writeFileSync(join(f.outDir, 'CONSULT-PACKET.md'), '# synthetic packet');
  const result = run(f);
  assert.equal(result.status, 0, result.stderr);
  const text = manifest(f);
  assert.equal(field(text, 'Source reply'), '../inputs/REPLY.md');
  assert.equal(field(text, 'Packet'), 'CONSULT-PACKET.md');
  assert.ok(text.includes('Paths are relative to this manifest'));
  assert.ok(!text.includes(f.dir));
  const relocated = join(f.dir, 'relocated');
  cpSync(join(f.dir, 'inputs'), join(relocated, 'inputs'), { recursive: true });
  cpSync(f.outDir, join(relocated, 'package'), { recursive: true });
  assert.equal(readFileSync(resolve(relocated, 'package', field(text, 'Source reply')), 'utf8'), REPLY);
  assert.equal(readFileSync(resolve(relocated, 'package', field(text, 'Packet')), 'utf8'), '# synthetic packet');
});

test('T4: explicit relative packet and input paths resolve from invocation directory', (t) => {
  const f = fixture(t);
  const packet = join(f.dir, 'inputs', 'REQUEST.md');
  writeFileSync(packet, '# packet');
  const result = run(f, ['--packet', 'inputs/REQUEST.md'],
    ['--in', 'inputs/REPLY.md', '--out-dir', 'package']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(field(manifest(f), 'Source reply'), '../inputs/REPLY.md');
  assert.equal(field(manifest(f), 'Packet'), '../inputs/REQUEST.md');
});

test('T5: omitted input/output preserve the legacy default locations', (t) => {
  const f = fixture(t);
  f.outDir = join(f.dir, DEFAULT_DIR);
  mkdirSync(f.outDir, { recursive: true });
  writeFileSync(join(f.outDir, 'ASTRA-PRO-REPLY.md'), REPLY);
  const result = run(f, [], []);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(field(manifest(f), 'Source reply'), 'ASTRA-PRO-REPLY.md');
  assert.equal(field(manifest(f), 'Reviewer seat'), 'unreported');
});

test('T6: value flags reject missing, blank, or following-flag values before writes', (t) => {
  for (const flag of ['--seat', '--title', '--packet', '--in', '--out-dir']) {
    for (const tail of [[], [''], ['  '], ['--check']]) {
      const f = fixture(t);
      const result = run(f, [flag, ...tail]);
      assert.notEqual(result.status, 0, `${flag} must reject ${JSON.stringify(tail)}`);
      assert.ok(result.stderr.includes(`${flag} requires a value`), result.stderr);
      assert.equal(existsSync(f.outDir), false, `${flag} must not create output`);
    }
  }
});

test('T7: unknown flags and multiline seat labels fail before writing documents', (t) => {
  for (const args of [['--unknown'], ['--seat', 'Claude\nAstra'], ['--seat', 'Claude`Astra']]) {
    const f = fixture(t);
    const result = run(f, args);
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(f.outDir), false);
  }
});

test('T8: cross-volume packet provenance fails before writing on Windows', { skip: process.platform !== 'win32' }, (t) => {
  const f = fixture(t);
  const otherDrive = resolve(f.outDir)[0].toUpperCase() === 'Z' ? 'Y' : 'Z';
  const result = run(f, ['--packet', `${otherDrive}:\\synthetic\\REQUEST.md`]);
  assert.notEqual(result.status, 0);
  assert.ok(result.stderr.includes('cannot be relative to the manifest'), result.stderr);
  assert.equal(existsSync(f.outDir), false);
});

test('T9: --check accepts explicit provenance and leaves output absent', (t) => {
  const f = fixture(t);
  const result = run(f, ['--seat', 'Caller reported seat', '--check']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(f.outDir), false);
});
