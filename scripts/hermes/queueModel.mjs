/**
 * queueModel.mjs — approval-queue lifecycle engine (Slice 1).
 *
 * Implements docs/ai-workflow/hermes-agentic-os/approval-gates.md exactly:
 *  §2 entry format · §3 approval channels (exact-match Telegram phrase) ·
 *  §4 expiry defaults (T3 24h single-execution; T4 short-fused) ·
 *  §5 T4 approve → CROSS-CHANNEL arm within 10 min → HUMAN-executed ·
 *  §6 auto-revoke · §7 blanket-approval ban (there is no bulk operation here).
 *
 * Only registered T3/T4 rows queue (command-effect-registry.md §1/§3); the seed
 * set below mirrors the registry's queueable rows — slice 2's broker replaces
 * this constant with a real registry lookup. T2 never queues by doctrine.
 * Storage is append-only JSONL in the vault runs/queue lane; state is replay.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  appendJsonl, checkSwitches, isoDateOf, nextSequencedId, readJsonl,
  redactText, vaultPaths, writeReceipt,
} from './hermesRunsLib.mjs';

// Mirrors command-effect-registry.md §3 (T3/T4) + DENIED rows. Slice 2 swaps in a live lookup.
export const QUEUEABLE = {
  'discord-alert': { tier: 'T3' },
  'manual-maintenance': { tier: 'T4' },
};
const FORBIDDEN = ['raw-shell', 'direct-sql', 'env-read', 'mass-client-message', 'unreviewed-model-proxy'];
const T2_ROWS = ['memory-note', 'queue-approve', 'queue-deny', 'switch-flip'];
const T3_APPROVAL_MS = 24 * 60 * 60 * 1000; // Q3 DECIDED 2026-07-04
const T4_ARM_WINDOW_MS = 10 * 60 * 1000;    // Q3 DECIDED 2026-07-04
const ALLOWLIST_ROW = 'allowlist: sean-only queue ops (bridge §7 standing T2 row; open-questions Q1 DECIDED 2026-07-04)';

function queueDir(vaultRoot) { return path.join(vaultRoot, 'runs', 'queue'); }

function refuse(vaultRoot, ctx, message) {
  writeReceipt(vaultRoot, {
    who: ctx.who, what: ctx.what, target: ctx.target, when: ctx.when,
    'approved-by': 'n/a', outcome: `refused — ${message}`,
    evidence: 'runs/queue lane (no entry written)',
  });
  throw new Error(`refused: ${message}`);
}

function parseMs(iso) {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/** Read every queue JSONL across months, in filename order. */
function readAllQueueRecords(vaultRoot) {
  const base = queueDir(vaultRoot);
  const records = [];
  if (!fs.existsSync(base)) return records;
  for (const month of fs.readdirSync(base).sort()) {
    const dir = path.join(base, month);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir).sort()) {
      if (file.endsWith('.jsonl')) records.push(...readJsonl(path.join(dir, file)));
    }
  }
  return records;
}

/** Replay create + transition records into current entry state (append-only history). */
export function loadQueueState(vaultRoot) {
  const state = new Map();
  for (const rec of readAllQueueRecords(vaultRoot)) {
    if (rec.type === 'create' && rec.entry?.id) {
      state.set(rec.entry.id, { ...rec.entry });
    } else if (rec.type === 'transition' && state.has(rec.id)) {
      const entry = state.get(rec.id);
      entry.status = rec.to;
      if (rec.to === 'approved') {
        entry.approvedAt = rec.at;
        entry.approvedChannel = rec.channel;
      }
      if (rec.to === 'armed') entry.armedAt = rec.at;
      entry.resolution = { by: rec.by, channel: rec.channel, at: rec.at, detail: rec.detail };
    }
  }
  return state;
}

/** Entries whose clock ran out at `at` — fail closed: unreadable expiry = expired (§6). */
function findOverdue(state, at) {
  const atMs = parseMs(at);
  const overdue = [];
  for (const entry of state.values()) {
    if (entry.status === 'open') {
      const exp = parseMs(entry.expires);
      if (exp === null || atMs > exp) overdue.push({ id: entry.id, why: exp === null ? 'expiry unreadable' : 'entry expiry' });
    } else if (entry.status === 'approved') {
      const base = parseMs(entry.approvedAt);
      const windowMs = entry.tier === 'T4' ? T4_ARM_WINDOW_MS : T3_APPROVAL_MS;
      if (base === null || atMs > base + windowMs) {
        overdue.push({ id: entry.id, why: entry.tier === 'T4' ? 'arm window elapsed' : 'approval expiry' });
      }
    }
  }
  return overdue;
}

