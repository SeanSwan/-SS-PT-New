#!/usr/bin/env node
/**
 * select.mjs — direction selection and the anti-convergence gate.
 *
 * THE POINT
 * ---------
 * Sean's complaint was: "If I tell it to build something, it's not gonna build the same
 * damn thing every single time with the same damn look."
 *
 * Documentation cannot fix that. An instruction to "be varied" is obeyed exactly as often
 * as it is remembered. So this is a GATE, not a preference: three identical answers in a
 * row for the same surface class, unpinned, and the fourth is refused.
 *
 * The refusal is not the fix — the fix is that the agent must then either pin the
 * direction with a written reason, or accept the rotation. Both are legitimate. What
 * stops being possible is a fourth identical answer arriving by default.
 *
 * Note where the gate actually bites: rotation already avoids repetition, so the case it
 * catches is MATCHING that keeps returning the same direction — every brief mentioning
 * "dashboard" scoring to the same place. That is the real convergence mechanism.
 *
 * Zero dependencies, matching the rest of scripts/design-brain.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const DEFAULT_DIRS = path.join(REPO_ROOT, 'docs', 'ai-workflow', 'design-brain', 'directions');

export const LEDGER_VERSION = 1;

// ── Ledger ─────────────────────────────────────────────────────────────────────

/**
 * Read the append-only selection ledger. JSONL: one decision per line.
 * A malformed line is skipped and COUNTED rather than thrown on — a corrupt line must
 * not be able to silently disable the gate, and it must not be able to crash the run.
 */
export function readLedger(ledgerPath) {
  if (!fs.existsSync(ledgerPath)) return { entries: [], skipped: 0 };
  const raw = fs.readFileSync(ledgerPath, 'utf8');
  const entries = [];
  let skipped = 0;
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && typeof parsed.direction === 'string') entries.push(parsed);
      else skipped++;
    } catch {
      skipped++;
    }
  }
  return { entries, skipped };
}

export function appendLedger(ledgerPath, entry) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.appendFileSync(ledgerPath, JSON.stringify(entry) + '\n', 'utf8');
}

// ── Determinism ────────────────────────────────────────────────────────────────

