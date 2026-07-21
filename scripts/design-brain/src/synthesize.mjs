/**
 * synthesize.mjs — receipts → proposed convergence claims. Mechanical, no LLM.
 * ============================================================================
 * The unit change that fixes throughput (Pass A): Sean adjudicates PRINCIPLES cited across
 * independent products, not per-reference records. Grouping key = normalized principle text
 * + domain. Confidence is mechanical from unique product count (validate.confidenceFor) —
 * an agent can propose, it can never score its own homework.
 *
 * Self-reference guard (Pass D): only receipts name products; agent-generated text (repo-docs,
 * memos) can never appear here as a "product" because receipts are the only input.
 *
 * USAGE
 *   node src/synthesize.mjs --root <data-root>            # writes claims-proposed.jsonl
 *
 * @module design-brain/synthesize
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { resolveDataRoot } from './paths.mjs';
import { safeWriteText } from './writer.mjs';
import { validateReceipt, validateClaim, confidenceFor } from './validate.mjs';

/** Normalize a principle for grouping: lowercase, collapse whitespace, strip punctuation edges. */
export function normalizePrinciple(p) {
  return String(p || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Content-derived claim id: sha256(domain :: normalized principle) → CLM-<10 hex>.
 * Hostile finding on the first build: date+counter ids meant a re-synthesis after new receipts could
 * assign an ALREADY-ADJUDICATED id to a different claim, which the adjudicator's idempotency check
 * would then silently never import. Content-derived ids make re-synthesis idempotent: the same
 * principle always yields the same id; an adjudicated claim re-proposed is naturally skipped.
 */
export function claimIdFor(domainId, principle) {
  const h = createHash('sha256').update(`${domainId}::${normalizePrinciple(principle)}`).digest('hex');
  return `CLM-${h.slice(0, 10)}`;
}

/** Pure core: receipts[] → proposed claims[]. Invalid receipts are refused, never repaired. */
export function synthesizeClaims(receipts, { nowIso = new Date().toISOString() } = {}) {
  const refused = [];
  const valid = [];
  for (const r of receipts) {
    const v = validateReceipt(r);
    if (v.ok) valid.push(r);
    else refused.push({ receiptId: r?.receiptId ?? '(missing id)', errors: v.errors });
  }

  const groups = new Map(); // key: domainId :: normalized principle
  for (const r of valid) {
    for (const p of r.principleCandidates) {
      const key = `${r.domainId}::${normalizePrinciple(p)}`;
      if (!groups.has(key)) groups.set(key, { principle: p, domainId: r.domainId, receipts: [] });
      groups.get(key).receipts.push(r);
    }
  }

  const claims = [];
  for (const [, g] of [...groups.entries()].sort()) {
    const products = [...new Set(g.receipts.map((r) => r.product))];
    const claim = {
      claimId: claimIdFor(g.domainId, g.principle),
      domainId: g.domainId,
      principle: g.principle,
      workflowPhase: g.receipts[0].surface,
      userRole: 'client',
      products,
      receiptRefs: [...new Set(g.receipts.map((r) => r.receiptId))],
      exceptions: [],
      contradictions: [],
      swanTranslation: {},
      confidence: confidenceFor(products),
      singleSource: products.length < 2,
      status: 'proposed',
      createdUtc: nowIso,
    };
    const v = validateClaim(claim);
    if (!v.ok) throw new Error(`synthesize produced an invalid claim (${claim.claimId}): ${v.errors.join('; ')}`);
    claims.push(claim);
  }
  return { claims, refusedReceipts: refused, validReceipts: valid.length };
}

export function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

/**
 * The FOLD (Kimi design §4) — claims.jsonl is append-authoritative: an update is an append of the
 * full record with the same claimId and rev+1. Every reader (adjudicate, packet, emit-vault,
 * renderIndex, corroborate) loads through this so they all see the latest rev per claim. The full
 * pre-image of every state stays in one ordered file; any historical state is recoverable by folding
 * at rev <= n. This is what lets auto-corroboration mutate an accepted claim without ever rewriting
 * the ledger.
 */
export function loadClaims(path) {
  const map = new Map();
  for (const c of readJsonl(path)) {
    const prev = map.get(c.claimId);
    if (!prev || (c.rev ?? 1) >= (prev.rev ?? 1)) map.set(c.claimId, c);
  }
  return [...map.values()];
}

function main() {
  const i = process.argv.indexOf('--root');
  const root = resolveDataRoot(i !== -1 ? process.argv[i + 1] : undefined);
  const receipts = readJsonl(join(root, 'receipts.jsonl'));
  const { claims, refusedReceipts, validReceipts } = synthesizeClaims(receipts);

  const out = join(root, 'claims-proposed.jsonl');
  safeWriteText(root, out, claims.map((c) => JSON.stringify(c)).join('\n') + (claims.length ? '\n' : ''));

  console.log(`receipts: ${receipts.length} (${validReceipts} valid, ${refusedReceipts.length} refused)`);
  for (const r of refusedReceipts.slice(0, 5)) console.log(`  REFUSED ${r.receiptId}: ${r.errors[0]}`);
  console.log(`proposed claims: ${claims.length} -> ${out}`);
  console.log('next: node src/packet.mjs --root <root>');
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('synthesize.mjs')) {
  process.exit(main());
}
