#!/usr/bin/env node
/**
 * spend-report.test.mjs — the diagnostic must not crash on a broken ledger.
 * ==========================================================================
 * WHY THIS EXISTS. `spend-report.mjs` was written in round 11 and attacked in round
 * 12, fifteen minutes later, because every round of this workstream found its
 * blockers in the PREVIOUS round's fixes. It crashed twice.
 *
 * Both crashes needed a COMPOSITION to surface: `e.ts.slice(…)` throws only in the
 * `--topic` branch, and only on a row whose `ts` is missing or not a string. I had
 * tested "a row with no ts" and "--topic" separately and both passed. A list of
 * points cannot find a composition — the same lesson the shape corpus exists for,
 * arriving one file over.
 *
 * IT MATTERS MORE THAN THE ODDS SUGGEST. `recordSpend` always writes `ts`, so on a
 * healthy ledger these rows never occur. But this is a DIAGNOSTIC: Sean runs it when
 * something is already wrong, which is exactly when the ledger might be hand-edited
 * or half-written, and exactly when a crash is least useful.
 *
 * Run: node --test scripts/spend-report.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPORT = join(dirname(fileURLToPath(import.meta.url)), 'spend-report.mjs');
const NOW = new Date().toISOString();

function report(rows, args = []) {
  const dir = mkdtempSync(join(tmpdir(), 'swan-rep-'));
  if (rows) {
    writeFileSync(join(dir, 'ledger.jsonl'), `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`, 'utf-8');
  }
  const r = spawnSync(process.execPath, [REPORT, ...args], {
    encoding: 'utf-8', env: { ...process.env, SWAN_SPEND_DIR: dir },
  });
  rmSync(dir, { recursive: true, force: true });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

test('the report survives every malformed row shape', () => {
  const MALFORMED = [
    ['no ledger at all', null, []],
    ['a row with no ts', [{ model: 'x', topic: 'plan', usd: 0.1 }], []],
    ['a row with no topic', [{ ts: NOW, model: 'x', usd: 0.1 }], []],
    ['a row with no model', [{ ts: NOW, topic: 'plan', usd: 0.1 }], []],
    ['usd as a string', [{ ts: NOW, model: 'x', topic: 'plan', usd: '0.50' }], []],
    ['usd negative', [{ ts: NOW, model: 'x', topic: 'plan', usd: -5 }], []],
    ['unpriced row', [{ ts: NOW, model: 'x', topic: 'plan', usd: null }], []],
    // The two that actually crashed — both need --topic AND a bad ts.
    ['--topic + no ts', [{ model: 'x', topic: 'plan', usd: 0.1 }], ['--topic', 'plan']],
    ['--topic + numeric ts', [{ ts: 12345, model: 'x', topic: 'plan', usd: 0.1 }], ['--topic', 'plan']],
    ['--topic + short ts', [{ ts: '2026', model: 'x', topic: 'plan', usd: 0.1 }], ['--topic', 'plan']],
    ['--topic with no value', [{ ts: NOW, model: 'x', topic: 'plan', usd: 0.1 }], ['--topic']],
    ['--topic matching nothing', [{ ts: NOW, model: 'x', topic: 'plan', usd: 0.1 }], ['--topic', 'nope']],
  ];
  const crashed = [];
  for (const [name, rows, args] of MALFORMED) {
    const { code, out } = report(rows, args);
    if (code !== 0 || /TypeError|Cannot read|is not a function/.test(out)) crashed.push(`${name}: ${out.split('\n').find((l) => /Error/.test(l)) || `exit ${code}`}`);
  }
  assert.deepEqual(crashed, [], `a diagnostic must not crash on the data it exists to diagnose:\n${crashed.join('\n')}`);
});

test('the report never prints prompt content (Rule 8)', () => {
  // The ledger's `note` field is written by callers and is the one place free text
  // could reach it. The report must not echo it — a spend report is read and pasted
  // around, and Rules 8/44/59 say IDs and costs only.
  const { out } = report([{
    ts: NOW, model: 'x', topic: 'plan', usd: 0.1, note: 'consult-fable | CANARY-PROMPT-TEXT',
  }], []);
  assert.doesNotMatch(out, /CANARY-PROMPT-TEXT/, 'the note field must not be echoed into the report');
});

test('an UNPRICED row is counted at the cap, and SAYS so', () => {
  // Consistency with every other reader in this system: `usd: null` means "this cost
  // money and nobody could price it", and it weighs the per-call cap. A report that
  // showed $0.00 would contradict the caps it is reporting on.
  const { out } = report([{ ts: NOW, model: 'x', topic: 'plan', usd: null }], ['--topic', 'plan']);
  assert.match(out, /UNPRICED/, 'the reader must be told the number is a worst case, not a measurement');
  assert.doesNotMatch(out, /\$0\.00/, 'an unpriced call must never present as free');
});
