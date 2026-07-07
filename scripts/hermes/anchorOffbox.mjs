/**
 * anchorOffbox.mjs — the off-box half of the anchor's deletion-resistance
 * (E4c primitive, hardened to schema v2 by the E4b-final adversarial pass).
 *
 * WHY: two adversarial rounds proved a fully-LOCAL anchor cannot beat a
 * delete-capable attacker — every local anti-deletion signal is itself locally
 * writable (AI-HANDOFF/HERMES-E4B-REDESIGN-2026-07-05.md §2b). The only real
 * closure is a witness the 5090 attacker cannot retroactively rewrite. This
 * module maintains that witness: an APPEND-ONLY, self-CHAINED, HMAC-SIGNED ledger
 * of the per-day anchor high-water, synced as IMMUTABLE per-run segment objects
 * to an un-rewritable off-box sink (R2 with bucket lock — never one mutable key,
 * which would either freeze at the first PUT or be silently replaceable).
 * Operator runbook: AI-HANDOFF/HERMES-E4C-OFFBOX-RUNBOOK-2026-07-05.md.
 *
 * SCHEMA v2 (E4b-final adversarial findings, all pre-production so no migration):
 *  - prev = SHA-256 of the prior RAW LINE (not `prior.sig || GENESIS`): the chain
 *    holds with or without a key, and an unsigned entry can no longer reset the
 *    chain to GENESIS (which let an attacker delete any prefix ending at an
 *    unsigned entry). prev:GENESIS anywhere but entry 1 is a hard fault.
 *  - keyId (derived sha256(key) prefix) rides the signed payload: key rotation
 *    stays verifiable per-entry instead of red-lining all history.
 *  - toolHash (sha256 over the executing anchor/spine/doctor modules) rides the
 *    signed payload: a swapped verifier is visible in the immutable witness even
 *    when the swap happens in the pair-coded repo (supply-chain floor).
 *
 * SECURITY BOUNDARY (honest): HMAC forgery-resistance holds against off-box and
 * file-only attackers; an attacker with full user-context (env key readable) can
 * forge FUTURE entries but — once segments land under bucket lock — never the
 * already-witnessed past. Deletion-resistance materializes only when segments
 * sync off-box AND verification reads that copy. The sink is operator infra.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { durableAppend, hashLine, GENESIS } from './spineLib.mjs';

const STREAMS = ['receipts', 'queue'];
const key = () => (process.env.HERMES_ANCHOR_KEY || '').trim() || null;
export const keyIdOf = (k) => (k ? crypto.createHash('sha256').update(k).digest('hex').slice(0, 12) : null);

/** sha256 over the modules that produce/verify the witness — recorded in every
 *  signed entry so the immutable copy names the code that wrote it. */
export function currentToolHash() {
  const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  const h = crypto.createHash('sha256');
  for (const f of ['spineLib.mjs', 'anchorOffbox.mjs', 'anchorLedger.mjs', 'hermes-doctor.mjs']) {
    try { h.update(fs.readFileSync(path.join(dir, f))); } catch { h.update(`missing:${f}`); }
  }
  return h.digest('hex').slice(0, 16);
}

/** Delimiter-safe canonical payload (fixed-format/hex/numeric fields — no injection). */
function canonical(e) {
  return `offbox|v2|${e.vaultId}|${e.date}|${STREAMS.map((s) => `${s}:${e.streams[s].count}:${e.streams[s].head}`).join('|')}|prev:${e.prev}|keyId:${e.keyId}|tool:${e.toolHash}`;
}
function sign(e) {
  const k = key();
  return k ? crypto.createHmac('sha256', k).update(canonical(e)).digest('hex') : null;
}

function readRawLines(ledgerPath) {
  try { return fs.readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean); } catch { return []; }
}

