/**
 * hermesRunsLib.mjs — shared core for the Hermes Agentic OS runs/ lane (Slice 1).
 *
 * The accounting spine: vault lane scaffolding, kill-switch fresh-reads (fail
 * closed), write-time redaction, receipt schema validation, append-only JSONL.
 * Pure local file I/O — no LLM, no network, no product DB, no shell.
 *
 * Canon (do not drift from these):
 *  - docs/ai-workflow/hermes-agentic-os/audit-receipts.md   §2 schema · §3 storage
 *  - docs/ai-workflow/hermes-agentic-os/run-logs-and-self-improvement.md §2 redaction
 *  - docs/ai-workflow/hermes-agentic-os/kill-switches.md    §1 fail closed · §4 seed
 *  - docs/ai-workflow/hermes-agentic-os/memory-and-state.md §2 lane law (index.md)
 *
 * APPEND-ONLY BY CONSTRUCTION: this module exposes no mutation of an existing
 * line. A wrong receipt is corrected by a NEW receipt referencing the old id.
 * Receipt writing itself has NO kill switch (kill-switches.md §4 note).
 *
 * Vault root: env HERMES_VAULT_ROOT, else ~/.hermes/vault — never inside a repo.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { loadRegistry, getSwitchDefaults, getSwitchInventory } from './registryLib.mjs';
import { atomicWriteFileSync, chainedAppend, withLock } from './spineLib.mjs';

export const LANES = ['receipts', 'logs', 'queue', 'digests', 'archive'];
const OUTCOMES = ['ok', 'failed', 'refused', 'partial'];
const RECEIPT_FIELDS = ['who', 'what', 'target', 'when', 'approved-by', 'outcome', 'evidence'];
const TEXT_CAP = 500;

const LANE_INDEX = {
  receipts:
    'What belongs: receipt JSONL (receipts-YYYY-MM-DD.jsonl, append-only) and the rendered daily markdown views.\nWhat does not: logs, queue history, digests, anything editable.\nWhere next: runs/digests/ for the daily rollup; audit-receipts.md §2 for the schema.',
  logs:
    'What belongs: per-run execution logs receipts point into (redacted at write).\nWhat does not: receipts, secrets, PII, transcript content.\nWhere next: runs/receipts/ for the structured record.',
  queue:
    'What belongs: approval-queue lifecycle JSONL (create + transition records, append-only).\nWhat does not: receipts, approvals granted anywhere but here.\nWhere next: approval-gates.md §2 for the entry format.',
  digests:
    'What belongs: daily digest artifacts and the skipped-run ledger.\nWhat does not: raw receipts (those live in runs/receipts/).\nWhere next: audit-receipts.md §5 for digest sections.',
  archive:
    'What belongs: gzip-compressed aged files moved by receipt-prune (90-day hot window), never deleted.\nWhat does not: hot files, anything uncompressed.\nWhere next: run-logs-and-self-improvement.md §3 for retention.',
};

// kill-switches.md §4 inventory — READ FROM THE GENERATED REGISTRY (E1, finding
// G-1), never hand-mirrored. Doc order preserved; last-tested lives in the
// switches file (slice 2 owns flips). Adding a switch is a doc edit + registry-build.
const SWITCH_SEED = getSwitchInventory(loadRegistry());
const SWITCH_DEFAULTS = getSwitchDefaults(loadRegistry()); // UX-9: unbuilt surfaces seed OFF

const SECRET_PATTERNS = [
  /\b(?:sk|rk|pk)_(?:live|test)_[0-9A-Za-z]{8,}\b/g,
  /\bsk-[0-9A-Za-z_-]{16,}\b/g,
  /\bwhsec_[0-9A-Za-z]{8,}\b/g,
  /\bxox[abps]-[0-9A-Za-z-]{8,}\b/g,
  /\bAIza[0-9A-Za-z_-]{10,}\b/g,
  /\beyJ[0-9A-Za-z_-]{8,}(?:\.[0-9A-Za-z_-]{4,}){1,2}\b/g,
  /\b\d{8,10}:[0-9A-Za-z_-]{35}\b/g, // telegram bot token
  /\bpostgres(?:ql)?:\/\/\S+:\S+@\S+/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

export function resolveVaultRoot() {
  return process.env.HERMES_VAULT_ROOT || path.join(os.homedir(), '.hermes', 'vault');
}
export function resolveSwitchesFile() {
  return process.env.HERMES_SWITCHES_FILE || path.join(os.homedir(), '.hermes', 'switches.json');
}

export function vaultPaths(vaultRoot, isoDate) {
  const month = isoDate.slice(0, 7);
  return {
    receiptsFile: path.join(vaultRoot, 'runs', 'receipts', month, `receipts-${isoDate}.jsonl`),
    receiptsView: path.join(vaultRoot, 'runs', 'receipts', month, `receipts-${isoDate}.md`),
    queueFile: path.join(vaultRoot, 'runs', 'queue', month, `queue-${isoDate}.jsonl`),
    digestFile: path.join(vaultRoot, 'runs', 'digests', `digest-${isoDate}.md`),
    scheduleFile: path.join(vaultRoot, 'runs', 'digests', 'schedule.json'),
  };
}

/** Local calendar date (YYYY-MM-DD) taken literally from an ISO string — no TZ math. */
export function isoDateOf(when) {
  const m = /^(\d{4}-\d{2}-\d{2})T/.exec(String(when));
  if (!m) throw new Error(`when must be an ISO timestamp, got: ${capText(String(when), 40)}`);
  return m[1];
}

