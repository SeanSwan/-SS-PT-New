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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadRegistry, getSwitchInventory } from './registryLib.mjs';
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
  for (const name of SWITCH_SEED) state[name] = true;
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
  return readJsonl(vaultPaths(vaultRoot, isoDate).receiptsFile);
}
