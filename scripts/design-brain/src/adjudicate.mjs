/**
 * adjudicate.mjs — import Sean's DECIDE letters; the ONLY path that changes claim status.
 * =======================================================================================
 * Reads the edited batch packet, applies decisions to the durable ledger (claims.jsonl),
 * regenerates INDEX.md. Rules:
 *   - Only a human edits packets; this tool only TRANSCRIBES those edits. Agents never call it
 *     with fabricated letters — the humanDecision block names the actor from --actor (default
 *     "sean"), and the audit ledger records the import.
 *   - Unmarked claims stay `proposed` (skipping allowed, guessing not).
 *   - A merge target must exist and not itself be merged (no merge chains at n≈70).
 *   - claims.jsonl is append-authoritative: adjudicated claims move from claims-proposed.jsonl
 *     into claims.jsonl with status + humanDecision set. Idempotent per claimId: a claim already
 *     in claims.jsonl is never re-imported (re-running a batch cannot double-apply).
 *
 * USAGE
 *   node src/adjudicate.mjs --root <data-root> --batch <edited BATCH-*.md> [--actor sean]
 *
 * @module design-brain/adjudicate
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { resolveDataRoot } from './paths.mjs';
import { safeWriteText, appendJsonl } from './writer.mjs';
import { readJsonl, loadClaims } from './synthesize.mjs';
import { validateClaimProvenance } from './claim-provenance.mjs';

const LETTER_STATUS = { a: 'accepted', r: 'rejected', t: 'trial' };

/** Pure core: parse `### CLM-… / DECIDE: x` pairs out of an edited packet. */
export function parseDecisions(packetText) {
  const decisions = new Map();
  let current = null;
  for (const line of String(packetText).split('\n')) {
    const h = line.match(/^### (CLM-[A-Za-z0-9-]+)\b/);
    if (h) { current = h[1]; continue; }
    const d = line.match(/^DECIDE:\s*([artm])\b\s*(CLM-[A-Za-z0-9-]+)?/i);
    if (d && current) {
      const letter = d[1].toLowerCase();
      if (letter === 'm' && !d[2]) throw new Error(`${current}: merge needs a target (m CLM-xxx)`);
      decisions.set(current, { letter, mergeTarget: d[2] ?? null });
      current = null;
    }
  }
  return decisions;
}

/** Pure core: apply decisions → {imported, remainingProposed}. Throws on bad merge targets. */
export function applyDecisions(proposed, existing, decisions, { actor, batchId, nowIso, receiptsById, sourceAuthority = {}, signDecision }) {
  for (const claim of proposed) if (!validateClaimProvenance(claim, receiptsById, sourceAuthority)) throw new Error(`REFUSED: claim ${claim.claimId ?? '(missing)'} is not canonically bound to signed receipts`);
  const known = new Set([...existing, ...proposed].map((c) => c.claimId));
  const existingIds = new Set(existing.map((c) => c.claimId));
  const imported = [];
  const remaining = [];
  for (const c of proposed) {
    if (existingIds.has(c.claimId)) continue; // idempotency: never re-import
    const d = decisions.get(c.claimId);
    if (!d) { remaining.push(c); continue; }
    const out = { ...c };
    if (d.letter === 'm') {
      if (!known.has(d.mergeTarget)) throw new Error(`${c.claimId}: merge target ${d.mergeTarget} does not exist`);
      const target = [...existing, ...proposed].find((x) => x.claimId === d.mergeTarget);
      if (target?.status === 'merged') throw new Error(`${c.claimId}: merge target ${d.mergeTarget} is itself merged — no chains`);
      out.status = 'merged';
      out.mergedInto = d.mergeTarget;
    } else {
      out.status = LETTER_STATUS[d.letter];
    }
    if (typeof signDecision !== 'function') throw new Error('REFUSED: signed claim adjudication authority is required');
    out.humanDecision = signDecision(out, out.status, { actor, batchId, nowIso });
    if (!validateClaimProvenance(out, receiptsById, sourceAuthority)) throw new Error(`REFUSED: signed decision for ${c.claimId} is invalid`);
    imported.push(out);
  }
  return { imported, remainingProposed: remaining };
}

/** Regenerate INDEX.md — a derived view over claims.jsonl; the ledger is the asset. */
export function renderIndex(claims) {
  const by = (s) => claims.filter((c) => c.status === s);
  const lines = [
    '# Design-brain claims — index', '',
    '> Generated view — regenerate any time; `claims.jsonl` is the source of truth.', '',
    `accepted: ${by('accepted').length} · trial: ${by('trial').length} · rejected: ${by('rejected').length} · merged: ${by('merged').length}`, '',
  ];
  for (const status of ['accepted', 'trial']) {
    const set = by(status);
    if (!set.length) continue;
    lines.push(`## ${status}`, '');
    for (const c of set.sort((a, b) => a.domainId.localeCompare(b.domainId))) {
      lines.push(`- **${c.claimId}** [${c.domainId}, ${c.confidence.level}] ${c.principle.trim()} _(${c.products.join(', ')})_`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 ? process.argv[i + 1] : undefined; };
  const root = resolveDataRoot(arg('root'));
  const batchPath = resolve(arg('batch') ?? '');
  const actor = arg('actor') ?? 'sean';
  if (!batchPath) { console.error('usage: adjudicate --root <root> --batch <BATCH-file> [--actor sean]'); return 2; }

  const decisions = parseDecisions(readFileSync(batchPath, 'utf8'));
  const proposed = readJsonl(join(root, 'claims-proposed.jsonl'));
  const existing = loadClaims(join(root, 'claims.jsonl')); // fold: latest rev per claim (corroboration-aware)
  const nowIso = new Date().toISOString();
  const batchId = batchPath.replace(/\\/g, '/').split('/').pop();

  const { imported, remainingProposed } = applyDecisions(proposed, existing, decisions, { actor, batchId, nowIso });
  for (const c of imported) appendJsonl(root, join(root, 'claims.jsonl'), c);
  safeWriteText(root, join(root, 'claims-proposed.jsonl'),
    remainingProposed.map((c) => JSON.stringify(c)).join('\n') + (remainingProposed.length ? '\n' : ''));
  safeWriteText(root, join(root, 'INDEX.md'), renderIndex([...existing, ...imported]));

  console.log(`imported ${imported.length} decision(s); ${remainingProposed.length} still proposed`);
  console.log(`INDEX.md regenerated. Accepted claims flow to the vault via: node src/emit-vault.mjs`);
  return 0;
}

if (process.argv[1]?.endsWith('adjudicate.mjs')) process.exit(main());
