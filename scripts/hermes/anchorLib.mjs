/**
 * anchorLib.mjs — external HMAC-signed, chained, vault-bound anchor (E4b v2).
 *
 * Rebuilt after a 3-lens adversarial review killed the v1 per-day-file design
 * (findings F1–F10, see AI-HANDOFF/HERMES-E4B-REDESIGN-2026-07-05.md). This
 * makes the append-only receipt/queue log tamper-EVIDENT against an attacker with
 * vault write access, to the LIMIT of a local scheme.
 *
 * Structure:
 *  - runs/anchors/vault-id — random per-vault salt, written once. Bound into every
 *    signature so a signed anchor can't be transplanted between vaults (F8).
 *  - runs/anchors/<date>.anchor — { vaultId, date, streams:{receipts,queue}:{count,head},
 *    prev, sig }. `prev` = the sig of the chronologically-previous day (GENESIS for
 *    the first) → the anchors form a CHAIN; deleting/replaying a middle day breaks
 *    the next day's prev link (F1/F2). `sig` = HMAC(key, canonical) binds vaultId +
 *    date + streams + prev (verify requires anchor.date === its slot — F1).
 *  - runs/anchors/manifest — { vaultId, keyed, firstKeyedDate, headDate, headSig,
 *    count, sig } signed head-pointer; catches tail-deletion / whole-chain wipe (F2/F3).
 *  - doctor-state.json keyed high-water (written by the doctor) catches key-blank
 *    DOWNGRADE (F4) and whole-anchors-dir deletion.
 *
 * HONEST LIMIT (F3/F5, redesign §0): a fully-LOCAL scheme cannot beat an attacker
 * who deletes EVERY artifact (anchors + manifest + vault-id + doctor-state) — those
 * are all local. Real deletion-resistance requires OFF-BOX sync of the manifest
 * (Pi / R2) → E4c. E4b delivers forgery-resistance + downgrade detection + best-
 * effort deletion detection + no false positives; it does not claim tamper-PROOF.
 *
 * Pure local file I/O + crypto — no LLM, no network, no product DB, no shell.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { atomicWriteFileSync, hashLine, GENESIS } from './spineLib.mjs';

const STREAMS = ['receipts', 'queue'];
const key = () => (process.env.HERMES_ANCHOR_KEY || '').trim() || null;
const dir = (vaultRoot) => path.join(vaultRoot, 'runs', 'anchors');
const anchorPath = (vaultRoot, date) => path.join(dir(vaultRoot), `${date}.anchor`);
const manifestPath = (vaultRoot) => path.join(dir(vaultRoot), 'manifest');
const vaultIdPath = (vaultRoot) => path.join(dir(vaultRoot), 'vault-id');

/** Read (or first-time create) the per-vault salt. */
export function vaultId(vaultRoot) {
  const p = vaultIdPath(vaultRoot);
  try { return fs.readFileSync(p, 'utf8').trim(); }
  catch {
    fs.mkdirSync(dir(vaultRoot), { recursive: true });
    const id = crypto.randomBytes(16).toString('hex');
    atomicWriteFileSync(p, `${id}\n`);
    return id;
  }
}

function canonicalAnchor(vid, date, streams, prev) {
  return `${vid}|${date}|${STREAMS.map((s) => `${s}:${streams[s].count}:${streams[s].head}`).join('|')}|prev:${prev}`;
}
function canonicalManifest(m) {
  return `${m.vaultId}|keyed:${m.keyed}|first:${m.firstKeyedDate}|head:${m.headDate}:${m.headSig}|count:${m.count}`;
}
function hmac(payload) {
  const k = key();
  return k ? crypto.createHmac('sha256', k).update(payload).digest('hex') : null;
}