export function ensureLanes(vaultRoot) {
  for (const lane of LANES) {
    const dir = path.join(vaultRoot, 'runs', lane);
    fs.mkdirSync(dir, { recursive: true });
    const idx = path.join(dir, 'index.md');
    if (!fs.existsSync(idx)) {
      fs.writeFileSync(idx, `# runs/${lane} — lane index\n\n${LANE_INDEX[lane]}\n`);
    }
  }
  return vaultRoot;
}

/** Seed the switches file (all on unless overridden). Used by init + tests; flips are slice 2. */
export function seedSwitches(file, overrides = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const state = {};
  for (const name of SWITCH_SEED) state[name] = SWITCH_DEFAULTS[name] !== false; // doc-driven default (UX-9)
  for (const [k, v] of Object.entries(overrides)) state[k] = v;
  atomicWriteFileSync(file, JSON.stringify(state, null, 2) + '\n'); // temp+rename, never a torn switches file (G-6)
  return state;
}

/** Fresh read, never cached. Missing/corrupt file or non-boolean value = unreadable. */
export function readSwitches(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return { ok: false, reason: 'switches file malformed' };
    return { ok: true, state: parsed };
  } catch (err) {
    return { ok: false, reason: `switches file unreadable (${err.code || 'parse error'})` };
  }
}

/**
 * Gate a command on named switches (fail closed, kill-switches.md §1 law 2).
 * On refusal: writes a refused receipt naming the switch, then throws.
 */
export function checkSwitches(vaultRoot, switchesFile, names, ctx) {
  const read = readSwitches(switchesFile);
  let blocker = null;
  if (!read.ok) blocker = read.reason;
  else {
    for (const name of names) {
      if (read.state[name] !== true) {
        blocker = `${name} is ${read.state[name] === false ? 'off' : 'unreadable'}`;
        break;
      }
    }
  }
  if (blocker) {
    writeReceipt(vaultRoot, {
      who: ctx.who, what: ctx.what, target: ctx.target,
      when: ctx.when || new Date().toISOString(),
      'approved-by': 'n/a',
      outcome: `refused — kill-switch gate: ${blocker} (fail closed)`,
      evidence: switchesFile,
    });
    throw new Error(`refused: kill-switch gate — ${blocker}`);
  }
}

export function capText(text, cap = TEXT_CAP) {
  const s = String(text);
  return s.length <= cap ? s : `${s.slice(0, cap)} [truncated ${s.length - cap} chars]`;
}

/** Write-time redaction (run-logs §2): secrets and emails never land on disk. */
export function redactText(text) {
  let out = String(text);
  for (const pattern of SECRET_PATTERNS) out = out.replace(pattern, '<REDACTED-KEY>');
  out = out.replace(EMAIL_PATTERN, '<REDACTED-EMAIL>');
  return capText(out);
}

export function validateReceipt(receipt) {
  for (const field of RECEIPT_FIELDS) {
    if (!receipt[field] || !String(receipt[field]).trim()) {
      throw new Error(`receipt missing required field: ${field}`);
    }
  }
  if (/^various$/i.test(String(receipt.target).trim())) {
    throw new Error('"various" is not a target (audit-receipts.md §2)');
  }
  isoDateOf(receipt.when);
  const head = String(receipt.outcome).split(/[\s—-]/, 1)[0].toLowerCase();
  if (!OUTCOMES.includes(head)) {
    throw new Error(`receipt outcome must start with ok|failed|refused|partial, got: ${capText(receipt.outcome, 60)}`);
  }
  return receipt;
}

export function appendJsonl(file, record) {
  // Every append is locked (single-writer), hash-chained (tamper-evident), and
  // fsynced (durable) — see spineLib.mjs (G-2/G-3/G-6).
  return chainedAppend(file, record);
}

export function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch { return { __unparseable: capText(line, 80) }; }
  });
}

