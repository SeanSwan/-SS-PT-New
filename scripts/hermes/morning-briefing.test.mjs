/**
 * morning-briefing.test.mjs — Q-1 contracts: one composed DRAFT markdown, honest
 * degradation on missing sources, attention counting for quiet-on-green, switch
 * gate. Also covers the Q-4 help dispatcher (registry-driven, no exec map).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ensureLanes, seedSwitches, writeReceipt, readReceipts } from './hermesRunsLib.mjs';
import { renderBriefing } from './morning-briefing.mjs';
import { renderHelp } from './hermes.mjs';

process.env.HERMES_ANCHOR_KEY = 'brief-test-key';
const DAY = '2026-07-01';
const NOW = `${DAY}T06:30:00-07:00`;

function fresh() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-brief-'));
  const swFile = path.join(root, 'switches.json');
  ensureLanes(root);
  seedSwitches(swFile);
  return { root, swFile };
}
function repoFixture() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-repo-'));
  const pending = path.join(repo, '.ai-workflow', 'hermes-inbox', 'pending');
  fs.mkdirSync(pending, { recursive: true });
  fs.writeFileSync(path.join(pending, '20260701T000000Z-vs-claude-test-memo.md'), '# memo');
  fs.mkdirSync(path.join(repo, '.ai-workflow', 'continuity'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.ai-workflow', 'continuity', 'rolling-last-done.md'), '**Topic:** test closeout topic\n');
  fs.mkdirSync(path.join(repo, '.ai-workflow', 'coordination'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.ai-workflow', 'coordination', 'review-queue.md'), '### [REQ] a -> b: x\nStatus: OPEN\n');
  return repo;
}

test('briefing composes all sections + repo pulse; receipt carries the file path', () => {
  const { root, swFile } = fresh();
  writeReceipt(root, {
    who: 'harness/health-sweep', what: 'health-sweep (T0)', target: 'endpoints', when: NOW,
    'approved-by': 'n/a', outcome: 'ok — GREEN — 3/3 checked ok', evidence: 'codes',
  });
  const out = renderBriefing(root, swFile, DAY, { repoRoot: repoFixture(), now: NOW });
  const md = fs.readFileSync(out.path, 'utf8');
  for (const h of ['# Operator briefing', '## Health', '## Digest attention', '## Approval queue', '## Switches', '## Repo / agents']) assert.ok(md.includes(h), h);
  assert.match(md, /ok — GREEN/);
  assert.match(md, /1 pending hermes-inbox memo/);
  assert.match(md, /test closeout topic/);
  assert.match(md, /1 open review request/);
  assert.ok(readReceipts(root, DAY).some((r) => r.what === 'morning-briefing (T1)' && r.evidence === out.path));
});

test('quiet-on-green: green sweep + empty queue + all-on switches + clean day → attention counts only the missing digest', () => {
  const { root, swFile } = fresh();
  writeReceipt(root, {
    who: 'harness/health-sweep', what: 'health-sweep (T0)', target: 'endpoints', when: NOW,
    'approved-by': 'n/a', outcome: 'ok — GREEN — 3/3 checked ok', evidence: 'codes',
  });
  const out = renderBriefing(root, swFile, DAY, { repoRoot: repoFixture(), now: NOW });
  assert.equal(out.attention, 0);
  assert.match(fs.readFileSync(out.path, 'utf8'), /quiet-on-green: no send needed/);
});

test('missing sources degrade honestly (no sweep today, unreadable repo) and RAISE attention', () => {
  const { root, swFile } = fresh();
  const out = renderBriefing(root, swFile, DAY, { repoRoot: path.join(os.tmpdir(), 'does-not-exist-xyz'), now: NOW });
  const md = fs.readFileSync(out.path, 'utf8');
  assert.match(md, /no health-sweep has run today/);
  assert.match(md, /hermes-inbox empty|hermes-inbox unreadable/);
  assert.ok(out.attention >= 1);
});

test('switch off → refusal, fail closed', () => {
  const { root, swFile } = fresh();
  const sw = JSON.parse(fs.readFileSync(swFile, 'utf8'));
  sw.SWITCH_MORNING_BRIEFING = false;
  fs.writeFileSync(swFile, JSON.stringify(sw));
  assert.throws(() => renderBriefing(root, swFile, DAY, { now: NOW }), /SWITCH_MORNING_BRIEFING/);
});

test('help dispatcher: registry-driven, marks built vs spec-only, never an exec map', () => {
  const help = renderHelp();
  assert.match(help, /health-sweep\s+T0 .*node scripts\/hermes\/health-sweep\.mjs/);
  assert.match(help, /morning-briefing\s+T1 .*node scripts\/hermes\/morning-briefing\.mjs/);
  assert.match(help, /discord-alert.*spec’d — not built yet/);
  assert.match(help, /registry\.generated\.json is the source of truth/);
});