/** Raw (count, head) of a stream file; archive-aware so a pruned day is not a false truncation (F6). */
export function streamHead(vaultRoot, lane, date) {
  const month = date.slice(0, 7);
  const hot = path.join(vaultRoot, 'runs', lane, month, `${lane === 'receipts' ? 'receipts' : 'queue'}-${date}.jsonl`);
  if (fs.existsSync(hot)) {
    const lines = fs.readFileSync(hot, 'utf8').split('\n').filter((l) => l.length > 0);
    return { count: lines.length, head: lines.length ? hashLine(lines[lines.length - 1]) : GENESIS };
  }
  const gz = path.join(vaultRoot, 'runs', 'archive', lane, month, `${lane === 'receipts' ? 'receipts' : 'queue'}-${date}.jsonl.gz`);
  if (fs.existsSync(gz)) {
    const lines = zlib.gunzipSync(fs.readFileSync(gz)).toString('utf8').split('\n').filter((l) => l.length > 0);
    return { count: lines.length, head: lines.length ? hashLine(lines[lines.length - 1]) : GENESIS, archived: true };
  }
  return { count: 0, head: GENESIS };
}
const currentStreams = (vaultRoot, date) => ({ receipts: streamHead(vaultRoot, 'receipts', date), queue: streamHead(vaultRoot, 'queue', date) });

export function readAnchor(vaultRoot, date) {
  try { return JSON.parse(fs.readFileSync(anchorPath(vaultRoot, date), 'utf8')); } catch { return null; }
}
export function listAnchorDates(vaultRoot) {
  try { return fs.readdirSync(dir(vaultRoot)).filter((f) => f.endsWith('.anchor')).map((f) => f.slice(0, -7)).sort(); }
  catch { return []; }
}
function readManifest(vaultRoot) {
  try { return JSON.parse(fs.readFileSync(manifestPath(vaultRoot), 'utf8')); } catch { return null; }
}

function writeAnchor(vaultRoot, vid, date, streams, prev) {
  fs.mkdirSync(dir(vaultRoot), { recursive: true });
  const anchor = { vaultId: vid, date, streams, prev, signed: key() !== null, sig: hmac(canonicalAnchor(vid, date, streams, prev)) };
  atomicWriteFileSync(anchorPath(vaultRoot, date), `${JSON.stringify(anchor, null, 2)}\n`);
  return anchor;
}
function writeManifest(vaultRoot, m) {
  const full = { ...m, signed: key() !== null, sig: hmac(canonicalManifest(m)) };
  atomicWriteFileSync(manifestPath(vaultRoot), `${JSON.stringify(full, null, 2)}\n`);
  return full;
}

/**
 * Audit the whole anchor chain + manifest against the current stream state, then
 * refresh today's anchor + the manifest head. Returns { faults, warns, keyed }.
 * `priorKeyed` is the doctor-state high-water (was the vault ever keyed?).
 */
