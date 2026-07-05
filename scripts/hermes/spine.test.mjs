/**
 * spine.test.mjs — E2 contract tests for the hardened append spine
 * (spineLib.mjs + verify-chain.mjs). Closes G-2 / G-3 / G-6.
 *
 * Locks:
 *  - G-2 single-writer: two REAL concurrent writer processes mint zero duplicate
 *    ids and leave the chain intact (the runner + Telegram broker collision)
 *  - G-3 tamper-evidence: verifyChain detects edit / delete / reorder (mid-stream
 *    prev-chain) and tail-truncation / last-line-edit (head anchor)
 *  - G-6 durability: atomicWriteFileSync leaves no temp; durableAppend is exact
 *  - withLock is re-entrant in-process and breaks a stale lock from a dead process
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ensureLanes, seedSwitches, writeReceipt, readReceipts, vaultPaths } from './hermesRunsLib.mjs';
import { withLock, verifyChain, atomicWriteFileSync, durableAppend, hashLine, GENESIS } from './spineLib.mjs';
import { runVerify } from './verify-chain.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DAY = '2026-07-01';
const WHEN = `${DAY}T06:00:00-07:00`;

function tmpVault() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-spine-'));
  ensureLanes(root);
  return root;
}
const receipt = (over = {}) => ({
  who: 'hermes/runner', what: 'health-sweep (T0)', target: 't', when: WHEN,
  'approved-by': 'n/a', outcome: 'ok — green', evidence: 'runs/logs/x.log', ...over,
});
const linesOf = (file) => fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);

// ---- G-2: single-writer, no duplicate ids under REAL 2-process concurrency ----
test('G-2: two concurrent writer processes mint zero duplicate ids', async () => {
  const root = tmpVault();
  const writer = path.join(root, 'writer.mjs');
  const libUrl = pathToFileURL(path.join(HERE, 'hermesRunsLib.mjs')).href;
  fs.writeFileSync(writer, `
import { writeReceipt } from ${JSON.stringify(libUrl)};
const [vault, count, tag] = [process.argv[2], Number(process.argv[3]), process.argv[4]];
for (let i = 0; i < count; i++) {
  writeReceipt(vault, { who: 'proc/'+tag, what: 'health-sweep (T0)', target: tag+'-'+i,
    when: ${JSON.stringify(WHEN)}, 'approved-by': 'n/a', outcome: 'ok — '+tag+' '+i, evidence: 'runs/logs/x.log' });
}
`);
  const N = 25;
  const run = (tag) => new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [writer, root, String(N), tag], { stdio: 'ignore' });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`writer ${tag} exited ${code}`))));
    p.on('error', reject);
  });
  await Promise.all([run('A'), run('B')]);

  const ids = readReceipts(root, DAY).map((r) => r.id);
  assert.equal(ids.length, 2 * N, 'every append landed');
  assert.equal(new Set(ids).size, ids.length, 'NO duplicate ids under concurrency (G-2)');
  assert.ok(verifyChain(vaultPaths(root, DAY).receiptsFile).ok, 'chain intact after concurrent writes');
});

// ---- G-3: hash chain detects tampering ----
test('G-3: a clean stream verifies and reports its count', () => {
  const root = tmpVault();
  for (let i = 0; i < 5; i++) writeReceipt(root, receipt({ outcome: `ok — ${i}` }));
  const res = verifyChain(vaultPaths(root, DAY).receiptsFile);
  assert.ok(res.ok);
  assert.equal(res.count, 5);
});

test('G-3: editing a middle line breaks the chain', () => {
  const root = tmpVault();
  for (let i = 0; i < 5; i++) writeReceipt(root, receipt({ outcome: `ok — ${i}` }));
  const file = vaultPaths(root, DAY).receiptsFile;
  const lines = linesOf(file);
  lines[2] = lines[2].replace('ok — 2', 'ok — TAMPERED');
  fs.writeFileSync(file, lines.join('\n') + '\n');
  const res = verifyChain(file);
  assert.equal(res.ok, false);
  assert.ok(res.breakAt >= 3, `break at/after the tamper (got ${res.breakAt})`);
});

test('G-3: deleting a middle line breaks the chain', () => {
  const root = tmpVault();
  for (let i = 0; i < 5; i++) writeReceipt(root, receipt({ outcome: `ok — ${i}` }));
  const file = vaultPaths(root, DAY).receiptsFile;
  const lines = linesOf(file);
  lines.splice(2, 1);
  fs.writeFileSync(file, lines.join('\n') + '\n');
  assert.equal(verifyChain(file).ok, false);
});

test('G-3: reordering two lines breaks the chain', () => {
  const root = tmpVault();
  for (let i = 0; i < 5; i++) writeReceipt(root, receipt({ outcome: `ok — ${i}` }));
  const file = vaultPaths(root, DAY).receiptsFile;
  const lines = linesOf(file);
  [lines[1], lines[2]] = [lines[2], lines[1]];
  fs.writeFileSync(file, lines.join('\n') + '\n');
  assert.equal(verifyChain(file).ok, false);
});

test('G-3: tail truncation is caught by the head anchor', () => {
  const root = tmpVault();
  for (let i = 0; i < 5; i++) writeReceipt(root, receipt({ outcome: `ok — ${i}` }));
  const file = vaultPaths(root, DAY).receiptsFile;
  const lines = linesOf(file);
  lines.pop(); // remove last line; .head anchor still records the higher count
  fs.writeFileSync(file, lines.join('\n') + '\n');
  const res = verifyChain(file);
  assert.equal(res.ok, false);
  assert.match(res.reason, /TRUNCATED/);
});

test('G-3: editing the last line is caught by the head anchor hash', () => {
  const root = tmpVault();
  for (let i = 0; i < 3; i++) writeReceipt(root, receipt({ outcome: `ok — ${i}` }));
  const file = vaultPaths(root, DAY).receiptsFile;
  const lines = linesOf(file);
  const obj = JSON.parse(lines[lines.length - 1]); // keep prev, change content only
  obj.outcome = 'ok — SILENTLY CHANGED';
  lines[lines.length - 1] = JSON.stringify(obj);
  fs.writeFileSync(file, lines.join('\n') + '\n');
  const res = verifyChain(file);
  assert.equal(res.ok, false);
  assert.match(res.reason, /last line altered/);
});

// ---- G-6: durability + atomic write ----
test('G-6: atomicWriteFileSync writes content and leaves no temp file', () => {
  const root = tmpVault();
  const f = path.join(root, 'state.json');
  atomicWriteFileSync(f, '{"a":1}\n');
  assert.equal(fs.readFileSync(f, 'utf8'), '{"a":1}\n');
  atomicWriteFileSync(f, '{"a":2}\n'); // overwrite existing via rename-replace
  assert.equal(JSON.parse(fs.readFileSync(f, 'utf8')).a, 2);
  assert.deepEqual(fs.readdirSync(root).filter((n) => n.includes('.tmp')), [], 'no .tmp leftovers');
});

test('G-6: durableAppend appends exactly and is readable', () => {
  const root = tmpVault();
  const f = path.join(root, 'a.log');
  durableAppend(f, 'one\n');
  durableAppend(f, 'two\n');
  assert.equal(fs.readFileSync(f, 'utf8'), 'one\ntwo\n');
});

// ---- withLock re-entrancy + stale-lock breaker ----
test('withLock is re-entrant in-process and cleans up its lockfile', () => {
  const root = tmpVault();
  const lp = path.join(root, 'x.lock');
  const out = withLock(lp, () => withLock(lp, () => 42)); // nested same path — no deadlock
  assert.equal(out, 42);
  assert.ok(!fs.existsSync(lp), 'lockfile removed after release');
});

test('withLock breaks a stale lock whose holder pid is DEAD', () => {
  const root = tmpVault();
  const lp = path.join(root, 'dead.lock');
  fs.writeFileSync(lp, '2147483646'); // a pid that is not alive
  const old = new Date(Date.now() - 60_000); // older than the 30s stale threshold
  fs.utimesSync(lp, old, old);
  assert.equal(withLock(lp, () => 7, { timeoutMs: 2000 }), 7); // dead holder → broken → acquired
  assert.ok(!fs.existsSync(lp));
});

test('withLock does NOT steal a stale lock from a LIVE holder', () => {
  const root = tmpVault();
  const lp = path.join(root, 'live.lock');
  fs.writeFileSync(lp, String(process.pid)); // our own pid = alive
  const old = new Date(Date.now() - 60_000);
  fs.utimesSync(lp, old, old); // stale by mtime, but the holder is alive (slow, not dead)
  assert.throws(() => withLock(lp, () => 1, { timeoutMs: 200 }), /lock timeout/); // must wait, never seize
  fs.unlinkSync(lp);
});

test('withLock release is inode-safe: never removes a lock a different pid now holds', () => {
  const root = tmpVault();
  const lp = path.join(root, 'r.lock');
  withLock(lp, () => { fs.writeFileSync(lp, '2147483646'); }); // path taken over by a "foreign pid" mid-hold
  assert.ok(fs.existsSync(lp), 'foreign-pid lock not removed by our release');
  fs.unlinkSync(lp);
});

// Append n correctly-prev-chained lines WITHOUT updating the .head anchor (forgery).
function forgeAppend(file, n) {
  for (let k = 0; k < n; k++) {
    const lines = linesOf(file);
    const prev = lines.length ? hashLine(lines[lines.length - 1]) : GENESIS;
    fs.appendFileSync(file, JSON.stringify({ id: 'FORGED', outcome: 'ok — forged', prev }) + '\n');
  }
}

test('G-3: verify-chain does NOT heal a truncation (monotonic anchor)', () => {
  const root = tmpVault();
  for (let i = 0; i < 5; i++) writeReceipt(root, receipt({ outcome: `ok — ${i}` }));
  const file = vaultPaths(root, DAY).receiptsFile;
  const lines = linesOf(file);
  lines.pop();
  fs.writeFileSync(file, lines.join('\n') + '\n'); // truncate; .head still records the higher count
  assert.equal(runVerify(root, DAY, { now: `${DAY}T23:00:00-07:00` }).ok, false, 'first verify catches truncation');
  // runVerify appended its own receipt into the stream — a second verify must STILL fail (not laundered).
  assert.equal(runVerify(root, DAY, { now: `${DAY}T23:05:00-07:00` }).ok, false, 'truncation not healed by the in-stream verify receipt');
});

test('G-3: multiple un-anchored appended lines surface a loud WARN, not a silent OK', () => {
  const root = tmpVault();
  for (let i = 0; i < 4; i++) writeReceipt(root, receipt({ outcome: `ok — ${i}` }));
  const file = vaultPaths(root, DAY).receiptsFile;
  forgeAppend(file, 2); // valid prev-chain, anchor NOT updated → lag 2 (ambiguous: multi-crash vs forgery)
  const res = verifyChain(file);
  assert.equal(res.ok, true, 'lag is genuinely ambiguous — not a definitive tamper verdict (E4 adjudicates)');
  assert.match(res.warn, /un-anchored trailing/);
});

test('G-3: a single un-anchored trailing line is a warn, not a hard fail (crash-lag)', () => {
  const root = tmpVault();
  for (let i = 0; i < 4; i++) writeReceipt(root, receipt({ outcome: `ok — ${i}` }));
  const file = vaultPaths(root, DAY).receiptsFile;
  forgeAppend(file, 1); // lag 1 — ordinary crash-lag vs one forged append
  const res = verifyChain(file);
  assert.equal(res.ok, true);
  assert.match(res.warn, /un-anchored trailing/);
});

test('G-3: an altered line BENEATH an un-anchored tail is still a hard break', () => {
  const root = tmpVault();
  for (let i = 0; i < 4; i++) writeReceipt(root, receipt({ outcome: `ok — ${i}` }));
  const file = vaultPaths(root, DAY).receiptsFile;
  forgeAppend(file, 1); // one un-anchored line on top
  const lines = linesOf(file);
  const anchored = JSON.parse(lines[3]); // the last ANCHORED line (index 3)
  anchored.outcome = 'ok — EDITED beneath the tail';
  lines[3] = JSON.stringify(anchored);
  // re-chain line 4 (the forged tail) off the edited line so only the anchor catches it
  const tail = JSON.parse(lines[4]); tail.prev = hashLine(lines[3]); lines[4] = JSON.stringify(tail);
  fs.writeFileSync(file, lines.join('\n') + '\n');
  assert.equal(verifyChain(file).ok, false, 'anchored-line edit under a trailing append is caught');
});

test('G-3: deleting the .head sidecar downgrades to a warn, never a silent OK', () => {
  const root = tmpVault();
  for (let i = 0; i < 3; i++) writeReceipt(root, receipt({ outcome: `ok — ${i}` }));
  const file = vaultPaths(root, DAY).receiptsFile;
  fs.rmSync(`${file}.head`);
  const res = verifyChain(file);
  assert.equal(res.ok, true);
  assert.match(res.warn, /head anchor missing/);
});

test('G-6: a torn crash-append is repaired, never merged into the next receipt', () => {
  const root = tmpVault();
  for (let i = 0; i < 3; i++) writeReceipt(root, receipt({ outcome: `ok — ${i}` }));
  const file = vaultPaths(root, DAY).receiptsFile;
  fs.appendFileSync(file, '{"id":"R-torn","outcome":"ok — inte'); // torn tail, no newline
  assert.equal(verifyChain(file).recoverable, true, 'torn tail flagged recoverable pre-repair');
  writeReceipt(root, receipt({ outcome: 'ok — after crash' })); // triggers repair + clean append
  const rows = readReceipts(root, DAY);
  assert.equal(rows.length, 4, 'torn fragment dropped; new receipt appended (3 + 1)');
  assert.ok(rows.every((r) => r.id !== 'R-torn'), 'the torn fragment is gone');
  assert.ok(verifyChain(file).ok, 'chain clean after repair');
});

// ---- verify-chain CLI (registered T0) ----
test('verify-chain: ok for a clean day and writes its own receipt', () => {
  const root = tmpVault();
  seedSwitches(path.join(root, 'switches.json'));
  writeReceipt(root, receipt());
  const out = runVerify(root, DAY, { now: `${DAY}T23:00:00-07:00` });
  assert.ok(out.ok);
  assert.ok(readReceipts(root, DAY).some((r) => r.what === 'verify-chain (T0)' && r.outcome.startsWith('ok')));
});

test('verify-chain: failed when a stream is broken', () => {
  const root = tmpVault();
  for (let i = 0; i < 3; i++) writeReceipt(root, receipt({ outcome: `ok — ${i}` }));
  const file = vaultPaths(root, DAY).receiptsFile;
  const lines = linesOf(file);
  lines.splice(1, 1);
  fs.writeFileSync(file, lines.join('\n') + '\n');
  assert.equal(runVerify(root, DAY, { now: `${DAY}T23:00:00-07:00` }).ok, false);
});