/**
 * registry.test.mjs — E1 contract tests for registry-as-data + the drift lock
 * (finding G-1).
 *
 * Locks:
 *  - the parser IS the validator: a doc row missing any field throws (acceptance);
 *    a command naming a switch absent from the inventory throws (doc-vs-doc drift);
 *    a duplicate name throws
 *  - registry.generated.json is in sync with the canon docs (doc-vs-runtime drift):
 *    buildRegistryFromDocs() deep-equals the committed JSON, and registry-build
 *    --check passes
 *  - the runtime reads the generated data: queueModel.QUEUEABLE equals the derived
 *    set, and the old hand-mirrored constants are gone from source
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseRegistryMarkdown, buildRegistryFromDocs, loadRegistry,
  getQueueable, getForbidden, getT2Rows, getT2Standing, getSwitchInventory,
  CMD_DOC_REL, SWITCH_DOC_REL,
} from './registryLib.mjs';
import { runBuild } from './registry-build.mjs';
import { QUEUEABLE } from './queueModel.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const CMD_DOC = fs.readFileSync(path.join(REPO_ROOT, CMD_DOC_REL), 'utf8');
const SWITCH_DOC = fs.readFileSync(path.join(REPO_ROOT, SWITCH_DOC_REL), 'utf8');
const src = (name) => fs.readFileSync(path.join(HERE, name), 'utf8');

/** Replace one naive-pipe cell in the health-sweep row (row has no escaped pipes). */
function mutateHealthSweep(cellIndex, value) {
  const lines = CMD_DOC.split('\n');
  const i = lines.findIndex((l) => l.includes('`health-sweep`') && l.includes('SWITCH_HEALTH_SWEEP'));
  assert.ok(i >= 0, 'health-sweep row present');
  const cells = lines[i].split('|');
  cells[cellIndex] = value;
  lines[i] = cells.join('|');
  return lines.join('\n');
}

test('parses the real canon docs into the expected shape', () => {
  const reg = parseRegistryMarkdown(CMD_DOC, SWITCH_DOC);
  assert.equal(reg.schemaVersion, 1);
  assert.equal(reg.commands.length, 24); // 13 T0 (incl. verify-until-dry) + 3 T1 + 4 T2 + 2 proposed-T2 + 1 T3 + 1 T4
  assert.equal(reg.denied.length, 5);
  assert.equal(reg.switches.length, 9);
  const hs = reg.commands.find((c) => c.name === 'health-sweep');
  assert.equal(hs.tier, 'T0');
  assert.equal(hs.approval, 'none-logged');
  assert.equal(hs.killSwitch, 'SWITCH_HEALTH_SWEEP');
  const ss = reg.commands.find((c) => c.name === 'switch-status');
  assert.equal(ss.killSwitch, null, 'switch-status has no kill switch (must work when all else is off)');
  const vud = reg.commands.find((c) => c.name === 'verify-until-dry');
  assert.equal(vud?.tier, 'T0');
  assert.deepEqual(vud?.channels, ['command-center', 'telegram', 'vscode']);
  assert.equal(vud?.killSwitch, 'SWITCH_MASTER');
  assert.ok(!vud?.channels.includes('runner'), 'Code Perfectionist must remain manual-only');
});

test('ACCEPTANCE: blanking any field in a doc row makes the parser throw', () => {
  // naive-split cells: [0]='' [1]=name [2]=desc [3]=owner [4]=channels [5]=inputs [6]=receipt [7]=kill-switch [8]=''
  assert.throws(() => parseRegistryMarkdown(mutateHealthSweep(3, '   '), SWITCH_DOC), /missing field 'owner'/);
  assert.throws(() => parseRegistryMarkdown(mutateHealthSweep(5, '   '), SWITCH_DOC), /missing field 'inputs'/);
  assert.throws(() => parseRegistryMarkdown(mutateHealthSweep(2, '   '), SWITCH_DOC), /missing field 'description'/);
});

test('DRIFT: a command naming a switch absent from the inventory throws', () => {
  const mutated = mutateHealthSweep(7, ' `SWITCH_PHANTOM` '); // kill-switch cell
  assert.throws(() => parseRegistryMarkdown(mutated, SWITCH_DOC), /absent from the kill-switch inventory/);
});