export function auditAndRefresh(vaultRoot, isoDate, { priorKeyed = false } = {}) {
  const vid = vaultId(vaultRoot);
  const keyed = key() !== null;
  const faults = [];
  const warns = [];

  // F4 downgrade: previously keyed, now unkeyed = attack, not benign.
  if (priorKeyed && !keyed) faults.push('key DOWNGRADE — vault was previously keyed but HERMES_ANCHOR_KEY is now unset (fail-open attack)');

  const manifest = readManifest(vaultRoot);
  const dates = listAnchorDates(vaultRoot);
  // First date the key was active: from the manifest, or today on the first keyed run.
  // Days before it are expected-unsigned (F7 pre-key), a WARN not a fault.
  const firstKeyedDate = manifest?.firstKeyedDate || (keyed ? isoDate : null);
  // F3/F2: manifest recorded a keyed chain but it/anchors vanished.
  if (keyed && manifest && manifest.signed && manifest.sig !== hmac(canonicalManifest(manifest))) {
    faults.push('manifest HMAC mismatch — the anchor head-pointer was edited without the key');
  }
  if (keyed && priorKeyed && !manifest && dates.length === 0) {
    faults.push('anchor chain + manifest GONE while the vault was keyed — history baseline wiped (needs off-box restore)');
  }

  let prevSig = GENESIS;
  let walkedCount = 0;
  let lastSig = GENESIS;
  let lastDate = null;
  for (const date of dates) {
    const a = readAnchor(vaultRoot, date);
    if (!a) { faults.push(`${date}: anchor unreadable`); continue; }
    // F1 date-slot + F8 vault binding.
    if (a.date !== date) { faults.push(`${date}: date-slot mismatch (content ${a.date} — replayed/misfiled)`); continue; }
    if (a.vaultId !== vid) { faults.push(`${date}: vault-id mismatch (not this vault — transplanted/vault-id changed)`); continue; }
    const preKey = firstKeyedDate && date < firstKeyedDate;
    if (keyed && a.signed) {
      if (a.sig !== hmac(canonicalAnchor(vid, a.date, a.streams, a.prev))) { faults.push(`${date}: anchor HMAC mismatch (edited without the key)`); continue; }
      if (a.prev !== prevSig) faults.push(`${date}: chain break — prev ${short(a.prev)} ≠ expected ${short(prevSig)} (a prior day was removed/reordered)`);
    } else if (keyed && !a.signed && !preKey) {
      faults.push(`${date}: unsigned anchor but the vault is keyed (stripped, or pre-key without a firstKeyedDate marker)`);
    } else if (keyed && preKey) {
      warns.push(`${date}: pre-key day (unsigned; not provable under the current key)`);
    }
    // Stream comparison: a stream can only grow; a lower count = truncation (F1/F6 archive-aware inside currentStreams).
    const cur = currentStreams(vaultRoot, date);
    for (const s of STREAMS) {
      if (cur[s].count < a.streams[s].count) faults.push(`${date}/${s}: TRUNCATED — ${cur[s].count} lines now vs ${a.streams[s].count} signed`);
      else if (cur[s].count === a.streams[s].count && cur[s].head !== a.streams[s].head) faults.push(`${date}/${s}: last line altered vs the signed anchor`);
    }
    prevSig = a.sig || GENESIS;
    lastSig = prevSig;
    lastDate = date;
    walkedCount += 1;
  }

  // F2/F3 tail: the manifest head must match the walked head.
  if (keyed && manifest && manifest.signed && manifest.sig === hmac(canonicalManifest(manifest))) {
    if (manifest.count > walkedCount) faults.push(`anchor chain TRUNCATED — manifest recorded ${manifest.count} day(s), only ${walkedCount} present`);
    else if (manifest.count === walkedCount && lastDate && manifest.headSig !== lastSig) faults.push('anchor chain head altered vs the signed manifest');
  }

  // F10: stream days with no anchor at all.
  const gaps = streamDates(vaultRoot).filter((d) => d < isoDate && !dates.includes(d));
  if (gaps.length) warns.push(`${gaps.length} un-anchored day(s) (${gaps.slice(0, 3).join(', ')}${gaps.length > 3 ? '…' : ''}) — history not frozen; tamper cannot be ruled out`);

  // Refresh today (monotonic floor: never lower a signed count) + manifest head.
  const today = currentStreams(vaultRoot, isoDate);
  const prevToday = readAnchor(vaultRoot, isoDate);
  if (prevToday && prevToday.date === isoDate) {
    for (const s of STREAMS) if (today[s].count < prevToday.streams[s].count) { faults.push(`${isoDate}/${s}: TRUNCATED today — ${today[s].count} vs ${prevToday.streams[s].count} signed`); today[s] = prevToday.streams[s]; }
  }
  const todayPrev = dates.includes(isoDate) ? prevSigBefore(vaultRoot, isoDate, dates, vid) : lastSig;
  const written = writeAnchor(vaultRoot, vid, isoDate, today, todayPrev);
  writeManifest(vaultRoot, { vaultId: vid, keyed, firstKeyedDate, headDate: isoDate, headSig: written.sig || GENESIS, count: dates.includes(isoDate) ? walkedCount : walkedCount + 1 });

  return { faults, warns, keyed };
}

function short(s) { return String(s).slice(0, 8); }
function streamDates(vaultRoot) {
  const set = new Set();
  for (const lane of ['receipts', 'queue']) {
    const base = path.join(vaultRoot, 'runs', lane);
    let months = [];
    try { months = fs.readdirSync(base); } catch { continue; }
    for (const m of months) {
      let files = [];
      try { files = fs.readdirSync(path.join(base, m)); } catch { continue; }
      for (const f of files) { const mm = /(\d{4}-\d{2}-\d{2})\.jsonl$/.exec(f); if (mm) set.add(mm[1]); }
    }
  }
  return [...set].sort();
}
/** The chain sig that TODAY must link to = the sig of the latest anchored day strictly before isoDate. */
function prevSigBefore(vaultRoot, isoDate, dates, vid) {
  const before = dates.filter((d) => d < isoDate);
  if (!before.length) return GENESIS;
  const a = readAnchor(vaultRoot, before[before.length - 1]);
  return a && a.vaultId === vid ? (a.sig || GENESIS) : GENESIS;
}
