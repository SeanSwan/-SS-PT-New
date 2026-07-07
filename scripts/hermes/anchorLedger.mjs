/**
 * anchorLedger.mjs — E4b-final: the LOCAL side of the anchor, built on the E4c
 * off-box ledger primitive (anchorOffbox.mjs). This is the doctor's anchor check
 * and the daily recorder.
 *
 * ARCHITECTURE DECISION (from HERMES-E4B-REDESIGN-2026-07-05.md §2b/§2c): two
 * adversarial rounds proved every LOCAL anti-deletion signal (per-day anchor
 * files, manifests, doctor-state flags) is itself locally deletable — a local
 * manifest is whack-a-mole. So E4b-final keeps exactly ONE signed artifact: the
 * append-only, self-chained, HMAC-signed ledger from E4c. Locally it delivers
 * FORGERY-resistance (no edit/replay/transplant without HERMES_ANCHOR_KEY) plus
 * best-effort truncation DETECTION; DELETION-resistance materializes only when
 * the ledger syncs to un-rewritable off-box storage (R2 object-lock) and the
 * doctor compares against that witness (HERMES_OFFBOX_WITNESS). The docstrings
 * say so; nothing here claims tamper-PROOF history.
 *
 * Staging location: the ledger stages at HERMES_OFFBOX_DIR/anchor-ledger.jsonl,
 * defaulting INSIDE the vault (runs/anchors/). The local path is irrelevant to
 * the threat model — any local file is reachable by the same attacker; the teeth
 * are the R2 sync (E4C runbook). In-vault default keeps tests isolated and the
 * rclone source obvious.
 *
 * Round-2 clean fixes carried here: witnessed-prefix re-check when the stream
 * grew past the witness (altered-beneath-append), corrupt-.gz guarded as a FAULT
 * not a crash, and backfills never violate the ledger's date ordering.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { hashLine, GENESIS, atomicWriteFileSync } from './spineLib.mjs';
import { appendOffbox, readOffbox, verifyOffbox, verifyOffboxLines, witnessByDate } from './anchorOffbox.mjs';
import { vaultPaths } from './hermesRunsLib.mjs';

const STREAMS = ['receipts', 'queue'];
const DATED = /(\d{4}-\d{2}-\d{2})/;
const hasKey = () => Boolean((process.env.HERMES_ANCHOR_KEY || '').trim());

export function resolveOffboxDir(vaultRoot) {
  const env = (process.env.HERMES_OFFBOX_DIR || '').trim();
  return env || path.join(vaultRoot, 'runs', 'anchors');
}
export const ledgerPathOf = (vaultRoot) => path.join(resolveOffboxDir(vaultRoot), 'anchor-ledger.jsonl');

/** Stable per-vault identity (redesign §2.1) — random, written once, off-repo. */
export function ensureVaultId(vaultRoot) {
  const file = path.join(vaultRoot, 'runs', 'anchors', 'vault-id');
  try {
    const id = fs.readFileSync(file, 'utf8').trim();
    if (id) return id;
  } catch { /* create below */ }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const id = crypto.randomBytes(16).toString('hex');
  atomicWriteFileSync(file, `${id}\n`);
  return id;
}

/** Raw count + line hashes for one stream file of one day: hot first, then the
 *  prune archive (F6 — an archived day is EXPECTED, never a false TRUNCATED).
 *  A corrupt .gz is a FAULT marker, never a throw (round-2: one planted bad .gz
 *  must not disable the whole auditor). Returns null when the day is GONE. */
function streamInfo(vaultRoot, lane, file) {
  let text = null;
  if (fs.existsSync(file)) {
    text = fs.readFileSync(file, 'utf8');
  } else {
    const rel = path.relative(path.join(vaultRoot, 'runs', lane), file);
    const gz = path.join(vaultRoot, 'runs', 'archive', lane, `${rel}.gz`);
    if (!fs.existsSync(gz)) return null;
    try { text = zlib.gunzipSync(fs.readFileSync(gz)).toString('utf8'); }
    catch { return { corrupt: `archived ${lane} file unreadable (corrupt .gz)` }; }
  }
  const lines = text.split('\n').filter((l) => l.length > 0);
  return {
    count: lines.length,
    head: lines.length ? hashLine(lines[lines.length - 1]) : GENESIS,
    hashAt: (n) => (n >= 1 && n <= lines.length ? hashLine(lines[n - 1]) : null),
  };
}

export function dayInfo(vaultRoot, isoDate) {
  const { receiptsFile, queueFile } = vaultPaths(vaultRoot, isoDate);
  return {
    receipts: streamInfo(vaultRoot, 'receipts', receiptsFile),
    queue: streamInfo(vaultRoot, 'queue', queueFile),
  };
}

