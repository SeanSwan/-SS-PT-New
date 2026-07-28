/**
 * corroborate.mjs — the disposition engine: proposed claims → fresh | corroborate | merge-queue |
 * dedup-proposed | contradiction-candidate. The hard 80% of the novelty/auto-corroboration feature.
 * =================================================================================================
 * Runs between synthesize and packet. For each proposed claim it finds the best lexical match among
 * ACCEPTED claims (first) then pending-proposed, and disposes it:
 *
 *   AUTO (accepted only): S≥auto.S AND O≥auto.O AND margin≥auto.margin AND ≥minTokens content tokens
 *        AND the match is status=accepted → append rev+1 to the accepted claim with any NEW product,
 *        recomputing confidence ONLY via confidenceFor. Never edits principle text, never accepts,
 *        never merges. This is the only automated write to canon-adjacent state, and it only ever
 *        ADDS EVIDENCE.
 *   MERGE QUEUE (0.55 ≤ S < auto.S, or AUTO score but margin<0.10, or token floor): recorded as an
 *        event with a pre-filled "m → CLM-xxx" suggestion. Sean's letter decides. Never silent.
 *   DEDUP-PROPOSED (match is a pending proposed claim, same id or AUTO): union evidence into the
 *        pending claim so the packet never shows Sean the same principle twice.
 *   CONTRADICTION-CANDIDATE (cue-based, §6): the candidate ALSO proceeds as a fresh claim (it is the
 *        opposite principle); the pair is linked for Sean, never auto-resolved.
 *   FRESH: no match ≥ mergeBand.low → new claim, needs a letter.
 *
 * ANTI-LAUNDERING (Kimi §2B / §3): receipts already died at validateReceipt if vacuous; confidence
 * moves only when a genuinely NEW product is added and only through confidenceFor (no confidence
 * literal in this file); same product twice is a set no-op; every mutation leaves a rev + event +
 * writer-ledger audit triple.
 *
 * IDEMPOTENT: deterministic eventIds + a seen-set make re-running a batch a zero-write no-op.
 *
 * @module design-brain/corroborate
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { readJsonl, loadClaims } from './synthesize.mjs';
import { confidenceFor } from './validate.mjs';
import { bestMatches, contentTokens } from './similarity.mjs';
import { appendJsonl, safeWriteText } from './writer.mjs';

const evId = (runId, claimId, receiptId, kind) =>
  'EVT-' + createHash('sha256').update(`${runId}::${claimId || '-'}::${receiptId || '-'}::${kind}`).digest('hex').slice(0, 10);

function loadConfig(cfgDir) {
  const read = (f, d) => (existsSync(join(cfgDir, f)) ? JSON.parse(readFileSync(join(cfgDir, f), 'utf8')) : d);
  return {
    tuning: read('tuning.json', { auto: { S: 0.82, O: 0.6, margin: 0.1, minTokens: 3 }, mergeBand: { low: 0.55 }, weights: { jaccard: 0.35, overlap: 0.5, trigram: 0.15 } }),
    stopwords: new Set((read('stopwords.json', { words: [] }).words) || []),
    negationCues: read('negation-cues.json', { cues: [] }).cues || [],
  };
}

const hasCue = (text, cues) => {
  const t = ` ${String(text).toLowerCase()} `;
  return cues.some((c) => t.includes(` ${c.trim()} `) || t.includes(`${c.trim()} `));
};

/**
 * Pure core. Returns { events[], claimAppends[], pendingRewrite|null }.
 * The caller performs the writes (through the writer) so this stays testable without I/O.
 */