/** Next R-/Q- id for the day: max existing NNN + 1 (single-operator local store). */
export function nextSequencedId(prefix, existingIds, isoDate) {
  const day = isoDate.replaceAll('-', '');
  let max = 0;
  for (const id of existingIds) {
    // {3,} not {3}: past 999 ids/day the sequence grows a digit instead of every
    // later id colliding at -1000 forever (refusal-flood id-corruption, F-9).
    const m = new RegExp(`^${prefix}-${day}-(\\d{3,})$`).exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${day}-${String(max + 1).padStart(3, '0')}`;
}

/**
 * Append one receipt (audit-receipts §2). Redacts every string field at write
 * time, assigns the sequenced id, appends a single JSONL line. Returns the
 * stored record. NO kill switch by design — refusals must always be recordable.
 */
export function writeReceipt(vaultRoot, receipt) {
  validateReceipt(receipt);
  const isoDate = isoDateOf(receipt.when);
  const { receiptsFile } = vaultPaths(vaultRoot, isoDate);
  ensureLanes(vaultRoot);
  // Allocate the R-id and append UNDER ONE LOCK so two writers can't read the
  // same max id and mint a duplicate (G-2). chainedAppend re-enters this lock.
  return withLock(`${receiptsFile}.lock`, () => {
    const stored = { id: nextSequencedId('R', readJsonl(receiptsFile).map((r) => r.id), isoDate) };
    for (const field of RECEIPT_FIELDS) stored[field] = redactText(receipt[field]);
    return chainedAppend(receiptsFile, stored);
  });
}

export function readReceipts(vaultRoot, isoDate) {
  const hot = vaultPaths(vaultRoot, isoDate).receiptsFile;
  if (fs.existsSync(hot)) return readJsonl(hot);
  // E6/G-16 archive reader: a pruned day answers transparently from its .gz —
  // the quarterly audit, old --date digests, and receipt-id evidence checks need
  // no manual gunzip. Corrupt archive = an __unparseable marker (never a throw,
  // never a silent []) so the digest's integrity section flags it.
  const rel = path.relative(path.join(vaultRoot, 'runs', 'receipts'), hot);
  const gz = path.join(vaultRoot, 'runs', 'archive', 'receipts', `${rel}.gz`);
  if (!fs.existsSync(gz)) return [];
  try {
    return zlib.gunzipSync(fs.readFileSync(gz)).toString('utf8').split('\n').filter(Boolean).map((line) => {
      try { return JSON.parse(line); } catch { return { __unparseable: capText(line, 80) }; }
    });
  } catch { return [{ __unparseable: `archived receipts for ${isoDate} unreadable (corrupt .gz)` }]; }
}

/** E5/G-8: classify + verify CHECKABLE evidence at queue-create. A receipt-id or
 *  path that FAILS to resolve is refused upstream (fabricated-evidence defense);
 *  URLs/free text stay allowed (verified: null) — the approval surface renders
 *  those as unverified for Sean's judgment. Never throws. */
function verifyEvidenceFile(file, label, expectedSha256 = null) {
  try {
    const st = fs.lstatSync(file);
    if (st.isSymbolicLink()) return { ok: false, reason: `${label} is a symlink, not a direct evidence file` };
    if (!st.isFile()) return { ok: false, reason: `${label} is not a file` };
    if (expectedSha256) {
      const actual = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      if (actual !== expectedSha256) return { ok: false, reason: `${label} sha256 mismatch` };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: `${label} does not exist` };
  }
}

export function classifyEvidence(vaultRoot, evidence) {
  const s = String(evidence || '').trim();
  const hashMatch = /#sha256=([a-f0-9]{64})$/i.exec(s);
  const expectedSha256 = hashMatch?.[1]?.toLowerCase() ?? null;
  const evidencePath = hashMatch ? s.slice(0, hashMatch.index) : s.split('#')[0];
  const rid = /^R-(\d{4})(\d{2})(\d{2})-\d{3,}$/.exec(s);
  if (rid) {
    const found = readReceipts(vaultRoot, `${rid[1]}-${rid[2]}-${rid[3]}`).some((r) => r.id === s);
    return { kind: 'receipt-id', verified: found, ...(found ? {} : { reason: `receipt ${s} not found in its day's stream` }) };
  }
  if (/^https?:\/\//i.test(s)) return { kind: 'url', verified: null };
  if (/^runs[\/]/.test(s)) {
    const p = evidencePath;
    const checked = verifyEvidenceFile(path.join(vaultRoot, p), `vault path ${p}`, expectedSha256);
    return { kind: 'vault-path', verified: checked.ok, ...(checked.ok ? {} : { reason: checked.reason }) };
  }
  if (/^([A-Za-z]:[\\/]|\/)/.test(s)) {
    const p = evidencePath;
    const checked = verifyEvidenceFile(p, 'path', expectedSha256);
    return { kind: 'path', verified: checked.ok, ...(checked.ok ? {} : { reason: checked.reason }) };
  }
  return { kind: 'text', verified: null };
}
