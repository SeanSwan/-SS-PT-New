#!/usr/bin/env node
/**
 * spend-report.mjs — what has been spent, itemised, from the real ledger.
 * ========================================================================
 * WHY A FILE AND NOT A ONE-LINER. The spend-guard skill used to document this as a
 * `node -e "import('./scripts/lib/spend-ledger.mjs')…"` one-liner — and the gate now
 * BLOCKS that, because a runner in eval mode whose body names a `.mjs` path is an
 * execution the parser cannot attribute. The documentation recommended a command its
 * own guard refuses (verified: exit 2).
 *
 * That is the fail-closed rule working as designed, costing exactly the false block it
 * was chosen for. It also lands on this repo's standing rule the hard way: content
 * with quoting or escapes does not travel through a shell.
 *
 * Reads only. Never writes, never spends. Privacy (Rules 8/44/59): model ids, costs
 * and topic slugs — never prompt content, never keys.
 *
 * Run:  node scripts/spend-report.mjs
 *       node scripts/spend-report.mjs --topic <slug>
 */
import { readLedger, spentToday, spentOnTopic, CAPS, LEDGER_PATH } from './lib/spend-ledger.mjs';

const argv = process.argv.slice(2);
const only = (() => {
  const i = argv.indexOf('--topic');
  return i >= 0 ? argv[i + 1] : null;
})();

const rows = readLedger();
if (!rows.length) {
  console.log(`No spend recorded. Ledger: ${LEDGER_PATH}`);
  process.exit(0);
}

const money = (n) => `$${Number(n).toFixed(2)}`;
// An unpriced row counts as the per-call cap everywhere else in this system; the
// report says so rather than showing a confident $0.00 that the caps do not believe.
const rowUsd = (e) => (e.usd === null || e.usd === undefined ? CAPS.perCall : Number(e.usd) || 0);
const unpriced = rows.filter((e) => e.usd === null || e.usd === undefined).length;

if (only) {
  const mine = rows.filter((e) => e.topic === only);
  console.log(`topic "${only}": ${money(spentOnTopic(only))} of ${money(CAPS.perTopic)} across ${mine.length} call(s)`);
  // `e.ts` is formatted DEFENSIVELY. `recordSpend` always writes it, so this looked
  // safe — and `e.ts.slice(...)` threw on a row with no `ts`, and again on one where
  // `ts` was a number. Found by COMPOSITION: I had tested "a row with no ts" and
  // "--topic" separately, and this branch is the only one that touches `ts`. A list of
  // points cannot find a composition, which is the lesson round 7 taught about the
  // shape corpus, arriving here fifteen minutes after I wrote the file.
  //
  // It matters more here than the odds suggest: this is a DIAGNOSTIC. Sean runs it
  // when something is already wrong, which is exactly when a ledger might be
  // hand-edited or half-written, and exactly when a crash is least useful.
  const when = (ts) => (typeof ts === 'string' && ts.length >= 19
    ? ts.slice(0, 19).replace('T', ' ')
    : String(ts ?? '(no timestamp)').padEnd(19).slice(0, 19));
  for (const e of mine) {
    console.log(`   ${when(e.ts)}  ${String(e.model ?? '(no model)').padEnd(28)} ${money(rowUsd(e)).padStart(7)}${e.usd == null ? '  (UNPRICED, counted at the cap)' : ''}`);
  }
  process.exit(0);
}

const byTopic = new Map();
const byModel = new Map();
for (const e of rows) {
  byTopic.set(e.topic, (byTopic.get(e.topic) || 0) + rowUsd(e));
  byModel.set(e.model, (byModel.get(e.model) || 0) + rowUsd(e));
}

console.log(`today   ${money(spentToday())} of ${money(CAPS.perDay)}`);
console.log(`ledger  ${rows.length} call(s)${unpriced ? `, ${unpriced} UNPRICED (each counted at the ${money(CAPS.perCall)} cap)` : ''}`);
console.log('');

const table = (title, m, cap) => {
  console.log(title);
  for (const [k, v] of [...m].sort((a, b) => b[1] - a[1])) {
    const flag = cap && v > cap ? '  <-- over cap' : '';
    console.log(`   ${String(k).padEnd(34)} ${money(v).padStart(8)}${flag}`);
  }
  console.log('');
};
table('by topic:', byTopic, CAPS.perTopic);
table('by model:', byModel, null);

console.log(`Ledger: ${LEDGER_PATH}`);