/** Expiry closes itself: append expired transitions for anything overdue at `at`. */
export function sweepExpired(vaultRoot, at) {
  const state = loadQueueState(vaultRoot);
  for (const { id, why } of findOverdue(state, at)) {
    const entry = state.get(id);
    appendJsonl(vaultPaths(vaultRoot, isoDateOf(at)).queueFile, {
      type: 'transition', id, from: entry.status, to: 'expired', at,
      by: 'system/expiry-sweep', channel: 'internal', detail: why,
    });
  }
}

export function createEntry(vaultRoot, switchesFile, req, nowIso) {
  const ctx = {
    who: req.requester || 'unknown/unknown',
    what: 'queue-create (T2)',
    target: req.target || req.action || 'queue-create request',
    when: nowIso,
  };
  checkSwitches(vaultRoot, switchesFile, ['SWITCH_MASTER'], ctx);
  if (FORBIDDEN.includes(req.action)) refuse(vaultRoot, ctx, `${req.action} is a FORBIDDEN registry row — never queued`);
  if (T2_ROWS.includes(req.action) || req.tier === 'T2') {
    refuse(vaultRoot, ctx, `tier error: T2 never queues — ${req.action} belongs on the standing allowlist, not the queue`);
  }
  const row = QUEUEABLE[req.action];
  if (!row) refuse(vaultRoot, ctx, `unregistered command: ${redactText(String(req.action)).slice(0, 60)} — BLOCKED (registry §1)`);
  if (req.tier !== row.tier) refuse(vaultRoot, ctx, `tier mismatch: ${req.action} is ${row.tier}, request said ${req.tier}`);
  if (!req.target || /^various$/i.test(String(req.target).trim())) refuse(vaultRoot, ctx, '"various" is not a target (approval-gates §2)');
  if (!req.requester || !req.evidence) refuse(vaultRoot, ctx, 'requester and evidence are required (approval-gates §2)');
  if (row.tier === 'T4' && !req.rollback) refuse(vaultRoot, ctx, 'T4 entries require a rollback pointer at create — no rollback pointer, no arm (approval-gates §5)');

  const isoDate = isoDateOf(nowIso);
  const { queueFile } = vaultPaths(vaultRoot, isoDate);
  const existing = readJsonl(queueFile).filter((r) => r.type === 'create').map((r) => r.entry.id);
  const entry = {
    id: nextSequencedId('Q', existing, isoDate),
    action: req.action,
    tier: row.tier,
    target: redactText(req.target),
    requester: redactText(req.requester),
    evidence: redactText(req.evidence),
    ...(req.rollback ? { rollback: redactText(req.rollback) } : {}),
    created: nowIso,
    expires: new Date(parseMs(nowIso) + T3_APPROVAL_MS).toISOString(),
    status: 'open',
  };
  appendJsonl(queueFile, { type: 'create', entry });
  return entry;
}

const PHRASES = {
  approved: (id, action) => `APPROVE ${id} ${action}`,
  armed: (id, action) => `ARM ${id} ${action}`,
};

function requireChannelAuth(vaultRoot, entry, move, ctx) {
  const expected = PHRASES[move.to]?.(entry.id, entry.action);
  if (move.channel === 'telegram') {
    if (move.phrase !== expected) {
      refuse(vaultRoot, ctx, `not an approval: exact-match phrase required — send exactly "${expected}" (approval-gates §3; paraphrase is the injection defense)`);
    }
  } else if (move.channel === 'command-center') {
    if (move.confirmed !== true) {
      refuse(vaultRoot, ctx, 'command-center resolutions require the confirm modal (confirmed: true) restating action, tier, target');
    }
  } else {
    refuse(vaultRoot, ctx, `unknown approval channel: ${redactText(String(move.channel)).slice(0, 40)} (approval-gates §3 lists exactly three)`);
  }
}

