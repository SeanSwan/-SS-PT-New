/**
 * swan-council-spend.mjs — cost accounting + atomic spend ledger for the shim.
 * ==========================================================================
 * Split out of swan-council-lib.mjs to keep each module under the 300-line cap
 * (Rule 4). Owns: per-brain cost math, the file-backed session ledger, the hard
 * cap check, and the ATOMIC reserve→settle protocol that closes the concurrent-
 * call TOCTOU race (two parallel tool calls can't both pass a stale gate and
 * overshoot the cap).
 *
 * readSpend/writeSpend are split so tests can inject an in-memory store. The
 * ledger file is gitignored (spend data, per-machine).
 *
 * @module swan-council-spend
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { BRAINS, DEFAULT_SESSION_CAP_USD } from './swan-council-brains.mjs';

/** USD cost of one call given token usage and a brain's $/M pricing. */
export function computeCost(brainKey, inTok = 0, outTok = 0) {
  const b = BRAINS[brainKey];
  if (!b) return 0;
  return (inTok / 1_000_000) * b.priceIn + (outTok / 1_000_000) * b.priceOut;
}

/**
 * File-backed session spend ledger. `readSpend`/`writeSpend` are split so tests
 * can inject an in-memory store. The ledger is gitignored (spend data, local).
 */
export function readSpend(ledgerPath) {
  if (!existsSync(ledgerPath)) return { totalUsd: 0, calls: [] };
  try {
    const j = JSON.parse(readFileSync(ledgerPath, 'utf-8'));
    return { totalUsd: Number(j.totalUsd) || 0, calls: Array.isArray(j.calls) ? j.calls : [] };
  } catch {
    return { totalUsd: 0, calls: [] };
  }
}

export function writeSpend(ledgerPath, ledger) {
  mkdirSync(dirname(ledgerPath), { recursive: true });
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf-8');
}

/**
 * Would a paid call be allowed under the cap? Read-only pre-estimate so we refuse
 * BEFORE spending. Returns {allowed, spent, cap, remaining, reason?}.
 */
export function checkCap(ledgerPath, capUsd = DEFAULT_SESSION_CAP_USD, estimateUsd = 0) {
  const { totalUsd } = readSpend(ledgerPath);
  const remaining = capUsd - totalUsd;
  if (totalUsd >= capUsd) {
    return { allowed: false, spent: totalUsd, cap: capUsd, remaining, reason: `session spend cap $${capUsd} reached (spent $${totalUsd.toFixed(4)})` };
  }
  if (estimateUsd > 0 && estimateUsd > remaining) {
    return { allowed: false, spent: totalUsd, cap: capUsd, remaining, reason: `estimated $${estimateUsd.toFixed(4)} exceeds remaining $${remaining.toFixed(4)} of the $${capUsd} cap` };
  }
  return { allowed: true, spent: totalUsd, cap: capUsd, remaining };
}

/** Record a completed paid call and return the new running total. */
export function recordSpend(ledgerPath, { brain, model, costUsd, inTok, outTok, now = new Date().toISOString() }) {
  const ledger = readSpend(ledgerPath);
  ledger.totalUsd = Number((ledger.totalUsd + (Number(costUsd) || 0)).toFixed(6));
  ledger.calls.push({ at: now, brain, model, costUsd: Number(costUsd) || 0, inTok, outTok });
  writeSpend(ledgerPath, ledger);
  return ledger.totalUsd;
}

/**
 * Atomically check the cap AND reserve the estimated cost in ONE synchronous
 * read-modify-write, closing the TOCTOU race where two concurrent calls both
 * pass a stale gate and overshoot the cap. Node runs JS single-threaded, so the
 * synchronous readSpend→writeSpend below is uninterruptible — a second call
 * cannot interleave between the check and the reservation.
 *
 * Returns {allowed, reservationId?, spent, cap, remaining, reason?}. On success
 * the estimate is written as a pending reservation; the caller MUST later call
 * settleReservation() to swap it for the real cost (or release it on failure).
 */
export function reserveSpend(ledgerPath, brain, estimateUsd, { now = new Date().toISOString(), cap = DEFAULT_SESSION_CAP_USD } = {}) {
  // Clamp the estimate to >= 0. A negative estimate would (a) always "fit" under
  // remaining and (b) drive totalUsd negative, poisoning the ledger with phantom
  // headroom that lets later calls bypass the cap. Estimates are never legitimately
  // negative; treat any negative as 0 (still a valid reserve, just no hold).
  const est = Math.max(0, Number(estimateUsd) || 0);
  const ledger = readSpend(ledgerPath);
  const remaining = cap - ledger.totalUsd;
  if (ledger.totalUsd >= cap) {
    return { allowed: false, spent: ledger.totalUsd, cap, remaining, reason: `session spend cap $${cap} reached (spent $${ledger.totalUsd.toFixed(4)})` };
  }
  if (est > 0 && est > remaining) {
    return { allowed: false, spent: ledger.totalUsd, cap, remaining, reason: `estimated $${est.toFixed(4)} exceeds remaining $${remaining.toFixed(4)} of the $${cap} cap` };
  }
  const reservationId = `${brain}-${ledger.calls.length}-${now}`;
  ledger.totalUsd = Number((ledger.totalUsd + est).toFixed(6));
  ledger.calls.push({ at: now, brain, model: '(reserved)', costUsd: est, pending: reservationId });
  writeSpend(ledgerPath, ledger);
  return { allowed: true, reservationId, spent: ledger.totalUsd, cap, remaining: cap - ledger.totalUsd };
}

/**
 * Settle (or release) a reservation made by reserveSpend: subtract the estimate
 * and add the real cost. Pass costUsd=0 to release a failed call fully. Returns
 * the new running total. No-op if the reservation is not found (already settled).
 */
export function settleReservation(ledgerPath, reservationId, { brain, model, costUsd = 0, inTok = 0, outTok = 0, now = new Date().toISOString() } = {}) {
  const ledger = readSpend(ledgerPath);
  const idx = ledger.calls.findIndex((c) => c.pending === reservationId);
  if (idx === -1) return ledger.totalUsd;
  const estimate = Number(ledger.calls[idx].costUsd) || 0;
  ledger.totalUsd = Number((ledger.totalUsd - estimate + (Number(costUsd) || 0)).toFixed(6));
  if (ledger.totalUsd < 0) ledger.totalUsd = 0;
  ledger.calls[idx] = { at: now, brain: brain || ledger.calls[idx].brain, model, costUsd: Number(costUsd) || 0, inTok, outTok };
  writeSpend(ledgerPath, ledger);
  return ledger.totalUsd;
}
