/**
 * ============================================================================
 * FILE: backend/scripts/lib/audit-baseline.mjs
 * PURPOSE: Make an audit fail on NEW findings only, so it stays worth reading.
 * ADDED: 2026-08-04 (Kimi review: "the single highest-leverage missing feature")
 * ============================================================================
 *
 * THE PROBLEM THIS SOLVES. An audit that exits 1 with 8 known findings is indistinguishable from
 * one that exits 1 with 9. So the ninth — the regression you actually wanted to hear about — is
 * invisible, and within a month everyone has learned to ignore the red. That is how audit tools
 * die: not by being wrong, but by being uniformly, permanently red.
 *
 * A ratchet fixes that with one rule: KNOWN findings are silent, NEW findings fail. The backlog
 * stops being noise and becomes a number that can only go down.
 *
 * WHY THIS IS SHARED. Four audits exist in this directory (model-health, write-paths,
 * named-exports, idor-surface) and each would otherwise invent its own convention. One
 * implementation means one file format, one CLI flag, one mental model — and the next audit gets
 * ratcheting for free.
 *
 * DESIGN NOTES
 *   - A finding's IDENTITY must survive irrelevant churn. Keys are caller-supplied and should be
 *     stable facts (file + route + verb), never line numbers — inserting a comment above a handler
 *     must not resurrect it as "new".
 *   - Baselines are COMMITTED. A gitignored baseline is a local opinion; a committed one is a
 *     reviewable statement of what the team has accepted, and its diff shows debt being taken on.
 *   - RESOLVED findings are reported, not silently dropped. If a baselined finding disappears, that
 *     is progress and the baseline should be re-recorded — but only deliberately, because silent
 *     shrinkage would also hide an audit that broke and stopped finding things.
 *   - Writing a baseline NEVER happens implicitly. `--update-baseline` is explicit, because an
 *     audit that quietly accepts whatever it finds is a rubber stamp.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Stable identity for a finding. Deliberately excludes line numbers — they churn, findings don't. */
export function findingKey(parts) {
  return parts.map((p) => String(p ?? '').trim()).join('|');
}

export function loadBaseline(file) {
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      exists: true,
      keys: new Set(Array.isArray(raw.accepted) ? raw.accepted : []),
      recordedAt: raw.recordedAt || null,
    };
  } catch {
    return { exists: false, keys: new Set(), recordedAt: null };
  }
}

/**
 * Split current findings against the baseline.
 * `isNew` is what should fail a build; `resolved` is what has been fixed since.
 */
export function diffBaseline(baseline, currentKeys) {
  const cur = new Set(currentKeys);
  const isNew = [...cur].filter((k) => !baseline.keys.has(k));
  const resolved = [...baseline.keys].filter((k) => !cur.has(k));
  const stillAccepted = [...cur].filter((k) => baseline.keys.has(k));
  return { isNew, resolved, stillAccepted };
}

export function writeBaseline(file, currentKeys, meta = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const payload = {
    // Human-facing, because the next person to read this file will be deciding whether to trust it.
    _comment: 'Accepted findings for this audit. NEW findings fail; these are known and tolerated. '
      + 'Regenerate deliberately with --update-baseline after reviewing the diff.',
    recordedAt: new Date().toISOString(),
    ...meta,
    accepted: [...new Set(currentKeys)].sort(),
  };
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
  return payload.accepted.length;
}

/**
 * Print the ratchet verdict and return the exit code an audit should use.
 *
 * Exit 0 when nothing is NEW — even with a non-empty backlog. That is the whole point: a green run
 * means "no regression", not "no debt", and the backlog stays visible in the output without
 * training anyone to ignore a permanent red.
 */
export function reportRatchet({ diff, label, baselineFile, describe = (k) => k }) {
  const { isNew, resolved, stillAccepted } = diff;

  if (resolved.length) {
    console.log(`\n  --- RESOLVED since the baseline (${resolved.length}) — re-record with --update-baseline ---`);
    for (const k of resolved.slice(0, 20)) console.log(`    fixed: ${describe(k)}`);
  }

  if (isNew.length) {
    console.log(`\n  --- NEW ${label} not in the baseline (${isNew.length}) ---`);
    for (const k of isNew) console.log(`    NEW: ${describe(k)}`);
    console.log(`\n  ${isNew.length} new finding(s). Fix them, or accept them explicitly:`);
    console.log(`    node <this audit> --update-baseline   (writes ${path.basename(baselineFile)})\n`);
    return 1;
  }

  console.log(`\n  no NEW ${label}. Accepted backlog: ${stillAccepted.length}.`);
  console.log('  (Backlog is tolerated, not hidden — it is listed above and can only shrink.)\n');
  return 0;
}
