/**
 * The day counter, and the gates that are only real because of it.
 *
 * WHAT THESE TESTS EXIST TO PREVENT
 *   1. A "daily" ceiling that is compared against zero on every request — the
 *      shipped state of BOTH lanes before this slice. The regression that matters
 *      is two sequential batches: the second must be refused by the first's total.
 *   2. A price preview consuming budget.
 *   3. A replayed request being counted twice.
 *   4. An unwritable ledger silently becoming an unlimited budget.
 *   5. A corrupt ledger taking down the FREE lane, which spends nothing.
 *   6. A lane typo opening a fresh file with a fresh budget.
 */

import { describe, it, expect } from 'vitest';
import { makeLaneLedger, ledgerPath, LANES, WRITE_FAILURES_BEFORE_DEGRADED } from '../../services/laneLedger.mjs';

/** An in-memory filesystem with exactly the four calls the ledger makes. */
function fakeFs({ seed = null, failWrite = false } = {}) {
  const files = new Map();
  if (seed !== null) files.set('SEEDED', seed);
  return {
    _files: files,
    _mkdirs: [],
    readFileSync(p) {
      const v = files.has(p) ? files.get(p) : files.get('SEEDED');
      if (v === undefined) { const e = new Error('ENOENT: no such file'); e.code = 'ENOENT'; throw e; }
      return v;
    },
    writeFileSync(p, data) {
      if (failWrite) { const e = new Error('EACCES: permission denied'); e.code = 'EACCES'; throw e; }
      files.set(p, data);
      files.delete('SEEDED');
    },
    mkdirSync(p) { this._mkdirs.push(p); },
  };
}

const DAY = '2026-08-25';
const at = new Date(`${DAY}T12:00:00Z`);

describe('the ledger counts a day, not a request', () => {
  it('a missing file is a fresh day, not a degraded one', () => {
    const l = makeLaneLedger({ lane: 'atelier', io: fakeFs(), now: () => at });
    expect(l.usageToday()).toMatchObject({ runs: 0, spendUsd: 0, degraded: false, ledger: 'file' });
  });

  it('ACCUMULATES across calls — the whole point of the slice', () => {
    const l = makeLaneLedger({ lane: 'atelier', io: fakeFs(), now: () => at });
    l.recordToday({ runs: 2, spendUsd: 0.01 });
    l.recordToday({ runs: 3, spendUsd: 0.02 });
    expect(l.usageToday()).toMatchObject({ runs: 5, spendUsd: 0.03 });
  });

  it('keeps a separate file per lane, so raising one budget cannot move the other counter', () => {
    expect(ledgerPath('atelier')).not.toBe(ledgerPath('video'));
    expect(ledgerPath('atelier').endsWith('atelier.json')).toBe(true);
    expect(ledgerPath('video').endsWith('video.json')).toBe(true);
    expect(LANES).toEqual(['atelier', 'video']);
  });

  it('refuses an unknown lane rather than opening a fresh budget for a typo', () => {
    expect(() => makeLaneLedger({ lane: 'atlier' })).toThrow(/Unknown spend lane/);
  });

  it('a day boundary is UTC, so a timezone shift cannot reset the count', () => {
    const io = fakeFs();
    const l = makeLaneLedger({ lane: 'atelier', io });
    l.recordToday({ runs: 1, spendUsd: 1 }, new Date('2026-08-25T23:59:00Z'));
    expect(l.usageToday(new Date('2026-08-25T23:59:59Z'))).toMatchObject({ runs: 1 });
    expect(l.usageToday(new Date('2026-08-26T00:00:01Z'))).toMatchObject({ runs: 0, spendUsd: 0 });
  });
});

