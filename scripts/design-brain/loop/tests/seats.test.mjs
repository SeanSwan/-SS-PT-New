/**
 * seats.test.mjs — the seat-drift checker must actually detect drift.
 * ===================================================================
 * A checker is only worth its exit code. These prove it sees a missing
 * transport, sees a complete bench, and refuses to report clean when it can no
 * longer parse the seat table at all.
 *
 *   S1 the real repo reports qwen missing and the other four present
 *   S2 a complete bench reports clean
 *   S3 an unparseable seat table reports BLIND, never clean
 *   S4 REGRESSION: the parser cannot be fooled by key order, indent or quotes
 *   S5 REGRESSION: a PARTIAL parse reports blind, never a silent under-report
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { auditSeats, declaredSeats } from '../../../consult-seats-check.mjs';

/** Minimal panel source with the same SEATS shape the real file uses. */
const panelSrc = (names) => `const SEATS = {
${names.map((n) => `  ${n}: {
    label: '${n}', script: 'consult-${n}.mjs', paid: false,
    args: (doc, out) => ['--document', doc],
  },`).join('\n')}
};`;

function scratch(names, present) {
  const dir = mkdtempSync(join(tmpdir(), 'seats-'));
  mkdirSync(dir, { recursive: true });
  const panel = join(dir, 'consult-panel.mjs');
  writeFileSync(panel, panelSrc(names));
  for (const n of present) writeFileSync(join(dir, `consult-${n}.mjs`), '// stub\n');
  return { dir, panel };
}

test('S1 the real repo: qwen missing, the other four present', () => {
  const r = auditSeats();
  assert.equal(r.blind, false);
  assert.deepEqual(r.missing.map((s) => s.name), ['qwen'],
    'consult-qwen.mjs is the one declared seat with no transport');
  assert.deepEqual(r.present.map((s) => s.name).sort(), ['glm', 'grok', 'kimi', 'sol']);
  assert.equal(r.ok, false);
});

test('S2 a complete bench reports clean', () => {
  const { dir, panel } = scratch(['alpha', 'beta'], ['alpha', 'beta']);
  const r = auditSeats({ panelPath: panel, scriptsDir: dir });
  assert.equal(r.ok, true);
  assert.deepEqual(r.missing, []);
  assert.equal(r.present.length, 2);
});

test('S2b a partial bench names exactly what is absent', () => {
  const { dir, panel } = scratch(['alpha', 'beta', 'gamma'], ['alpha']);
  const r = auditSeats({ panelPath: panel, scriptsDir: dir });
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing.map((s) => s.name).sort(), ['beta', 'gamma']);
});

test('S3 an unparseable seat table reports BLIND, never clean', () => {
  // The dangerous failure: the SEATS shape changes, the regex matches nothing,
  // and a checker that can see NOTHING reports everything fine.
  const dir = mkdtempSync(join(tmpdir(), 'seats-'));
  const panel = join(dir, 'consult-panel.mjs');
  writeFileSync(panel, 'export const SEATS = new Map([["alpha", {}]]);');
  const r = auditSeats({ panelPath: panel, scriptsDir: dir });
  assert.equal(r.blind, true);
  assert.equal(r.ok, false, 'blind must never be reported as ok');
  assert.match(r.error, /this checker is now blind/);
});

test('S3b a missing panel file is an error, not an empty clean bench', () => {
  const r = declaredSeats('/definitely/not/here/consult-panel.mjs');
  assert.deepEqual(r.seats, []);
  assert.match(r.error, /panel not found/);
});

test('S4 REGRESSION: key order, indent and quote style cannot hide a seat', () => {
  // The first parser required `script:` before `paid:` at exactly two spaces.
  // A reordered or reindented entry parsed as nothing — the seat vanished from
  // the audit entirely, which is the one outcome this tool exists to prevent.
  const variants = [
    [`  a: {
    label: 'a', script: 'consult-a.mjs', paid: false,
  },`, 'a'],
    [`  b: {
    label: 'b', paid: true, script: 'consult-b.mjs',
  },`, 'b'],
    [`    c: {
      script: 'consult-c.mjs', paid: false,
    },`, 'c'],
    [`  d: {
    script: "consult-d.mjs", paid: false,
  },`, 'd'],
  ];
  for (const [body, name] of variants) {
    const dir = mkdtempSync(join(tmpdir(), 'seats-'));
    const panel = join(dir, 'consult-panel.mjs');
    writeFileSync(panel, `const SEATS = {
${body}
};`);
    const r = declaredSeats(panel);
    assert.equal(r.error, null, `variant "${name}" failed to parse: ${r.error}`);
    assert.deepEqual(r.seats.map((s) => s.name), [name]);
    assert.match(r.seats[0].script, /^consult-/);
  }
});

test('S5 REGRESSION: a partial parse reports blind, never a silent under-report', () => {
  // The dangerous shape: one entry parses, another does not. Before the
  // cross-check the audit saw only the parseable seat, found its transport, and
  // reported CLEAN while the other seat's script was missing and unseen.
  const dir = mkdtempSync(join(tmpdir(), 'seats-'));
  const panel = join(dir, 'consult-panel.mjs');
  writeFileSync(panel, `const SEATS = {
  a: {
    script: 'consult-a.mjs', paid: false,
  },
  b: {
    paid: false, script: 'consult-b.mjs',
  },
};`);
  writeFileSync(join(dir, 'consult-a.mjs'), '// stub');

  const r = auditSeats({ panelPath: panel, scriptsDir: dir });
  assert.equal(r.ok, false, 'a missing transport must never report ok');
  assert.deepEqual(r.missing.map((s) => s.name), ['b'],
    'the reordered entry is still audited — before the fix it vanished and the audit reported CLEAN');
});
