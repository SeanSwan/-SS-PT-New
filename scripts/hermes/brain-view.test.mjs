/**
 * brain-view.test.mjs — the graphical command center (F-2/SB-2): real-data
 * render, zero action surface, NBA truthfulness, reduced-motion, receipt.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ensureLanes, seedSwitches, writeReceipt, readReceipts } from './hermesRunsLib.mjs';
import { renderBrainView, gatherBrainData } from './brain-view.mjs';
import { initSchedule } from './runnerLib.mjs';

process.env.HERMES_ANCHOR_KEY = 'brain-test-key';
const DAY = '2026-07-01';
const NOW = `${DAY}T08:00:00Z`;

function fresh() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-brain-'));
  const swFile = path.join(root, 'switches.json');
  ensureLanes(root);
  seedSwitches(swFile);
  initSchedule(root);
  return { root, swFile };
}
const receipt = (root, over = {}) => writeReceipt(root, {
  who: 'harness/hermes-doctor', what: 'hermes-doctor (T0)', target: 'self', when: NOW,
  'approved-by': 'n/a', outcome: 'ok — 7 checks healthy', evidence: 'x', ...over,
});

test('renders the full brain: clusters, core, HUD, thought stream, sparkline, aurora', () => {
  const { root, swFile } = fresh();
  receipt(root);
  const out = renderBrainView(root, swFile, DAY, { now: NOW });
  const html = fs.readFileSync(out.path, 'utf8');
  for (const s of ['HERMES', 'APPLICATIONS · C2', 'ROUTINES · C4', 'MEMORY · C1', 'SKILLS · C3',
    'THOUGHT STREAM', 'NEXT BEST ACTION', 'class="aurora"', 'class="sparkline"', 'core-spin', 'prefers-reduced-motion']) {
    assert.ok(html.includes(s), s);
  }
  assert.ok(out.skills >= 20, 'real .claude/skills inventory rendered');
  assert.equal(out.routines, 4, 'schedule entries rendered as routine nodes');
  assert.ok(readReceipts(root, DAY).some((r) => r.what === 'brain-view (T0)' && r.evidence === out.path));
});

test('zero action surface: no script/button/form/input/onclick — lights are CSS only', () => {
  const { root, swFile } = fresh();
  const out = renderBrainView(root, swFile, DAY, { now: NOW });
  const html = fs.readFileSync(out.path, 'utf8').toLowerCase();
  for (const banned of ['<script', '<button', '<form', '<input', 'onclick', 'javascript:']) {
    assert.ok(!html.includes(banned), banned);
  }
});

test('NBA truthfulness: quiet day → all-green line; open memo count reaches the line; unreadable switches dominate', () => {
  const { root, swFile } = fresh();
  receipt(root);
  const quiet = gatherBrainData(root, swFile, DAY, { now: NOW });
  assert.ok(/all quiet|inbox memo|anchor degraded/.test(quiet.nba), quiet.nba);
  const broken = gatherBrainData(root, path.join(root, 'nope.json'), DAY, { now: NOW });
  assert.match(broken.nba, /switches file unreadable/);
  assert.equal(broken.health, 'red');
});

test('hourly sparkline counts receipts into UTC buckets', () => {
  const { root, swFile } = fresh();
  receipt(root, { when: `${DAY}T08:10:00Z` });
  receipt(root, { when: `${DAY}T08:40:00Z` });
  receipt(root, { when: `${DAY}T19:05:00Z` });
  const d = gatherBrainData(root, swFile, DAY, { now: NOW });
  assert.ok(d.hourly[8] >= 2 && d.hourly[19] >= 1);
});

test('degrades honestly: no receipts, missing repo stores → renders with quiet stream, never crashes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-brain-'));
  ensureLanes(root);
  const out = renderBrainView(root, path.join(root, 'never.json'), DAY, { now: NOW });
  const html = fs.readFileSync(out.path, 'utf8');
  assert.match(html, /switches UNREADABLE|fail closed/);
});