test('duplicate command name throws', () => {
  const lines = CMD_DOC.split('\n');
  const i = lines.findIndex((l) => l.includes('`health-sweep`') && l.includes('SWITCH_HEALTH_SWEEP'));
  lines.splice(i + 1, 0, lines[i]); // duplicate the row
  assert.throws(() => parseRegistryMarkdown(lines.join('\n'), SWITCH_DOC), /duplicate/i);
});

test('a doc with no switch inventory / no command rows throws', () => {
  assert.throws(() => parseRegistryMarkdown(CMD_DOC, '# empty\n'), /no switch inventory/);
  assert.throws(() => parseRegistryMarkdown('# empty\n', SWITCH_DOC), /no command rows/);
});

test('DRIFT: committed registry.generated.json is in sync with the docs', () => {
  assert.deepStrictEqual(buildRegistryFromDocs(), loadRegistry({ fresh: true }));
  assert.doesNotThrow(() => runBuild(['--check']));
});

test('derived accessors return the correct sets', () => {
  const reg = loadRegistry({ fresh: true });
  assert.deepStrictEqual(getQueueable(reg), {
    'discord-alert': { tier: 'T3', killSwitch: 'SWITCH_DISCORD_BROKER' },
    'manual-maintenance': { tier: 'T4', killSwitch: 'SWITCH_MASTER' },
  });
  assert.deepStrictEqual([...getForbidden(reg)].sort(),
    ['direct-sql', 'env-read', 'mass-client-message', 'raw-shell', 'unreviewed-model-proxy']);
  assert.deepStrictEqual([...getT2Rows(reg)].sort(),
    ['memory-note', 'queue-approve', 'queue-deny', 'receipt-prune', 'switch-flip', 'vault-init']);
  assert.deepStrictEqual([...getT2Standing(reg)].sort(),
    ['memory-note', 'queue-approve', 'queue-deny', 'switch-flip'], 'proposed rows are not on the standing allowlist');
  const inv = getSwitchInventory(reg);
  assert.equal(inv.length, 9);
  assert.ok(inv.includes('SWITCH_MASTER') && inv.includes('SWITCH_HEADLESS_RUNNER'));
});

test('runtime reads the generated data (queueModel.QUEUEABLE) — not a hand-mirror', () => {
  assert.deepStrictEqual(QUEUEABLE, getQueueable(loadRegistry({ fresh: true })));
});

test('ZERO hand-mirrored command constants left in runtime source (G-1)', () => {
  const qm = src('queueModel.mjs');
  assert.ok(qm.includes('getQueueable('), 'queueModel derives QUEUEABLE from the registry');
  assert.ok(!qm.includes('SWITCH_DISCORD_BROKER'), 'no hand-mirrored T3/T4 switch literal in queueModel');
  const lib = src('hermesRunsLib.mjs');
  assert.ok(lib.includes('getSwitchInventory('), 'hermesRunsLib derives the switch seed from the registry');
  assert.ok(!lib.includes('SWITCH_HEADLESS_RUNNER'), 'no hand-mirrored switch-inventory array in hermesRunsLib');
});

test('UX-9: doc-driven seed defaults — unbuilt surfaces ship OFF, day-1 status stays honest', async () => {
  const os = (await import('node:os')).default;
  const { seedSwitches } = await import('./hermesRunsLib.mjs');
  const reg = parseRegistryMarkdown(CMD_DOC, SWITCH_DOC);
  const byName = Object.fromEntries(reg.switches.map((s) => [s.name, s.default]));
  assert.equal(byName.SWITCH_MASTER, true);
  for (const off of ['SWITCH_HEADLESS_RUNNER', 'SWITCH_DISCORD_BROKER', 'SWITCH_BROWSER_HARNESS', 'SWITCH_STALE_CLIENT']) {
    assert.equal(byName[off], false, `${off} must default OFF until its surface ships`);
  }
  const swFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-seed-')), 'switches.json');
  const state = seedSwitches(swFile);
  assert.equal(state.SWITCH_HEADLESS_RUNNER, false, 'a landing runner slice must not be pre-armed');
  assert.equal(state.SWITCH_RECEIPT_DIGEST, true);
  assert.equal(state.SWITCH_HEALTH_SWEEP, true);
});
