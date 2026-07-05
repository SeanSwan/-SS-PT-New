/**
 * anchorOffbox.mjs — the off-box half of the anchor's deletion-resistance (E4c).
 *
 * WHY: two adversarial rounds proved a fully-LOCAL anchor cannot beat a
 * delete-capable attacker — every local anti-deletion signal is itself locally
 * writable (AI-HANDOFF/HERMES-E4B-REDESIGN-2026-07-05.md §2b). The only real
 * closure is a witness the 5090 attacker cannot retroactively rewrite. This
 * module maintains that witness: an APPEND-ONLY, self-CHAINED, HMAC-SIGNED ledger
 * of the per-day anchor high-water, meant to be synced to an UN-REWRITABLE off-box
 * sink (Cloudflare R2 with object-lock — the Pi path is blocked on SSD power).
 * Operator runbook: AI-HANDOFF/HERMES-E4C-OFFBOX-RUNBOOK-2026-07-05.md.
 *
 * SECURITY BOUNDARY (honest): this module PRODUCES + VERIFIES the signed ledger
 * and detects LOCAL tampering (chain break, per-day count regression). Deletion-
 * resistance only fully materializes once the ledger is synced to un-rewritable
 * storage AND regressionVsLocal reads the OFF-BOX copy (not the local staging
 * one). The un-rewritable sink is operator infra, not code.
 *
 * Per-day: the anchor count is per-day (each day's stream file is independent), so
 * the witness is a per-date high-water, never a global monotonic count. ISOLATED:
 * takes plain records (the doctor's anchor produces them once E4b-final lands) —
 * no dependency on the local anchor internals. Pure file I/O + crypto, NO network
 * (the R2 push is the operator's sync, kept out of the hermes runtime by doctrine).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { durableAppend, GENESIS } from './spineLib.mjs';

const STREAMS = ['receipts', 'queue'];
const key = () => (process.env.HERMES_ANCHOR_KEY || '').trim() || null;

/** Delimiter-safe canonical payload (date fixed-format, counts numeric, heads/ids hex — no field can inject a separator). */
function canonical(e) {
  return `offbox|v1|${e.vaultId}|${e.date}|${STREAMS.map((s) => `${s}:${e.streams[s].count}:${e.streams[s].head}`).join('|')}|prev:${e.prev}`;
}
function sign(e) {
  const k = key();
  return k ? crypto.createHmac('sha256', k).update(canonical(e)).digest('hex') : null;
}

export function readOffbox(ledgerPath) {
  let text;
  try { text = fs.readFileSync(ledgerPath, 'utf8'); } catch { return []; }
  // Parse line-by-line: a corrupt line becomes a marker, never silently collapses
  // the whole witness to [] (that would let verifyOffbox certify a tampered ledger).
  return text.split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return { __unparseable: l.slice(0, 80) }; }
  });
}

/** Per-date high-water: { date: { receipts:{count,head}, queue:{count,head} } } keeping the max count per stream per date. */
export function witnessByDate(records) {
  const w = {};
  for (const r of records) {
    if (!r || typeof r.date !== 'string' || !r.streams) continue;
    const cur = w[r.date] || (w[r.date] = { receipts: { count: -1, head: GENESIS }, queue: { count: -1, head: GENESIS } });
    for (const s of STREAMS) {
      if (r.streams[s] && typeof r.streams[s].count === 'number' && r.streams[s].count >= cur[s].count) cur[s] = r.streams[s];
    }
  }
  return w;
}

/**
 * Append one per-day high-water record, chained to the prior entry's sig + signed.
 * Append-only. Returns { entry, regression }; regression is set if THIS day's count
 * is below the ledger's recorded high-water for the SAME date (the local anchor
 * shrank today). The record is still appended — the ledger is the witness.
 */
export function appendOffbox(ledgerPath, { vaultId, date, streams }) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const prior = readOffbox(ledgerPath);
  const priorForDate = witnessByDate(prior)[date];
  const prev = prior.length ? (prior[prior.length - 1].sig || GENESIS) : GENESIS;
  const entry = { vaultId, date, streams, prev };
  entry.signed = key() !== null;
  entry.sig = sign(entry);
  durableAppend(ledgerPath, `${JSON.stringify(entry)}\n`);
  const regs = [];
  if (priorForDate) {
    for (const s of STREAMS) {
      if (streams[s].count < priorForDate[s].count) regs.push(`${date}/${s}: local ${streams[s].count} < off-box witness ${priorForDate[s].count} — truncation`);
    }
  }
  return { entry, regression: regs.length ? regs.join('; ') : null };
}

/**
 * Verify the ledger's own integrity: HMAC valid + vault-bound + prev-chain intact +
 * append-only discipline (dates non-decreasing; within a date, each stream count
 * non-decreasing). Returns { ok, faults, keyed }.
 */
export function verifyOffbox(ledgerPath, expectVaultId) {
  const records = readOffbox(ledgerPath);
  const keyed = key() !== null;
  const faults = [];
  let prevSig = GENESIS;
  let prevDate = '';
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (r.__unparseable !== undefined) { faults.push(`entry ${i + 1}: unparseable/corrupt line — witness integrity compromised`); continue; }
    if (expectVaultId && r.vaultId !== expectVaultId) faults.push(`entry ${i + 1}: vault-id mismatch (${r.vaultId})`);
    if (keyed && r.signed) {
      if (r.sig !== sign(r)) faults.push(`entry ${i + 1}: HMAC mismatch (edited without the key)`);
      if (r.prev !== prevSig) faults.push(`entry ${i + 1}: chain break (prev ≠ prior sig — an entry was removed/reordered)`);
    } else if (keyed && !r.signed) {
      faults.push(`entry ${i + 1}: unsigned entry but a key is set (stripped)`);
    }
    // Dates must not go backward (append-only in TIME). Within a date, a count may
    // legitimately DROP — the ledger witnesses truncation BY DESIGN (appendOffbox
    // records below-high-water same-date counts); integrity is protected by the
    // HMAC + prev-chain, not by count monotonicity.
    if (r.date < prevDate) faults.push(`entry ${i + 1}: date went backward (${r.date} after ${prevDate}) — append-only violated`);
    prevSig = r.sig || GENESIS;
    prevDate = r.date;
  }
  return { ok: faults.length === 0, faults, keyed };
}

/**
 * The teeth: compare the LOCAL anchor against the OFF-BOX witness (read from the
 * un-rewritable off-box copy). `localFor(date)` → { receipts:{count}, queue:{count} }
 * or null if that day's streams are gone. Any local count BELOW the witness, or a
 * witnessed day missing locally, is deletion the local scheme alone can't catch.
 */
export function regressionVsLocal(witness, localFor) {
  const faults = [];
  for (const [date, w] of Object.entries(witness)) {
    const local = localFor(date);
    if (!local) { faults.push(`${date}: witnessed off-box but the local day is GONE — deletion`); continue; }
    for (const s of STREAMS) {
      const lc = local[s]?.count ?? 0;
      if (lc < w[s].count) faults.push(`${date}/${s}: DELETION — local ${lc} < off-box witness ${w[s].count}`);
    }
  }
  return faults;
}
