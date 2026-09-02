/**
 * taste-profile-snapshot.mjs — read-only bridge: Swan Taste Brain → design brain
 *
 * Fetches GET /api/profile from the loopback-only Taste Brain server and writes a
 * dated, gitignored snapshot the design brain can grep when the server is down
 * (`.ai-workflow/taste-profile.local.md`). Contract verified against the REAL
 * implementation (swan-taste-brain prompter/lib/taste-snapshot.mjs + routes-modes.mjs):
 *   - identity: body.snapshot.schemaVersion === 'taste-snapshot/1' AND
 *     body.snapshot.sourceHash is 64 hex chars (stable across unchanged evidence)
 *   - directions carry { id, tier, title, because, srefs?, themeWords?, prompts?,
 *     evidenceEventIds, note? } — there is no `name` and no `codes` field
 *   - evidence floor (taste-discovery-grill.md §6): directions may STEER a choice
 *     only with ≥8 non-neutral judgements across ≥2 grids; below that the snapshot
 *     is marked INSUFFICIENT EVIDENCE and is informational only
 * Failure law: the last-known-good snapshot is NEVER overwritten by an outage —
 * status goes to a separate file; snapshot writes are atomic (tmp + rename).
 * Router law (Step 3.5): agents read IDs/tallies, never images, never write taste;
 * tiers are copied verbatim, never upgraded. Local-only: never commit either file.
 *
 * Usage: node scripts/taste-profile-snapshot.mjs
 * Env:   SWAN_TASTE_API (default http://127.0.0.1:7331) — loopback only.
 * Test:  node --test scripts/taste-profile-snapshot.test.mjs
 */