export function readOffbox(ledgerPath) {
  // Parse line-by-line: a corrupt line becomes a marker, never silently collapses
  // the whole witness to [] (that would let verifyOffbox certify a tampered ledger).
  return readRawLines(ledgerPath).map((l) => {
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
 * Append one per-day high-water record, chained to the prior RAW LINE's hash and
 * signed. Append-only. Returns { entry, regression }; regression is set if THIS
 * day's count is below the ledger's recorded high-water for the SAME date (the
 * local stream shrank today). The record is still appended — the ledger is the witness.
 */
export function appendOffbox(ledgerPath, { vaultId, date, streams }) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const raw = readRawLines(ledgerPath);
  const prior = raw.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const priorForDate = witnessByDate(prior)[date];
  const k = key();
  const entry = {
    vaultId, date, streams,
    prev: raw.length ? hashLine(raw[raw.length - 1]) : GENESIS,
    keyId: keyIdOf(k), toolHash: currentToolHash(),
  };
  entry.signed = k !== null;
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
 * Verify the ledger's own integrity. The raw-line prev-chain is verified with or
 * WITHOUT a key (an unkeyed run still catches mid-delete/reorder/corrupt lines);
 * HMAC + stripped-entry checks layer on when keyed. Returns
 * { ok, faults, keyed, hasSignedEntries } — callers (anchorStatus) must treat
 * hasSignedEntries && !keyed as a downgrade FAULT, never a clean pass (F4).
 */
export function verifyOffbox(ledgerPath, expectVaultId) {
  return verifyOffboxLines(readRawLines(ledgerPath), expectVaultId);
}

/** Same verification over already-loaded raw lines — lets segment reconstruction
 *  (immutable R2 object layout) verify a rebuilt ledger without touching disk. */
export function verifyOffboxLines(raw, expectVaultId) {
  const keyed = key() !== null;
  const faults = [];
  let hasSignedEntries = false;
  let prevHash = GENESIS;
  let prevDate = '';
  for (let i = 0; i < raw.length; i++) {
    let r;
    try { r = JSON.parse(raw[i]); }
    catch { faults.push(`entry ${i + 1}: unparseable/corrupt line — witness integrity compromised`); prevHash = hashLine(raw[i]); continue; }
    if (r.signed === true) hasSignedEntries = true;
    if (expectVaultId && r.vaultId !== expectVaultId) faults.push(`entry ${i + 1}: vault-id mismatch (${r.vaultId})`);
    // Chain on raw-line hashes — verifiable keyless; GENESIS legal only at entry 1
    // (an unsigned entry must never reset the chain: that allowed prefix deletion).
    if (i === 0) {
      if (r.prev !== GENESIS) faults.push('entry 1: prev is not GENESIS — the ledger head was deleted');
    } else if (r.prev === GENESIS) {
      faults.push(`entry ${i + 1}: chain reset to GENESIS mid-ledger — entries before it were deleted`);
    } else if (r.prev !== prevHash) {
      faults.push(`entry ${i + 1}: chain break (prev ≠ hash of prior line — an entry was edited, removed, or reordered)`);
    }
    if (keyed && r.signed) {
      if (r.sig !== sign(r)) faults.push(`entry ${i + 1}: HMAC mismatch (edited without the key, or a different key/keyId)`);
    } else if (keyed && !r.signed) {
      faults.push(`entry ${i + 1}: unsigned entry but a key is set (stripped)`);
    }
    // Dates must not go backward (append-only in TIME). Within a date, a count may
    // legitimately DROP — the ledger witnesses truncation BY DESIGN; integrity is
    // protected by the chain + HMAC, not by count monotonicity.
    if (r.date < prevDate) faults.push(`entry ${i + 1}: date went backward (${r.date} after ${prevDate}) — append-only violated`);
    prevHash = hashLine(raw[i]);
    prevDate = r.date;
  }
  return { ok: faults.length === 0, faults, keyed, hasSignedEntries };
}

/**
 * The teeth: compare the LOCAL streams against the OFF-BOX witness. `localFor(date)`
 * → { receipts:{count, head?, hashAt?}, queue:{…} } or null when the day is gone.
 * Catches BOTH shrinkage (count below witness) AND same-count/beneath-append
 * REWRITE when the caller supplies head/hashAt (adversarial FINDING-3 — a witness
 * that only counts misses substitution, the more dangerous half of tampering).
 */
export function regressionVsLocal(witness, localFor) {
  const faults = [];
  for (const [date, w] of Object.entries(witness)) {
    const local = localFor(date);
    if (!local) { faults.push(`${date}: witnessed off-box but the local day is GONE — deletion`); continue; }
    for (const s of STREAMS) {
      if (w[s].count < 0) continue;
      const li = local[s];
      const lc = li?.count ?? 0;
      if (lc < w[s].count) { faults.push(`${date}/${s}: DELETION — local ${lc} < off-box witness ${w[s].count}`); continue; }
      if (w[s].head && w[s].head !== GENESIS && w[s].count >= 1) {
        const localAt = lc === w[s].count ? (li.head ?? null) : (li.hashAt ? li.hashAt(w[s].count) : null);
        if (localAt !== null && localAt !== w[s].head) faults.push(`${date}/${s}: REWRITE — local content at witnessed high-water (line ${w[s].count}) differs from the off-box witness`);
      }
    }
  }
  return faults;
}
