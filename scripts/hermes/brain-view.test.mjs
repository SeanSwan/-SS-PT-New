/**
 * brain-view.test.mjs — the graphical command center. Slice 1 (v2 redesign):
 * real-data render + the readability/layout foundation + the security gates
 * (network invariant, embed-escaper) + the ranked NBA rail.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ensureLanes, seedSwitches, writeReceipt, readReceipts } from './hermesRunsLib.mjs';
import { renderBrainView, gatherBrainData } from './brain-view.mjs';
import { escapeForEmbed } from './brainViewTemplate.mjs';
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
    'Thought stream', 'Next best action', 'class="aurora"', 'class="sparkline"', 'core-spin', 'prefers-reduced-motion']) {
    assert.ok(html.includes(s), s);
  }
  assert.ok(out.skills >= 20, 'real .claude/skills inventory rendered');
  assert.equal(out.routines, 4, 'schedule entries rendered as routine nodes');
  assert.ok(readReceipts(root, DAY).some((r) => r.what === 'brain-view (T0)' && r.evidence === out.path));
});

test('Slice-1 layout foundation: grid shell + HTML label overlay + loud NBA hero present', () => {
  const { root, swFile } = fresh();
  receipt(root);
  const html = fs.readFileSync(renderBrainView(root, swFile, DAY, { now: NOW }).path, 'utf8');
  assert.ok(html.includes('class="shell"') && html.includes('class="main"'), 'grid shell regions');
  assert.ok(html.includes('class="label-layer"') && html.includes('class="nlabel"'), 'HTML label overlay (the readability fix)');
  assert.ok(html.includes('class="graph-pane"') && html.includes('aspect-ratio:1280/640'), 'aspect-locked graph pane');
  assert.ok(/class="nba[^"]*"[\s\S]*class="lead"/.test(html), 'NBA hero band with a loud lead line');
});

test('READABILITY: no text token or font-size renders below the 13px operator floor', () => {
  const { root, swFile } = fresh();
  receipt(root);
  const html = fs.readFileSync(renderBrainView(root, swFile, DAY, { now: NOW }).path, 'utf8');
  const sizes = [...html.matchAll(/(?:font-size:\s*|--t-[a-z]+:)(\d+)px/g)].map((m) => Number(m[1]));
  assert.ok(sizes.length > 0, 'type ramp present in output');
  const tooSmall = sizes.filter((n) => n < 13);
  assert.equal(tooSmall.length, 0, `every text size >= 13px; found ${tooSmall}`);
});

test('SECURITY: zero action surface — no script/button/form/input/onclick (Slice 1 static)', () => {
  const { root, swFile } = fresh();
  const html = fs.readFileSync(renderBrainView(root, swFile, DAY, { now: NOW }).path, 'utf8').toLowerCase();
  for (const banned of ['<script', '<button', '<form', '<input', 'onclick', 'javascript:']) {
    assert.ok(!html.includes(banned), banned);
  }
});

test('SECURITY: zero network surface — the real "grants nothing" invariant (v2 B2)', () => {
  const { root, swFile } = fresh();
  const html = fs.readFileSync(renderBrainView(root, swFile, DAY, { now: NOW }).path, 'utf8');
  for (const banned of ['fetch(', 'XMLHttpRequest', 'WebSocket(', 'sendBeacon', '<script src=', 'src=http', 'src="http', 'action=http']) {
    assert.ok(!html.includes(banned), banned);
  }
});

test('SECURITY: escapeForEmbed neutralizes </script and roundtrips (v2 B1, ready for Slice 2)', () => {
  const payload = { o: 'refused — </script><img src=x onerror=window.__hit=1>', t: 'client- -sep' };
  const out = escapeForEmbed(payload);
  assert.ok(!out.includes('</script'), 'no </script breakout');
  assert.ok(!out.includes(' '), 'no raw line separator');
  assert.deepEqual(JSON.parse(out), payload, 'roundtrips to the exact value');
});

test('NBA is a RANKED rail (collect-all-true, not first-match): multiple issues -> multiple lines', () => {
  const { root, swFile } = fresh();
  // two independent true conditions: no doctor receipt today + unsigned anchor
  // (run unkeyed so anchorStatus reports 'warn'). v1 short-circuited to one; v2 collects both.
  const key = process.env.HERMES_ANCHOR_KEY;
  delete process.env.HERMES_ANCHOR_KEY;
  try {
    const d = gatherBrainData(root, swFile, DAY, { now: NOW });
    assert.ok(Array.isArray(d.nbaRail) && d.nbaRail.length >= 2, `ranked rail: ${JSON.stringify(d.nbaRail)}`);
    assert.equal(d.nba, d.nbaRail[0], 'nba is the loudest rail item');
    assert.match(d.nbaRail.join(' '), /doctor|anchor/);
  } finally { process.env.HERMES_ANCHOR_KEY = key; }
});

test('NBA truthfulness: quiet day all-green; unreadable switches dominate + health red', () => {
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

test('degrades honestly: no receipts, missing repo stores -> renders, never crashes, shows fail-closed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-brain-'));
  ensureLanes(root);
  const html = fs.readFileSync(renderBrainView(root, path.join(root, 'never.json'), DAY, { now: NOW }).path, 'utf8');
  assert.match(html, /switches UNREADABLE|fail closed/);
});