export function corroborateBatch({ proposed, accepted, pendingProposed, receiptsById, tuning, negationCues, runId, nowIso, seenEventIds = new Set() }) {
  const opts = { stopwords: tuning.stopwords, weights: tuning.tuning?.weights ?? tuning.weights };
  const T = tuning.tuning ?? tuning; // accept either {tuning:{...}} or a flat tuning object
  const auto = T.auto; const mergeLow = T.mergeBand.low;

  const events = [];
  const claimAppends = [];           // full claim records to append to claims.jsonl (rev+1)
  const pendingById = new Map(pendingProposed.map((c) => [c.claimId, { ...c }]));
  let pendingDirty = false;

  const emit = (e) => {
    const id = evId(e.runId, e.claimId, e.receiptId, e.kind);
    if (seenEventIds.has(id)) return;
    seenEventIds.add(id);
    events.push({ eventId: id, utc: nowIso, ...e });
  };

  // one receipt-count event per domain-run (novelty denominator)
  const byDomain = new Map();
  for (const c of proposed) byDomain.set(c.domainId, (byDomain.get(c.domainId) || 0) + 1);
  const receiptDomains = new Map();
  for (const c of proposed) {
    for (const rid of c.receiptRefs) {
      const r = receiptsById.get(rid);
      if (r) receiptDomains.set(`${r.domainId}::${rid}`, r.domainId);
    }
  }
  const rcByDomain = new Map();
  for (const d of receiptDomains.values()) rcByDomain.set(d, (rcByDomain.get(d) || 0) + 1);
  for (const [domainId, count] of rcByDomain) {
    emit({ kind: 'receipt-count', runId, domainId, claimId: '-', count });
  }

  for (const claim of proposed) {
    const acceptedInDomain = accepted.filter((c) => c.domainId === claim.domainId && c.status === 'accepted');
    const pendingInDomain = [...pendingById.values()].filter((c) => c.domainId === claim.domainId && c.claimId !== claim.claimId);

    // ── against ACCEPTED first ──
    const am = bestMatches(claim.principle, acceptedInDomain, opts);
    const best = am[0]; const second = am[1];
    const tokenN = contentTokens(claim.principle, opts.stopwords).length;

    if (best) {
      const margin = best.S - (second?.S ?? 0);
      const autoGate = best.S >= auto.S && best.O >= auto.O && margin >= auto.margin && tokenN >= auto.minTokens;
      // Contradiction is checked BEFORE corroboration and independently of the AUTO thresholds: a
      // STRONG action-negator on the candidate that the accepted claim lacks, plus real subject
      // overlap, means "same subject, opposite polarity" — which must NEVER be auto-corroborated.
      const contradiction = hasCue(claim.principle, negationCues) && !hasCue(best.target.principle, negationCues)
        && best.O >= 0.5;

      if (contradiction) {
        emit({ kind: 'contradiction-candidate', runId, domainId: claim.domainId, claimId: claim.claimId, matchedClaimId: best.claimId, similarity: pick(best) });
        emit({ kind: 'fresh', runId, domainId: claim.domainId, claimId: claim.claimId });
        continue;
      }
      if (autoGate) {
        const target = best.target;
        // idempotency: if every receiptRef is already on the target, this is a no-op re-run
        const already = claim.receiptRefs.every((r) => (target.receiptRefs || []).includes(r));
        if (already) continue;
        const merged = applyCorroboration(target, claim, nowIso, runId);
        claimAppends.push(merged.record);
        emit({ kind: merged.kind, runId, domainId: claim.domainId, claimId: claim.claimId, matchedClaimId: target.claimId, receiptId: claim.receiptRefs[0], addedProducts: merged.addedProducts, prevLevel: merged.prevLevel, nextLevel: merged.nextLevel, similarity: pick(best) });
        continue;
      }
      if (best.S >= mergeLow) {
        emit({ kind: 'merge-queue', runId, domainId: claim.domainId, claimId: claim.claimId, matchedClaimId: best.claimId, similarity: pick(best) });
        continue;
      }
    }

    // ── against PENDING-PROPOSED ──
    const pm = bestMatches(claim.principle, pendingInDomain, opts);
    const pbest = pm[0];
    if (pbest) {
      const pmargin = pbest.S - (pm[1]?.S ?? 0);
      const sameId = pbest.claimId === claim.claimId;
      const pAuto = pbest.S >= auto.S && pbest.O >= auto.O && pmargin >= auto.margin && tokenN >= auto.minTokens;
      if (sameId || pAuto) {
        const p = pendingById.get(pbest.claimId);
        const before = p.products.length;
        p.products = [...new Set([...p.products, ...claim.products])];
        p.receiptRefs = [...new Set([...p.receiptRefs, ...claim.receiptRefs])];
        if (p.products.length !== before) p.confidence = confidenceFor(p.products);
        pendingDirty = true;
        emit({ kind: 'dedup-proposed', runId, domainId: claim.domainId, claimId: claim.claimId, matchedClaimId: pbest.claimId });
        continue;
      }
      if (pbest.S >= mergeLow) {
        emit({ kind: 'merge-queue', runId, domainId: claim.domainId, claimId: claim.claimId, matchedClaimId: pbest.claimId, similarity: pick(pbest) });
        continue;
      }
    }

    emit({ kind: 'fresh', runId, domainId: claim.domainId, claimId: claim.claimId });
  }

  return {
    events,
    claimAppends,
    pendingRewrite: pendingDirty ? [...pendingById.values()] : null,
  };
}

const pick = (m) => ({ S: round(m.S), J: round(m.J), O: round(m.O), T: round(m.T) });
const round = (n) => Math.round(n * 1000) / 1000;