export function transitionEntry(vaultRoot, switchesFile, move) {
  const ctx = {
    who: `${move.resolver || 'unknown'}/${move.channel || 'internal'}`,
    what: `queue-${move.to === 'denied' ? 'deny' : move.to === 'approved' ? 'approve' : move.to} (T2)`,
    target: move.id,
    when: move.at,
  };
  checkSwitches(vaultRoot, switchesFile, ['SWITCH_MASTER'], ctx);
  sweepExpired(vaultRoot, move.at);
  const state = loadQueueState(vaultRoot);
  const entry = state.get(move.id);
  if (!entry) refuse(vaultRoot, ctx, `no such queue entry: ${redactText(String(move.id)).slice(0, 40)}`);

  const from = entry.status;
  if (move.to === 'approved') {
    if (from !== 'open') refuse(vaultRoot, ctx, `entry is ${from}, not approvable (state machine §2)`);
    requireChannelAuth(vaultRoot, entry, move, ctx);
  } else if (move.to === 'denied' || move.to === 'revoked') {
    if (!['open', 'approved', 'armed'].includes(from) || (move.to === 'denied' && from !== 'open')) {
      refuse(vaultRoot, ctx, `entry is ${from}, cannot move to ${move.to}`);
    }
    if (!move.reason) refuse(vaultRoot, ctx, `${move.to} requires a reason`);
  } else if (move.to === 'armed') {
    if (entry.tier !== 'T4') refuse(vaultRoot, ctx, 'arm is a T4-only step (approval-gates §5)');
    if (from !== 'approved') refuse(vaultRoot, ctx, `entry is ${from}, not armable`);
    if (!entry.rollback) refuse(vaultRoot, ctx, 'no rollback pointer on entry — refusing to arm (approval-gates §5)');
    if (move.channel === entry.approvedChannel) {
      refuse(vaultRoot, ctx, `arm must come from a DIFFERENT channel than the approval (${entry.approvedChannel}) — cross-channel is the point (approval-gates §5)`);
    }
    const base = parseMs(entry.approvedAt);
    if (base === null || parseMs(move.at) > base + T4_ARM_WINDOW_MS) {
      sweepExpired(vaultRoot, move.at);
      refuse(vaultRoot, ctx, 'arm window (10 minutes) elapsed — approval expired, start over (the fuse is the feature)');
    }
    requireChannelAuth(vaultRoot, entry, move, ctx);
  } else if (move.to === 'executed') {
    if (!move.evidence) refuse(vaultRoot, ctx, 'executed requires evidence (receipt doctrine: no receipt, it did not happen correctly)');
    if (entry.tier === 'T4' && from !== 'armed') refuse(vaultRoot, ctx, `T4 entry is ${from}; only an armed entry records a human-executed act`);
    if (entry.tier === 'T3' && from !== 'approved') refuse(vaultRoot, ctx, `T3 entry is ${from}; single execution per approval (approval-gates §4), not approvable again`);
  } else {
    refuse(vaultRoot, ctx, `unknown transition: ${redactText(String(move.to)).slice(0, 30)}`);
  }

  const record = {
    type: 'transition', id: entry.id, from, to: move.to, at: move.at,
    by: move.resolver, channel: move.channel || 'internal',
    detail: redactText(move.reason || move.evidence || move.phrase || 'resolved'),
  };
  appendJsonl(vaultPaths(vaultRoot, isoDateOf(move.at)).queueFile, record);

  const outcomes = {
    approved: `ok — ${entry.id} ${from}→approved, ${move.channel === 'telegram' ? 'exact-match phrase verified' : 'confirm modal completed'}`,
    denied: `ok — ${entry.id} denied: ${move.reason}`,
    revoked: `ok — ${entry.id} revoked: ${move.reason}`,
    armed: `ok — ${entry.id} armed (authorization only — execution is Sean at the keyboard, never the broker)`,
    executed: entry.tier === 'T4'
      ? `ok — human-executed act receipted against armed entry ${entry.id}`
      : `ok — ${entry.action} executed once against approval ${entry.id}`,
  };
  writeReceipt(vaultRoot, {
    who: ctx.who,
    what: move.to === 'executed' || move.to === 'armed' ? `${entry.action} (${entry.tier})` : ctx.what,
    target: entry.id,
    when: move.at,
    'approved-by': move.to === 'executed' || move.to === 'armed' ? `${entry.id} · ${entry.resolution?.by || move.resolver}` : ALLOWLIST_ROW,
    outcome: outcomes[move.to],
    evidence: `runs/queue/${isoDateOf(move.at).slice(0, 7)}/queue-${isoDateOf(move.at)}.jsonl`,
  });
  return record;
}

export function listEntries(vaultRoot, switchesFile, { filter = 'open', at }) {
  checkSwitches(vaultRoot, switchesFile, ['SWITCH_MASTER'], {
    who: 'harness/queue-list', what: 'queue-list (T0)', target: 'approval queue', when: at,
  });
  sweepExpired(vaultRoot, at);
  const rows = [...loadQueueState(vaultRoot).values()];
  if (filter === 'all') return rows;
  if (filter === 'expiring') {
    const soon = parseMs(at) + 6 * 60 * 60 * 1000;
    return rows.filter((r) => r.status === 'open' && (parseMs(r.expires) ?? 0) <= soon);
  }
  return rows.filter((r) => r.status === 'open');
}