import { writeFileSync, renameSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA = 'taste-snapshot/1';
export const MAX_RESPONSE_BYTES = 1_000_000;
export const EVIDENCE_FLOOR = { judgements: 8, grids: 2 };

/** Pure: is this response body actually the Taste Brain? Returns { ok, reason }. */
export function validateProfile(body) {
  if (!body || typeof body !== 'object') return { ok: false, reason: 'not an object' };
  const snap = body.snapshot;
  if (!snap || typeof snap !== 'object') return { ok: false, reason: 'missing snapshot envelope' };
  if (snap.schemaVersion !== SCHEMA) return { ok: false, reason: `schemaVersion ${JSON.stringify(snap.schemaVersion)} !== ${SCHEMA}` };
  if (!/^[0-9a-f]{64}$/.test(String(snap.sourceHash || ''))) return { ok: false, reason: 'sourceHash is not 64 hex chars' };
  if (!Number.isFinite(body.grids) || !Number.isFinite(body.judgements)) return { ok: false, reason: 'grids/judgements not numeric' };
  if (!Array.isArray(body.directions)) return { ok: false, reason: 'directions not an array' };
  return { ok: true, reason: '' };
}

/** Pure: real direction fields → one snapshot line. Tier verbatim, never invented. */
export function directionLine(d) {
  const tier = typeof d?.tier === 'string' ? d.tier.toUpperCase() : 'UNTIERED';
  const title = d?.title ?? d?.id ?? 'untitled';
  const parts = [];
  if (Array.isArray(d?.srefs) && d.srefs.length) parts.push(`srefs: ${d.srefs.join(', ')}`);
  if (Array.isArray(d?.themeWords) && d.themeWords.length) parts.push(`themes: ${d.themeWords.join(', ')}`);
  if (Array.isArray(d?.evidenceEventIds) && d.evidenceEventIds.length) parts.push(`evidence events: ${d.evidenceEventIds.length}`);
  if (typeof d?.note === 'string' && d.note) parts.push(d.note);
  return `- [${tier}] ${title}${parts.length ? ` — ${parts.join(' · ')}` : ''} (${d?.id ?? 'no-id'})`;
}

/** Pure: validated profile body → snapshot markdown. */
export function renderSnapshot(body, stamp, source) {
  const snap = body.snapshot;
  const meetsFloor = body.judgements >= EVIDENCE_FLOOR.judgements && body.grids >= EVIDENCE_FLOOR.grids;
  const lines = [
    '# Taste profile snapshot (local-only — NEVER commit or paste into committed files)',
    '',
    `- as-of: ${stamp}`,
    `- source: ${source}`,
    `- sourceHash: ${snap.sourceHash}`,
    `- generatedAt: ${snap.generatedAt ?? 'unknown'} · tasteSource: ${snap.tasteSource ?? 'unknown'} · confidence: ${snap.confidence ?? 'unknown'}`,
    `- evidence: grids=${body.grids} judgements=${body.judgements} (floor: ${EVIDENCE_FLOOR.judgements} judgements / ${EVIDENCE_FLOOR.grids} grids)`,
    '',
  ];
  if (!meetsFloor) {
    lines.push('**INSUFFICIENT EVIDENCE — directions below are informational only and may NOT steer a choice (taste-discovery-grill.md §6). Do not consume priors as measured taste.**', '');
  }
  lines.push('## Directions (tier is truth — copied verbatim)', '');
  for (const d of body.directions) lines.push(directionLine(d));
  if (body.directions.length === 0) lines.push('- (none — cold start; tier `absent` applies)');
  if (Array.isArray(body.proposedAvoids) && body.proposedAvoids.length) {
    lines.push('', '## Proposed avoids (proposals only — Sean copies them himself)', '');
    for (const a of body.proposedAvoids) lines.push(`- ${typeof a === 'string' ? a : JSON.stringify(a)}`);
  }
  lines.push('');
  return lines.join('\n');
}

/** Atomic write: tmp file in the same dir, then rename. */
export function writeAtomic(target, content) {
  mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.tmp-${process.pid}`;
  writeFileSync(tmp, content);
  renameSync(tmp, target);
}

export function statusContent(state, stamp, detail) {
  return `# Taste bridge status\n\n- state: ${state}\n- as-of: ${stamp}\n- detail: ${detail}\n\nThe snapshot file (taste-profile.local.md), if present, is the LAST KNOWN GOOD state and is preserved across outages — check its own as-of line for freshness.\n`;
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const snapshotPath = path.join(root, '.ai-workflow', 'taste-profile.local.md');
  const statusPath = path.join(root, '.ai-workflow', 'taste-profile.status.local.md');
  const base = process.env.SWAN_TASTE_API || 'http://127.0.0.1:7331';
  const stamp = new Date().toISOString();

  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base)) {
    console.error(`[taste-snapshot] refused: non-loopback SWAN_TASTE_API (${base})`);
    process.exit(1);
  }
  const offline = (reason) => {
    writeAtomic(statusPath, statusContent('OFFLINE', stamp, reason));
    console.log(`[taste-snapshot] OFFLINE (${reason}) — status → ${statusPath}; last-known-good snapshot preserved`);
  };

  let body;
  try {
    const res = await fetch(`${base}/api/profile`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) { offline(`HTTP ${res.status}`); return; }
    const text = await res.text();
    if (text.length > MAX_RESPONSE_BYTES) { offline(`response too large (${text.length} bytes)`); return; }
    body = JSON.parse(text);
  } catch (err) {
    offline(err?.cause?.code || err?.name || 'fetch failed');
    return;
  }

  const v = validateProfile(body);
  if (!v.ok) { offline(`not the Taste Brain: ${v.reason}`); return; }

  writeAtomic(snapshotPath, renderSnapshot(body, stamp, `${base}/api/profile`));
  writeAtomic(statusPath, statusContent('OK', stamp, `sourceHash ${body.snapshot.sourceHash.slice(0, 12)}…`));
  console.log(`[taste-snapshot] OK grids=${body.grids} judgements=${body.judgements} directions=${body.directions.length} sourceHash=${body.snapshot.sourceHash.slice(0, 12)}… → ${snapshotPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