/** Build the rev+1 record for a corroborated accepted claim. Confidence moves ONLY via confidenceFor. */
export function applyCorroboration(target, candidate, nowIso, runId) {
  const addedProducts = candidate.products.filter((p) => !target.products.includes(p));
  const rev = (target.rev ?? 1) + 1;
  const record = {
    ...target,
    rev,
    updatedUtc: nowIso,
    receiptRefs: [...new Set([...target.receiptRefs, ...candidate.receiptRefs])],
    products: [...new Set([...target.products, ...candidate.products])],
  };
  const prevConfidence = target.confidence;
  if (addedProducts.length) {
    record.confidence = confidenceFor(record.products);
    record.singleSource = record.products.length < 2;
    record.autoUpdate = {
      kind: 'corroborate', actor: 'auto-corroborate/1', utc: nowIso, runId,
      receiptRefs: candidate.receiptRefs, addedProducts,
      prevConfidence, nextConfidence: record.confidence,
    };
    return { record, kind: 'corroborate', addedProducts, prevLevel: prevConfidence.level, nextLevel: record.confidence.level };
  }
  // same-product corroboration: evidence depth recorded, confidence & products untouched
  record.autoUpdate = {
    kind: 'corroborate-same-product', actor: 'auto-corroborate/1', utc: nowIso, runId,
    receiptRefs: candidate.receiptRefs, addedProducts: [],
    prevConfidence, nextConfidence: prevConfidence,
  };
  return { record, kind: 'corroborate-same-product', addedProducts: [], prevLevel: prevConfidence.level, nextLevel: prevConfidence.level };
}

/** CLI wiring: read state, run the pure core, perform writes through the writer. */
export function runCorroborate(root, cfgDir, { nowIso = new Date().toISOString() } = {}) {
  const cfg = loadConfig(cfgDir);
  const proposedAll = readJsonl(join(root, 'claims-proposed.jsonl'));
  const runIds = [...new Set(proposedAll.map((c) => c.runIdSeen).filter(Boolean))];
  const runId = runIds.length ? runIds[runIds.length - 1] : nowIso.slice(0, 10);
  // proposed = claims created THIS synthesis (all in claims-proposed with status proposed & no events yet)
  const events = readJsonl(join(root, 'events.jsonl'));
  const seen = new Set(events.map((e) => e.eventId));
  const claimsWithEvents = new Set(events.filter((e) => e.kind === 'fresh' || e.kind === 'corroborate' || e.kind === 'merge-queue' || e.kind === 'dedup-proposed').map((e) => e.claimId));
  const proposed = proposedAll.filter((c) => c.status === 'proposed' && !claimsWithEvents.has(c.claimId));
  const pendingProposed = proposedAll.filter((c) => c.status === 'proposed' && claimsWithEvents.has(c.claimId));
  const accepted = loadClaims(join(root, 'claims.jsonl')).filter((c) => c.status === 'accepted');
  const receiptsById = new Map(readJsonl(join(root, 'receipts.jsonl')).map((r) => [r.receiptId, r]));

  const { events: newEvents, claimAppends, pendingRewrite } = corroborateBatch({
    proposed, accepted, pendingProposed, receiptsById,
    tuning: { ...cfg.tuning, stopwords: cfg.stopwords }, negationCues: cfg.negationCues,
    runId, nowIso, seenEventIds: seen,
  });

  for (const rec of claimAppends) appendJsonl(root, join(root, 'claims.jsonl'), rec);
  for (const e of newEvents) appendJsonl(root, join(root, 'events.jsonl'), e);
  if (pendingRewrite) {
    // rewrite pending only for the dedup'd entries; unaffected proposed rows are preserved
    const byId = new Map(pendingRewrite.map((c) => [c.claimId, c]));
    const merged = proposedAll.map((c) => byId.get(c.claimId) || c);
    safeWriteText(root, join(root, 'claims-proposed.jsonl'), merged.map((c) => JSON.stringify(c)).join('\n') + (merged.length ? '\n' : ''));
  }

  const tally = newEvents.reduce((m, e) => ((m[e.kind] = (m[e.kind] || 0) + 1), m), {});
  return { runId, events: newEvents.length, claimAppends: claimAppends.length, tally };
}

// ESM entrypoint — resolve root + config dir relative to this file.
if (process.argv[1]?.endsWith('corroborate.mjs')) {
  const { resolveDataRoot } = await import('./paths.mjs');
  const { fileURLToPath } = await import('node:url');
  const { dirname } = await import('node:path');
  const i = process.argv.indexOf('--root');
  const root = resolveDataRoot(i !== -1 ? process.argv[i + 1] : undefined);
  const cfgDir = join(dirname(dirname(fileURLToPath(import.meta.url))), 'config');
  const res = runCorroborate(root, cfgDir);
  console.log(`corroborate: run ${res.runId} — ${res.events} event(s), ${res.claimAppends} claim update(s)`);
  console.log(`  ${JSON.stringify(res.tally)}`);
  console.log('next: node src/packet.mjs --root <root>');
  process.exit(0);
}