/** FNV-1a. Deterministic tie-break: the same brief twice gives the same answer. */
export function hashBrief(text) {
  let h = 2166136261;
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ── Eligibility ────────────────────────────────────────────────────────────────

export function isEligible(dir, surfaceClass, eligibleStatuses = ['canonical', 'experimental']) {
  if (!eligibleStatuses.includes(dir.status)) return false;
  if (dir.status === 'quarantined') return false;
  return Array.isArray(dir.scope) && dir.scope.includes(surfaceClass);
}

// ── Selection ──────────────────────────────────────────────────────────────────

/**
 * @returns {{
 *   ok: boolean,
 *   refused?: boolean,
 *   direction?: string,
 *   mode?: 'pinned'|'matched'|'rotated',
 *   reason: string,
 *   score?: number,
 *   eligible?: string[],
 *   window?: Array<{direction:string, pinned:boolean, mode:string}>,
 *   candidates?: Array<{id:string, score:number, lastUse:number}>
 * }}
 */
export function selectDirection({
  directions,
  brief = '',
  surfaceClass,
  ledger = [],
  pinnedId = null,
  pinReason = null,
  window = 3,
  eligibleStatuses = ['canonical', 'experimental'],
}) {
  const eligible = directions.filter((d) => isEligible(d, surfaceClass, eligibleStatuses));

  const text = String(brief).toLowerCase();
  const scoreOf = (dir) =>
    (dir.match_terms || []).reduce((n, term) => (text.includes(term.toLowerCase()) ? n + 1 : n), 0);

  const lastUseIndex = (id) => {
    for (let i = ledger.length - 1; i >= 0; i--) if (ledger[i].direction === id) return i;
    return -1; // never used sorts first
  };

  const briefHash = hashBrief(brief);
  const candidates = eligible
    .map((dir) => ({ id: dir.id, score: scoreOf(dir), lastUse: lastUseIndex(dir.id) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;           // most matched wins
      if (a.lastUse !== b.lastUse) return a.lastUse - b.lastUse;   // least recently used next
      return (briefHash % 97) - (hashBrief(a.id) % 97);            // deterministic, brief-stable
    });

  // ── 1. pinned ────────────────────────────────────────────────────────────────
  let chosen = null;
  let mode = null;
  let score = 0;

  if (pinnedId) {
    const pinned = eligible.find((d) => d.id === pinnedId);
    if (!pinned) {
      const known = directions.find((d) => d.id === pinnedId);
      return {
        ok: false,
        reason: known
          ? `"${pinnedId}" exists but is not eligible for surface class "${surfaceClass}" (status ${known.status}, scope ${JSON.stringify(known.scope)})`
          : `"${pinnedId}" is not a known direction`,
        eligible: eligible.map((d) => d.id),
      };
    }
    if (typeof pinReason !== 'string' || pinReason.trim().length < 10) {
      return {
        ok: false,
        reason: `pinning "${pinnedId}" requires a reason of at least 10 characters — a pin without a reason is indistinguishable from the default`,
        eligible: eligible.map((d) => d.id),
      };
    }
    chosen = pinned.id;
    mode = 'pinned';
    score = scoreOf(pinned);
  }

  // This check sits AFTER the pin block on purpose. If it ran first, a bad pin would
  // report "nothing is eligible" — true, but useless — instead of naming the reason the
  // pin itself failed. A misleading error is worse than no error.
  if (eligible.length === 0) {
    return { ok: false, reason: `no direction is eligible for surface class "${surfaceClass}"`, eligible: [] };
  }

  if (!pinnedId) {
    // ── 2. matched, else 3. rotated ────────────────────────────────────────────
    const best = candidates[0];
    chosen = best.id;
    score = best.score;
    mode = best.score > 0 ? 'matched' : 'rotated';
  }

  // ── The anti-convergence gate ────────────────────────────────────────────────
  const recent = ledger.filter((e) => e.surface_class === surfaceClass).slice(-window);
  const windowFull = recent.length === window;
  const allSame = windowFull && recent.every((e) => e.direction === chosen);
  const nonePinned = windowFull && recent.every((e) => !e.pinned);

  if (mode !== 'pinned' && windowFull && allSame && nonePinned) {
    const others = candidates.filter((c) => c.id !== chosen).map((c) => c.id);
    return {
      ok: false,
      refused: true,
      reason:
        `REFUSED: the last ${window} selections for surface class "${surfaceClass}" all resolved to "${chosen}" ` +
        `and none was pinned. ${mode === 'matched' ? `Matching keeps returning it (score ${score}).` : ''} ` +
        `Either pin it explicitly with a written reason, or take the rotated pick.`,
      eligible: eligible.map((d) => d.id),
      window: recent.map((e) => ({ direction: e.direction, pinned: Boolean(e.pinned), mode: e.mode || 'unknown' })),
      candidates: others,
      direction: chosen,
      mode,
      score,
    };
  }

  return {
    ok: true,
    direction: chosen,
    mode,
    score,
    reason:
      mode === 'pinned'
        ? `pinned: ${pinReason}`
        : mode === 'matched'
          ? `matched ${score} term(s) in the brief`
          : `rotated: least-recently-used among ${eligible.length} eligible direction(s)`,
    eligible: eligible.map((d) => d.id),
    candidates,
  };
}

/** Build the ledger entry for a decision. Kept separate so a caller cannot record a decision it did not make. */
export function ledgerEntry({ result, brief, surfaceClass, pinned = false, at = null, agent = null }) {
  return {
    v: LEDGER_VERSION,
    at: at || new Date().toISOString(),
    surface_class: surfaceClass,
    direction: result.direction,
    mode: result.mode,
    score: result.score ?? 0,
    pinned,
    brief: String(brief).slice(0, 160),
    agent,
  };
}