describe('the two failure modes, and which way each falls', () => {
  it('a CORRUPT file reports degraded — the total is unknown, not zero', () => {
    const l = makeLaneLedger({ lane: 'atelier', io: fakeFs({ seed: '}{ not json' }), now: () => at });
    expect(l.usageToday()).toMatchObject({ degraded: true, ledger: 'degraded' });
  });

  it('a FAILED WRITE never throws — the request that already spent must not fail', () => {
    const l = makeLaneLedger({ lane: 'atelier', io: fakeFs({ failWrite: true }), now: () => at });
    const out = l.recordToday({ runs: 1, spendUsd: 5 });
    expect(out.failed).toBe(true);
    expect(out.reason).toMatch(/could not be written/);
  });

  it('ONE failed write does not degrade the lane — a scanner holding the file is a hiccup', () => {
    // RE-ANCHORED from "degrades on the first failure". Degrading immediately meant one
    // antivirus lock refused every paid render for the life of the process, silently:
    // a self-inflicted outage worse than the hole it guarded.
    const l = makeLaneLedger({ lane: 'atelier', io: fakeFs({ failWrite: true }), now: () => at });
    l.recordToday({ runs: 1, spendUsd: 5 });
    expect(l.usageToday()).toMatchObject({ degraded: false, ledger: 'file' });
  });

  it('THREE consecutive failed writes do degrade it — that is a disk, not a hiccup', () => {
    const l = makeLaneLedger({ lane: 'atelier', io: fakeFs({ failWrite: true }), now: () => at });
    for (let i = 0; i < WRITE_FAILURES_BEFORE_DEGRADED; i += 1) l.recordToday({ runs: 1, spendUsd: 5 });
    expect(l.usageToday()).toMatchObject({ degraded: true, ledger: 'unwritable' });
  });

  it('a SUCCESSFUL write resets the run, so scattered failures never accumulate into an outage', () => {
    const io = fakeFs({ failWrite: true });
    const l = makeLaneLedger({ lane: 'atelier', io, now: () => at });
    l.recordToday({ runs: 1, spendUsd: 1 });
    l.recordToday({ runs: 1, spendUsd: 1 });
    io.writeFileSync = function (p, d) { this._files.set(p, d); this._files.delete('SEEDED'); };
    l.recordToday({ runs: 1, spendUsd: 1 });              // disk answers — counter resets
    io.writeFileSync = () => { const e = new Error('EACCES'); e.code = 'EACCES'; throw e; };
    l.recordToday({ runs: 1, spendUsd: 1 });
    l.recordToday({ runs: 1, spendUsd: 1 });
    expect(l.usageToday().degraded).toBe(false);          // 2 again, not 4
  });

  it('once degraded by a run of failures it STAYS degraded — one lucky write does not restore trust', () => {
    const io = fakeFs({ failWrite: true });
    const l = makeLaneLedger({ lane: 'atelier', io, now: () => at });
    for (let i = 0; i < WRITE_FAILURES_BEFORE_DEGRADED; i += 1) l.recordToday({ runs: 1, spendUsd: 5 });
    io.writeFileSync = function (p, d) { this._files.set(p, d); };   // disk comes back
    l.recordToday({ runs: 1, spendUsd: 1 });
    expect(l.usageToday().ledger).toBe('unwritable');
  });

  it('an empty delta is not a write at all', () => {
    const io = fakeFs({ failWrite: true });
    const l = makeLaneLedger({ lane: 'atelier', io, now: () => at });
    expect(l.recordToday({ runs: 0, spendUsd: 0 })).toEqual({ skipped: true });
    expect(l.usageToday().degraded).toBe(false);
  });

  it('creates the directory before writing, so a fresh checkout counts from its first run', () => {
    const io = fakeFs();
    makeLaneLedger({ lane: 'atelier', io, now: () => at }).recordToday({ runs: 1 });
    expect(io._mkdirs.length).toBe(1);
  });

  it('stays monotonic through the wrapper — a negative delta cannot buy back headroom', () => {
    const io = fakeFs();
    const l = makeLaneLedger({ lane: 'atelier', io, now: () => at });
    l.recordToday({ runs: 5, spendUsd: 5 });
    l.recordToday({ runs: -4, spendUsd: -4 });
    expect(l.usageToday()).toMatchObject({ runs: 5, spendUsd: 5 });
  });
});

describe('an unwritable disk must not uncap the free lane', () => {
  it('counts runs the disk refused, so the VOLUME cap keeps biting', () => {
    // A reviewer found this reading the real source: a failed write refuses BILLED work,
    // correctly — but free work proceeds, and its run was never recorded. Every subsequent
    // request then read the same stale total, so an unwritable disk silently removed the
    // volume cap that exists to protect one GPU rather than a budget.
    const l = makeLaneLedger({ lane: 'atelier', io: fakeFs({ failWrite: true }), now: () => at });
    expect(l.usageToday().runs).toBe(0);
    l.recordToday({ runs: 2, spendUsd: 0 });
    l.recordToday({ runs: 2, spendUsd: 0 });
    expect(l.usageToday().runs).toBe(4);          // counted despite the disk
  });

  it('the run cap then actually refuses, instead of letting the lane run forever', () => {
    const l = makeLaneLedger({ lane: 'atelier', io: fakeFs({ failWrite: true }), now: () => at });
    l.recordToday({ runs: 49, spendUsd: 0 });
    const v = l.tryCommit({ runs: 2, spendUsd: 0, maxRunsDaily: 50, maxSpendUsdDaily: 0 });
    expect(v.allowed).toBe(false);
    expect(v.code).toBe('E_RUN_CAP');
  });

  it('stranded runs are per-day, so tomorrow starts clean', () => {
    const l = makeLaneLedger({ lane: 'atelier', io: fakeFs({ failWrite: true }) });
    l.recordToday({ runs: 3, spendUsd: 0 }, new Date('2026-08-26T12:00:00Z'));
    expect(l.usageToday(new Date('2026-08-26T12:00:00Z')).runs).toBe(3);
    expect(l.usageToday(new Date('2026-08-27T12:00:00Z')).runs).toBe(0);
  });
});