/** Every date that has a HOT stream file in either chained lane. */
export function hotStreamDates(vaultRoot) {
  const dates = new Set();
  for (const lane of STREAMS) {
    const base = path.join(vaultRoot, 'runs', lane);
    if (!fs.existsSync(base)) continue;
    const stack = [base];
    while (stack.length) {
      const dir = stack.pop();
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        let st;
        try { st = fs.statSync(full); } catch { continue; }
        if (st.isDirectory()) stack.push(full);
        else if (/\.jsonl$/i.test(name) && DATED.test(name)) dates.add(DATED.exec(name)[1]);
      }
    }
  }
  return dates;
}

const anchorable = (info) => ({
  receipts: info.receipts && !info.receipts.corrupt ? { count: info.receipts.count, head: info.receipts.head } : { count: 0, head: GENESIS },
  queue: info.queue && !info.queue.corrupt ? { count: info.queue.count, head: info.queue.head } : { count: 0, head: GENESIS },
});

/**
 * The daily recorder (runs inside hermes-doctor, T0 self-accounting): append
 * today's high-water, plus any un-witnessed hot day that can be recorded WITHOUT
 * violating the ledger's append-only date ordering. An un-witnessed day OLDER
 * than the ledger's last date cannot be backfilled honestly (a backdated stream
 * appearing after newer entries is itself suspicious) — it is reported, not
 * appended, and anchorStatus keeps WARNing on it (F10).
 */
export function recordAnchors(vaultRoot, isoToday) {
  const vaultId = ensureVaultId(vaultRoot);
  const ledger = ledgerPathOf(vaultRoot);
  const witnessed = witnessByDate(readOffbox(ledger));
  const records = readOffbox(ledger);
  const lastDate = records.length ? records[records.length - 1].date || '' : '';
  const candidates = new Set(hotStreamDates(vaultRoot));
  candidates.add(isoToday);
  const appended = [];
  const regressions = [];
  const skippedBackdated = [];
  for (const date of [...candidates].sort()) {
    if (date !== isoToday && witnessed[date]) continue;      // already witnessed
    if (date < lastDate && !witnessed[date]) { skippedBackdated.push(date); continue; }
    if (date < lastDate) continue;                           // witnessed old day — nothing to add
    const { entry, regression } = appendOffbox(ledger, { vaultId, date, streams: anchorable(dayInfo(vaultRoot, date)) });
    appended.push(entry.date);
    if (regression) regressions.push(regression);
  }
  // IMMUTABLE SEGMENT EMISSION (adversarial FINDING-1): the R2 sync source is a
  // set of write-once objects, never one growing mutable key — a mutable key under
  // bucket lock freezes at the first PUT, and without lock is silently replaceable.
  // Each run's new entries land in a fresh `seg-<endIndex>-<runDate>.jsonl`; the
  // zero-padded global end-index makes lexical order = chain order, and no segment
  // file is ever rewritten. Reconstruction = concat sorted segments.
  if (appended.length) {
    const lines = fs.readFileSync(ledger, 'utf8').split('\n').filter(Boolean);
    const segDir = path.join(resolveOffboxDir(vaultRoot), 'segments');
    fs.mkdirSync(segDir, { recursive: true });
    const segFile = path.join(segDir, `seg-${String(lines.length).padStart(8, '0')}-${isoToday}.jsonl`);
    if (!fs.existsSync(segFile)) atomicWriteFileSync(segFile, `${lines.slice(-appended.length).join('\n')}\n`);
  }
  return { appended, regressions, skippedBackdated, ledger };
}

/** Rebuild the ledger from the immutable segments and verify it; also require the
 *  live ledger to EXTEND the reconstruction (a shorter or diverged ledger means
 *  the ledger was truncated/rewritten after its entries were segmented). */
export function verifySegments(vaultRoot, vaultId) {
  const segDir = path.join(resolveOffboxDir(vaultRoot), 'segments');
  if (!fs.existsSync(segDir)) return { present: false, faults: [] };
  const segLines = [];
  for (const name of fs.readdirSync(segDir).filter((n) => /^seg-\d{8}-\d{4}-\d{2}-\d{2}\.jsonl$/.test(n)).sort()) {
    try { segLines.push(...fs.readFileSync(path.join(segDir, name), 'utf8').split('\n').filter(Boolean)); }
    catch { return { present: true, faults: [`segment ${name} unreadable`] }; }
  }
  const v = verifyOffboxLines(segLines, vaultId);
  const faults = v.faults.map((f) => `segments: ${f}`);
  let ledgerLines = [];
  try { ledgerLines = fs.readFileSync(ledgerPathOf(vaultRoot), 'utf8').split('\n').filter(Boolean); } catch { /* absent handled below */ }
  if (ledgerLines.length < segLines.length) faults.push(`ledger (${ledgerLines.length}) is SHORTER than its immutable segments (${segLines.length}) — ledger truncated after segmenting`);
  else {
    const diverged = segLines.findIndex((l, i) => ledgerLines[i] !== l);
    if (diverged !== -1) faults.push(`ledger diverged from its immutable segments at entry ${diverged + 1} — history rewritten`);
  }
  return { present: true, faults, segmentEntries: segLines.length };
}

