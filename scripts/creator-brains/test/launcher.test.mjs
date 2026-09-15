#!/usr/bin/env node
/**
 * Launcher menu tests — the interactive layer over the COMMANDS table.
 *
 * The io seam is injected, so these tests drive the REAL menu with a scripted
 * input queue against a TEMP store: the pick lists render from the registry,
 * enable/disable mutates through the same setEnabled the CLI uses, and an
 * unknown key is refused without leaving the menu. Network actions (daily,
 * canary, query over a live store) are NOT driven here — they are the tested
 * COMMANDS surface; this file proves the glue.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runLauncher, MENU, renderCreators } from '../launch.mjs';
import { addCreator } from '../lib/registry.mjs';

function scriptedIo(lines) {
  const queue = [...lines];
  const printed = [];
  return {
    ask: async () => (queue.length ? queue.shift() : 'q'),
    print: (s = '') => printed.push(s),
    close: () => {},
    printed,
  };
}

function tempStore(t) {
  const r = mkdtempSync(join(tmpdir(), 'cb-launch-'));
  t.after(() => rmSync(r, { recursive: true, force: true }));
  return r;
}

test('L1 the menu offers the operator actions and quits cleanly', async (t) => {
  const r = tempStore(t);
  const io = scriptedIo(['q']);
  const code = await runLauncher({ r, io });
  assert.equal(code, 0);
  const text = io.printed.join('\n');
  for (const label of ['Status', 'List creators', 'Add a creator', 'Enable a creator', 'Run the daily pass', 'Ask the brains']) {
    assert.ok(text.includes(label), `menu shows "${label}"`);
  }
});

test('L2 an unknown key is refused without leaving the menu', async (t) => {
  const r = tempStore(t);
  const io = scriptedIo(['x', 'q']);
  console.error('L3-MARK2 before runLauncher1'); await runLauncher({ r, io }).then(() => console.error('L3-MARK3 runLauncher1 done'));
  assert.ok(io.printed.some((l) => l.includes("'x' is not on the menu")));
});

test('L3 the creator picker renders the catalog and enable flips the registry', async (t) => {
  const r = tempStore(t);
  await addCreator({ ref: '@3blue1brown', r, deps: { resolveCreator: () => ({ channelId: 'UCs4a4CRmP1UCbCQvIdCAt6g', title: '3Blue1Brown' }) } });
  const io = scriptedIo(['4', '1', '', '2', '', 'q']);
  await runLauncher({ r, io });
  const text = io.printed.join('\n');
  assert.ok(text.includes('3Blue1Brown'), 'picker shows the creator');
  assert.ok(text.includes('is now ON'), 'enable confirms');
  // The registry really flipped — the second menu pass renders it as ON.
  const io2 = scriptedIo(['2', 'q']);
  await runLauncher({ r, io: io2 });
  const line = io2.printed.find((l) => l.includes('3Blue1Brown'));
  assert.ok(/\bON\b/.test(line), `list renders ON: ${line}`);
});

test('L4 enable with an empty catalog says so instead of rendering nothing', async (t) => {
  const r = tempStore(t);
  const io = scriptedIo(['4', '', '', 'q']);
  console.error('L3-MARK2 before runLauncher1'); await runLauncher({ r, io }).then(() => console.error('L3-MARK3 runLauncher1 done'));
  assert.ok(io.printed.some((l) => l.includes('No creators in the catalog yet')));
});

test('L5 renderCreators numbers rows and reports fetch truth from the state map', () => {
  const rows = renderCreators(
    [{ channelId: 'UCa', title: 'A', enabled: true }, { channelId: 'UCb', title: 'B', enabled: false }],
    { videos: { v1: { channelId: 'UCa', state: 'fetched' }, v2: { channelId: 'UCa', state: 'failed_transient' } } },
  );
  assert.deepEqual(rows.map((r) => [r.n, r.title, r.on, r.videos, r.fetched]), [
    [1, 'A', true, 2, 1],
    [2, 'B', false, 0, 0],
  ]);
});
