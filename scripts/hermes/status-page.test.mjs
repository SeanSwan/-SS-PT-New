/**
 * status-page.test.mjs — slice-3 v0 contracts: real-data render, honest
 * degradation, zero action surface, receipt written.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ensureLanes, seedSwitches, writeReceipt, readReceipts } from './hermesRunsLib.mjs';
import { renderStatusPage } from './status-page.mjs';

process.env.HERMES_ANCHOR_KEY = 'status-test-key';
const DAY = '2026-07-01';
const NOW = `${DAY}T07:00:00-07:00`;

function fresh() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-status-'));
  const swFile = path.join(root, 'switches.json');
  ensureLanes(root);
  seedSwitches(swFile);
  return { root, swFile };
}

test('renders all five panels from real stores + writes a receipt', () => {
  const { root, swFile } = fresh();
  writeReceipt(root, {
    who: 'harness/hermes-doctor', what: 'hermes-doctor (T0)', target: 'self', when: NOW,
    'approved-by': 'n/a', outcome: 'ok — 6 checks healthy', evidence: 'x',
  });
  const out = renderStatusPage(root, swFile, DAY, { now: NOW });
  const html = fs.readFileSync(out.path, 'utf8');
  for (const h of ['Health', 'Kill switches', 'Approval queue', 'last receipts', 'Artifacts']) assert.ok(html.includes(h), h);
  assert.match(html, /doctor: ok — 6 checks healthy/);
  assert.match(html, /SWITCH_MASTER<\/td><td><b class="on">ON/);
  assert.match(html, /empty — nothing awaits approval/);
  assert.ok(readReceipts(root, DAY).some((r) => r.what === 'status-page (T0)' && r.evidence === out.path));
});

test('zero action surface: no <button>, <form>, <script>, or onclick anywhere', () => {
  const { root, swFile } = fresh();
  const out = renderStatusPage(root, swFile, DAY, { now: NOW });
  const html = fs.readFileSync(out.path, 'utf8').toLowerCase();
  for (const banned of ['<button', '<form', '<script', 'onclick', '<input']) assert.ok(!html.includes(banned), banned);
});

test('honest degradation: no doctor run today + unreadable switches are shown, not hidden', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-status-'));
  ensureLanes(root);
  const out = renderStatusPage(root, path.join(root, 'never-seeded.json'), DAY, { now: NOW });
  const html = fs.readFileSync(out.path, 'utf8');
  assert.match(html, /no hermes-doctor receipt today/);
  assert.match(html, /switches UNREADABLE .* fails closed/);
});

test('receipt outcomes carry open-count + anchor level for the runner/panel contract', () => {
  const { root, swFile } = fresh();
  renderStatusPage(root, swFile, DAY, { now: NOW });
  const rec = readReceipts(root, DAY).find((r) => r.what === 'status-page (T0)');
  assert.match(rec.outcome, /^ok — rendered \(0 open, anchor (ok|warn)\)/);
});