/**
 * The doctor's anchor check. Levels: 'fault' (exit-2 class) > 'warn' (exit-1
 * class) > 'ok'. Honest reporting doctrine (redesign §0): forgery-resistance +
 * best-effort local detection; deletion-resistance requires the off-box witness.
 */
export function anchorStatus(vaultRoot, { today } = {}) {
  const vaultId = ensureVaultId(vaultRoot);
  const ledger = ledgerPathOf(vaultRoot);
  const records = readOffbox(ledger);
  const faults = [];
  const warns = [];
  const notes = [];

  // Key lifecycle (F4): signed history + no key = downgrade/lost key = FAULT.
  // Never-keyed = degraded, never healthy — forgery-resistance is OFF.
  if (!hasKey()) {
    if (records.some((r) => r.signed === true)) faults.push('signed ledger history exists but HERMES_ANCHOR_KEY is unset — key-blank downgrade or lost key (restore the key; see E4C runbook §2)');
    else warns.push('HERMES_ANCHOR_KEY unset — anchors UNSIGNED, forgery-resistance OFF (set the key per E4C runbook §2)');
  }

  // Ledger self-integrity: HMAC + chain + vault binding + append-only dates.
  const v = verifyOffbox(ledger, vaultId);
  for (const f of v.faults) faults.push(`ledger: ${f}`);

  // Streams vs witness — deletion/truncation AND altered-beneath-append.
  const witness = witnessByDate(records);
  for (const [date, w] of Object.entries(witness)) {
    const info = dayInfo(vaultRoot, date);
    for (const s of STREAMS) {
      if (w[s].count < 0) continue; // stream never witnessed for this date
      const si = info[s];
      if (!si) { if (w[s].count > 0) faults.push(`${date}/${s}: witnessed (count ${w[s].count}) but the local day is GONE (no hot file, no archive) — deletion`); continue; }
      if (si.corrupt) { faults.push(`${date}/${s}: ${si.corrupt} — witnessed history cannot be verified`); continue; }
      if (si.count < w[s].count) { faults.push(`${date}/${s}: TRUNCATION — local ${si.count} < witness ${w[s].count}`); continue; }
      if (si.count === w[s].count && w[s].head !== GENESIS && si.head !== w[s].head) faults.push(`${date}/${s}: witnessed head altered (same count, different hash) — forgery`);
      if (si.count > w[s].count && w[s].count >= 1 && si.hashAt(w[s].count) !== w[s].head) faults.push(`${date}/${s}: line ${w[s].count} altered beneath later appends — forgery under growth`);
    }
  }

  // Un-witnessed hot days (F10): history not frozen; tamper can't be ruled out.
  const unanchored = [...hotStreamDates(vaultRoot)].filter((d) => !witness[d]).sort();
  if (unanchored.length) warns.push(`un-anchored stream day(s): ${unanchored.join(', ')} — not frozen in the ledger yet`);

  // Immutable-segment cross-check: the ledger must EXTEND its own write-once
  // segment files (the R2 sync source) — a shorter/diverged ledger was rewritten.
  const seg = verifySegments(vaultRoot, vaultId);
  if (seg.present) faults.push(...seg.faults);

  // The off-box witness comparison — the actual deletion-resistance teeth.
  const witnessPath = (process.env.HERMES_OFFBOX_WITNESS || '').trim();
  if (witnessPath) {
    const remote = readOffbox(witnessPath);
    if (!remote.length) warns.push('HERMES_OFFBOX_WITNESS configured but empty/unreadable — off-box comparison skipped');
    else {
      if (remote.length > records.length) faults.push(`local ledger BEHIND the off-box witness (${records.length} < ${remote.length} entries) — ledger truncation/deletion`);
      else {
        const diverged = remote.findIndex((r, i) => (records[i]?.sig || null) !== (r.sig || null));
        if (diverged !== -1) faults.push(`local ledger DIVERGED from the off-box witness at entry ${diverged + 1} — history rewritten`);
      }
      // Freshness (adversarial FINDING-6): a killed sync leaves a valid-but-frozen
      // witness; stale must never read as healthy — everything after the freeze
      // is unprotected.
      const maxRemoteDate = remote.reduce((m, r) => (typeof r.date === 'string' && r.date > m ? r.date : m), '');
      if (today && maxRemoteDate) {
        const ageDays = Math.floor((Date.parse(today) - Date.parse(maxRemoteDate)) / 86400000);
        if (Number.isFinite(ageDays) && ageDays > 2) warns.push(`off-box witness STALE — last witnessed day ${maxRemoteDate}, today ${today} (${ageDays}d): the sync may be dead; days after the freeze are unprotected`);
      }
    }
  } else {
    notes.push('off-box witness not configured — deletion-resistance pending R2 sync (Sean-owed, E4C runbook §2); local guarantee is forgery-resistance only');
  }

  const level = faults.length ? 'fault' : warns.length ? 'warn' : 'ok';
  return { level, faults, warns, notes, entries: records.length, witnessedDates: Object.keys(witness).length };
}
