/** Tests for gates-fire-report.mjs — the shadow-period instrument must itself be proven. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyze, render, reasonClass } from './gates-fire-report.mjs';

const NOW = new Date('2026-08-25T12:00:00Z');
const row = (o) => JSON.stringify({ gate: 'heredoc-escape', blocked: false, shadow: true, hatch: false, bodies: 1, reasons: [], ...o });

test('reasonClass: collapses delimiter names and hazard explainers into a stable class', () => {
  const a = reasonClass('unquoted heredoc <<EOF contains ${...} (shell expands it), backtick (shell executes it)');
  const b = reasonClass('unquoted heredoc <<PYEOF contains backtick (shell executes it), ${...} (shell expands it)');
  assert.equal(a, b, 'same class regardless of delimiter name and hazard order');
  assert.match(a, /<<DELIM/);
});

test('analyze: counts would-blocks, real blocks, hatches, and allows separately', () => {
  const lines = [
    row({ ts: '2026-08-24T10:00:00Z', reasons: ['unquoted heredoc <<A contains ${...} (x)'] }), // would-block
    row({ ts: '2026-08-24T11:00:00Z' }),                                                        // clean allow
    row({ ts: '2026-08-24T12:00:00Z', blocked: true, shadow: false, reasons: ['unquoted heredoc <<B contains ${...} (x)'] }), // enforced block
    row({ ts: '2026-08-24T13:00:00Z', hatch: true, reasons: ['hatch: fixture reason here'] }),  // hatch
  ];
  const g = analyze(lines, { now: NOW }).gates['heredoc-escape'];
  assert.equal(g.invocations, 4);
  assert.equal(g.wouldBlock, 1);
  assert.equal(g.blocked, 1);
  assert.equal(g.hatch, 1);
  // Denominator excludes hatch (Ox r3 F4): 2 of 3 ORGANIC invocations block.
  assert.equal(g.wouldBlockRate, 66.67, '2 of 3 organic (non-hatch) invocations would/did block');
  assert.equal(Object.keys(g.reasons).length, 1, 'both blocks share one reason class; hatch is not a reason class');
});

test('R3 pin: a hatch row NEVER counts as wouldBlock, even with shadow+reasons set', () => {
  // Grok and GLM read the packet summary and reached OPPOSITE conclusions about this;
  // the code's else-if chain settles it — this test pins the truth.
  const lines = [
    row({ ts: '2026-08-24T10:00:00Z', hatch: true, shadow: true, reasons: ['hatch: some reason text here'] }),
  ];
  const g = analyze(lines, { now: NOW }).gates['heredoc-escape'];
  assert.equal(g.hatch, 1);
  assert.equal(g.wouldBlock, 0, 'hatch is an allow, not a would-block');
  assert.equal(g.wouldBlockRate, 0, 'no organic traffic → rate 0, not NaN');
});

test('analyze: window filtering and malformed rows are skipped, not fatal', () => {
  const lines = [
    row({ ts: '2026-08-01T00:00:00Z', reasons: ['x contains y'] }), // outside 14d window
    'this is not json',
    row({ ts: 'not-a-date' }),
    row({ ts: '2026-08-24T00:00:00Z' }),
  ];
  const r = analyze(lines, { now: NOW });
  assert.equal(r.malformed, 2);
  assert.equal(r.inWindow, 1);
  assert.equal(r.totalRows, 2, 'the out-of-window row still parsed');
});

test('render: empty window warns to VERIFY THE INSTRUMENT, never reads as clean', () => {
  const text = render(analyze([], { now: NOW }));
  assert.match(text, /VERIFY THE INSTRUMENT/);
});

test('render: readiness needs BOTH 14d span AND 100 invocations (Ox r3 F4)', () => {
  const short = render(analyze([row({ ts: '2026-08-24T10:00:00Z' })], { now: NOW }));
  assert.match(short, /keep shadowing/);
  // 15 days of span but only 15 invocations → density lacking → still shadowing.
  const sparse = [];
  for (let d = 1; d <= 15; d++) sparse.push(row({ ts: `2026-08-${String(d + 9).padStart(2, '0')}T10:00:00Z` }));
  assert.match(render(analyze(sparse, { now: NOW, days: 30 })), /keep shadowing — insufficient .*invocations/);
  // 100 invocations in ONE afternoon → span lacking → still shadowing.
  const dense = [];
  for (let i = 0; i < 100; i++) dense.push(row({ ts: `2026-08-24T10:${String(i % 60).padStart(2, '0')}:0${i % 10}Z` }));
  assert.match(render(analyze(dense, { now: NOW })), /keep shadowing — insufficient .*span/);
  // Both satisfied → the enforce flip is named.
  const full = [];
  for (let d = 1; d <= 15; d++) for (let i = 0; i < 7; i++) full.push(row({ ts: `2026-08-${String(d + 9).padStart(2, '0')}T1${i}:00:00Z` }));
  assert.match(render(analyze(full, { now: NOW, days: 30 })), /SWAN_HEREDOC_GATE=enforce/);
  // Ox r4 F1: hatch rows must not inflate the floor — 60 hatch + 45 organic over 15
  // days is only 45 real observations, NOT ready.
  const inflated = [];
  for (let d = 1; d <= 15; d++) for (let i = 0; i < 3; i++) inflated.push(row({ ts: `2026-08-${String(d + 9).padStart(2, '0')}T1${i}:00:00Z` }));
  for (let i = 0; i < 60; i++) inflated.push(row({ ts: '2026-08-20T05:00:00Z', hatch: true, reasons: ['hatch: fixture reason here'] }));
  assert.match(render(analyze(inflated, { now: NOW, days: 30 })), /keep shadowing — insufficient .*organic/);
});
