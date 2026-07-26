/**
 * novelty.test.mjs — the saturation dial + its two false-positive guards (Kimi §2 / §9).
 * Run: node --test scripts/design-brain/tests/novelty.test.mjs
 *
 * Reproduces Kimi's worked S-curve table on the pilot and pins the guard that a STARVED domain
 * (few claims, low novelty because runs failed) can never read TAPPED OUT.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeNovelty, recommendNextDomain, renderNoveltyBlock } from '../src/novelty.mjs';

const CFG = dirname(dirname(fileURLToPath(import.meta.url)));
const tuning = JSON.parse(readFileSync(join(CFG, 'config', 'tuning.json'), 'utf8'));
const domains = JSON.parse(readFileSync(join(CFG, 'config', 'domains.json'), 'utf8')).domains;

/** Build the event stream for a domain run: r fresh, c corroborations, k contradictions, n receipts. */
function runEvents(domainId, runId, { fresh = 0, corrob = 0, contra = 0, receipts = 0 }) {
  const ev = [{ eventId: `EVT-${runId}-rc`, kind: 'receipt-count', runId, domainId, claimId: '-', count: receipts }];
  for (let i = 0; i < fresh; i++) ev.push({ eventId: `EVT-${runId}-f${i}`, kind: 'fresh', runId, domainId, claimId: `CLM-f${runId}${i}` });
  for (let i = 0; i < corrob; i++) ev.push({ eventId: `EVT-${runId}-c${i}`, kind: 'corroborate', runId, domainId, claimId: `CLM-c${i}` });
  for (let i = 0; i < contra; i++) ev.push({ eventId: `EVT-${runId}-x${i}`, kind: 'contradiction-candidate', runId, domainId, claimId: `CLM-x${i}` });
  return ev;
}
const claimsFor = (domainId, n) => Array.from({ length: n }, (_, i) => ({ claimId: `CLM-${domainId}-${i}`, domainId, status: 'accepted', rev: 1 }));
const rowFor = (rows, id) => rows.find((r) => r.domainId === id);

test('pilot run 1: 6 fresh / 10 receipts = 0.60, but INSUFFICIENT DATA (1 run)', () => {
  const events = runEvents('D01', 'RUN-1', { fresh: 6, receipts: 10 });
  const rows = computeNovelty(events, claimsFor('D01', 6), domains, tuning);
  const d01 = rowFor(rows, 'D01');
  assert.equal(d01.state, 'INSUFFICIENT_DATA');
  assert.equal(d01.noveltyPer[0], 0.6);
});

test('Kimi S-curve: PRODUCTIVE → COOLING → TAPPED OUT at the right runs', () => {
  const events = [
    ...runEvents('D01', 'RUN-1', { fresh: 6, receipts: 10 }),
    ...runEvents('D01', 'RUN-2', { fresh: 3, corrob: 3, receipts: 10 }),  // 0.30
    ...runEvents('D01', 'RUN-3', { fresh: 1, corrob: 5, contra: 1, receipts: 10 }), // 0.20
    ...runEvents('D01', 'RUN-4', { fresh: 0, corrob: 8, receipts: 10 }), // 0.00
    ...runEvents('D01', 'RUN-5', { fresh: 0, corrob: 8, receipts: 10 }), // 0.00
  ];
  const claims = claimsFor('D01', 9);
  // window = 3, so at RUN-5 the window is runs 3,4,5 → (0.20+0+0)/3 = 0.067 → TAPPED OUT
  const rows = computeNovelty(events, claims, domains, tuning);
  const d01 = rowFor(rows, 'D01');
  assert.equal(d01.rolling, 0.067, `rolling over last 3 runs; got ${d01.rolling}`);
  assert.equal(d01.state, 'TAPPED_OUT');
  assert.ok(d01.knownClaims >= tuning.novelty.minKnownClaims);
  assert.ok(d01.windowReceipts >= tuning.novelty.minWindowReceipts);
});

test('GUARD: a STARVED domain (2 claims, low novelty) is NOT tapped out', () => {
  // low novelty but only 2 known claims → fails the ≥6 floor → COOLING, never TAPPED OUT
  const events = [
    ...runEvents('D05', 'R1', { fresh: 1, corrob: 0, receipts: 8 }),
    ...runEvents('D05', 'R2', { fresh: 0, corrob: 1, receipts: 8 }),
    ...runEvents('D05', 'R3', { fresh: 0, corrob: 1, receipts: 8 }),
  ];
  const rows = computeNovelty(events, claimsFor('D05', 2), domains, tuning);
  const d05 = rowFor(rows, 'D05');
  assert.ok(d05.rolling < tuning.novelty.tappedOut, 'novelty is genuinely low');
  assert.notEqual(d05.state, 'TAPPED_OUT', 'but too few claims to call it mapped — must not abandon');
  assert.equal(d05.state, 'COOLING');
});

test('GUARD: contradiction stream keeps a domain PRODUCTIVE even with 0 fresh', () => {
  const events = [
    ...runEvents('D02', 'R1', { fresh: 0, corrob: 2, contra: 4, receipts: 10 }),
    ...runEvents('D02', 'R2', { fresh: 0, corrob: 2, contra: 3, receipts: 10 }),
  ];
  const rows = computeNovelty(events, claimsFor('D02', 8), domains, tuning);
  const d02 = rowFor(rows, 'D02');
  assert.ok(d02.rolling >= tuning.novelty.productive, 'live contradictions read as novelty');
  assert.equal(d02.state, 'PRODUCTIVE');
});

test('recommendNextDomain: prefers unrun deep domains; never a productive one', () => {
  const events = runEvents('D01', 'R1', { fresh: 6, receipts: 10 });
  const rows = computeNovelty(events, claimsFor('D01', 6), domains, tuning);
  const next = recommendNextDomain(rows);
  assert.ok(next, 'a recommendation exists');
  assert.equal(next.runs, 0, 'points at an unrun domain');
});

test('renderNoveltyBlock: ≤8 lines, names the domain state', () => {
  const events = [
    ...runEvents('D01', 'R1', { fresh: 6, receipts: 10 }),
    ...runEvents('D01', 'R2', { fresh: 2, corrob: 4, receipts: 10 }),
  ];
  const rows = computeNovelty(events, claimsFor('D01', 8), domains, tuning);
  const block = renderNoveltyBlock(rows, recommendNextDomain(rows));
  assert.match(block, /## NOVELTY/);
  assert.match(block, /D01/);
  assert.ok(block.split('\n').length <= 9, 'header stays compact');
});
test('Mobbin-classed events never affect the novelty dial', () => {
  const events = [
    ...runEvents('D01', 'OWNED', { fresh: 1, receipts: 2 }),
    ...runEvents('D01', 'MOBBIN', { fresh: 20, receipts: 20 }).map((event) => ({ ...event, sourceClass: 'mobbin' })),
  ];
  const rows = computeNovelty(events, claimsFor('D01', 1), domains, tuning);
  const d01 = rowFor(rows, 'D01');
  assert.equal(d01.noveltyPer[0], 0.5, 'only the owned 1/2 run contributes');
  assert.equal(d01.runs, 1, 'Mobbin run is excluded, not merely down-weighted');
});