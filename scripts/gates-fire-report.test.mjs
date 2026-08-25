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
  assert.equal(g.wouldBlockRate, 50, '2 of 4 invocations would/did block');
  assert.equal(Object.keys(g.reasons).length, 1, 'both blocks share one reason class; hatch is not a reason class');
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

test('render: under 14 days says keep shadowing; 14+ days names the enforce flip', () => {
  const short = render(analyze([row({ ts: '2026-08-24T10:00:00Z' })], { now: NOW }));
  assert.match(short, /keep shadowing/);
  const lines = [];
  for (let d = 1; d <= 15; d++) lines.push(row({ ts: `2026-08-${String(d + 9).padStart(2, '0')}T10:00:00Z` }));
  const long = render(analyze(lines, { now: NOW, days: 30 }));
  assert.match(long, /SWAN_HEREDOC_GATE=enforce/);
});
