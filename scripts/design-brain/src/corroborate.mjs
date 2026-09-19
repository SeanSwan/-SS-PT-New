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
 *
 * `grownProposed` (hostile finding F2, 2026-09-18): a claim that already carries a disposition event
 * but whose EVIDENCE GREW — new receipts restating it from new products. Pre-fix these were excluded
 * from `proposed` by the idempotency filter, so a byte-identical restatement from five new products
 * was orphaned: the accepted claim never gained them, and the packet showed a phantom
 * high-confidence claim contradicting the asset. Grown claims run through a pass that can ONLY add
 * evidence (corroborate / merge-queue) — never re-emit `fresh`, so novelty cannot be inflated.
 */
export function corroborateBatch({ proposed, grownProposed = [], accepted, pendingProposed, receiptsById, tuning, negationCues, runId, nowIso, seenEventIds = new Set(), alreadyCountedReceipts = new Set(), decidedById = new Map() }) {
  const opts = { stopwords: tuning.stopwords, weights: tuning.tuning?.weights ?? tuning.weights };
  const T = tuning.tuning ?? tuning; // accept either {tuning:{...}} or a flat tuning object
  const auto = T.auto; const mergeLow = T.mergeBand.low;

  const events = [];
  const claimAppends = [];           // full claim records to append to claims.jsonl (rev+1)
  const pendingById = new Map(pendingProposed.map((c) => [c.claimId, { ...c }]));
  let pendingDirty = false;

  // Two different proposed claims can corroborate the SAME accepted claim in one run. Without this
  // map both appends derive rev+1 from the same base record, the fold keeps only the last, and the
  // first candidate's evidence is silently lost. Compound instead.
  const liveTarget = new Map();
  const baseFor = (t) => liveTarget.get(t.claimId) ?? t;

  const emit = (e) => {
    const id = evId(e.runId, e.claimId, e.receiptId, e.kind);
    if (seenEventIds.has(id)) return;
    seenEventIds.add(id);
    events.push({ eventId: id, utc: nowIso, ...e });
  };

  // Denominator for the novelty dial: receipts REVIEWED IN THIS RUN — i.e. examined now and never
  // counted by a previous run. Hostile finding F3 (2026-09-18): this used to count only receipts
  // behind undisposed claims, so a run of 6 receipts where 5 restated a known principle reported a
  // denominator of 1 — the dial read 1.0 (maximally productive) where the documented formula gives
  // 1/6 = 0.167 (cooling). Carried-over receipts are excluded so the dial measures this run's yield,
  // not the whole corpus's size. The ids ride on the event so the accounting is self-describing and
  // re-derivable from events.jsonl alone.
  const examined = [...proposed, ...grownProposed];
  const receiptDomains = new Map(); // domainId -> Set<receiptId>
  for (const c of examined) {
    for (const rid of c.receiptRefs) {
      if (alreadyCountedReceipts.has(rid)) continue;
      const r = receiptsById.get(rid);
      if (!r) continue;
      if (!receiptDomains.has(r.domainId)) receiptDomains.set(r.domainId, new Set());
      receiptDomains.get(r.domainId).add(rid);
    }
  }
  for (const [domainId, ids] of receiptDomains) {
    emit({ kind: 'receipt-count', runId, domainId, claimId: '-', count: ids.size, receiptIds: [...ids] });
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
        emit({ kind: 'contradiction-candidate', runId, domainId: claim.domainId, claimId: claim.claimId, matchedClaimId: best.claimId, receiptRefs: claim.receiptRefs, similarity: pick(best) });
        emit({ kind: 'fresh', runId, domainId: claim.domainId, claimId: claim.claimId, receiptRefs: claim.receiptRefs });
        continue;
      }
      if (autoGate) {
        const target = baseFor(best.target);
        // idempotency: if every receiptRef is already on the target, this is a no-op re-run
        const already = claim.receiptRefs.every((r) => (target.receiptRefs || []).includes(r));
        if (already) continue;
        const merged = applyCorroboration(target, claim, nowIso, runId);
        liveTarget.set(target.claimId, merged.record);
        claimAppends.push(merged.record);
        emit({ kind: merged.kind, runId, domainId: claim.domainId, claimId: claim.claimId, matchedClaimId: target.claimId, receiptId: claim.receiptRefs[0], receiptRefs: claim.receiptRefs, addedProducts: merged.addedProducts, prevLevel: merged.prevLevel, nextLevel: merged.nextLevel, similarity: pick(best) });
        continue;
      }
      if (best.S >= mergeLow) {
        emit({ kind: 'merge-queue', runId, domainId: claim.domainId, claimId: claim.claimId, matchedClaimId: best.claimId, receiptRefs: claim.receiptRefs, similarity: pick(best) });
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
        emit({ kind: 'dedup-proposed', runId, domainId: claim.domainId, claimId: claim.claimId, matchedClaimId: pbest.claimId, receiptRefs: claim.receiptRefs });
        continue;
      }
      if (pbest.S >= mergeLow) {
        emit({ kind: 'merge-queue', runId, domainId: claim.domainId, claimId: claim.claimId, matchedClaimId: pbest.claimId, receiptRefs: claim.receiptRefs, similarity: pick(pbest) });
        continue;
      }
    }

    emit({ kind: 'fresh', runId, domainId: claim.domainId, claimId: claim.claimId, receiptRefs: claim.receiptRefs });
  }

  // ── GROWN PASS (F2): already-disposed claims whose evidence grew. ADDS EVIDENCE ONLY. ──
  for (const claim of grownProposed) {
    // R2-1 (round-2 review): a claim whose ledger record carries a decision AGAINST it must never be
    // auto-corroborated — the decision stands. But its new evidence must not vanish either: before
    // this, a rejected claim that gained products produced zero events and zero appends, so the new
    // evidence was invisible everywhere. Surface it as an FYI; change nothing.
    //
    // R3-1 (round-3 review, found in round 2's own fix): the guard was `status !== 'accepted'`, which
    // also caught `trial` — and `trial` is NOT a decision against. A trial claim restating an
    // ACCEPTED neighbour had its evidence blocked from that neighbour (4 products => high became a
    // no-op FYI), i.e. the round-2 fix silently destroyed a working corroboration. Only statuses that
    // are genuinely decided-against may block. `merged` is a tombstone (its evidence was absorbed into
    // the merge target by adjudicate), so it blocks too — with the FYI, not in silence.
    const decided = decidedById?.get(claim.claimId);
    if (decided && DECISION_STANDS.has(decided.status)) {
      const addedProducts = claim.products.filter((p) => !decided.products.includes(p));
      const newRefs = claim.receiptRefs.filter((r) => !(decided.receiptRefs ?? []).includes(r));
      if (addedProducts.length || newRefs.length) {
        emit({
          kind: 'stale-decision-evidence', runId, domainId: claim.domainId, claimId: claim.claimId,
          decidedStatus: decided.status, addedProducts, receiptRefs: newRefs, receiptId: newRefs[0],
        });
      }
      continue;
    }

    const acceptedInDomain = accepted.filter((c) => c.domainId === claim.domainId && c.status === 'accepted');
    const am = bestMatches(claim.principle, acceptedInDomain, opts);
    const best = am[0];
    if (!best) {
      // R3-3 (round-3 review): pre-existing silent-orphan hole. A LEDGERED claim (status trial, or a
      // ledgered claim whose principle no accepted claim carries) that gains receipts had them absorbed
      // NOWHERE and reported NOWHERE. Keep the disposition (never re-emit `fresh`), but say it out loud.
      //
      // R5-1 (round-5 review, found in round 3's own fix): this FYI fired for claims with NO ledger
      // record too — a claim Sean has never adjudicated, which merely gained a second receipt. That is
      // not an orphan: the claim is still PENDING, synthesize has already regenerated it carrying the
      // new receipt, and the packet presents it for decision. The FYI said "nothing absorbed these
      // receipts" about a claim whose own row carried them, and reported its status as "unknown".
      // Only a claim with an actual ledger disposition can have evidence stranded by that disposition.
      if (decided) {
        emit({
          kind: 'grown-unmatched', runId, domainId: claim.domainId, claimId: claim.claimId,
          reason: 'no-accepted-match', status: decided.status,
          addedProducts: claim.products.filter((p) => !(decided.products ?? []).includes(p)),
          receiptRefs: claim.receiptRefs, receiptId: claim.receiptRefs[0],
        });
      }
      continue;
    }
    const second = am[1];
    const margin = best.S - (second?.S ?? 0);
    const tokenN = contentTokens(claim.principle, opts.stopwords).length;
    const autoGate = best.S >= auto.S && best.O >= auto.O && margin >= auto.margin && tokenN >= auto.minTokens;
    if (!autoGate) {
      // Same hole, other cause: the paraphrase scored into the merge band but under the auto-gate.
      // This is the documented residual whose remedy is the human `m CLM-xxx` merge — so name the
      // candidate rather than dropping the evidence on the floor. Same R5-1 guard: a pending claim is
      // not stranded, it is awaiting a decision.
      if (decided) {
        emit({
          kind: 'grown-unmatched', runId, domainId: claim.domainId, claimId: claim.claimId,
          reason: 'below-auto-gate', candidateClaimId: best.target.claimId,
          similarity: pick(best), receiptRefs: claim.receiptRefs, receiptId: claim.receiptRefs[0],
        });
      }
      continue;
    }
    const target = baseFor(best.target);
    const newRefs = claim.receiptRefs.filter((r) => !(target.receiptRefs || []).includes(r));
    if (!newRefs.length) continue;
    const merged = applyCorroboration(target, claim, nowIso, runId);
    liveTarget.set(target.claimId, merged.record);
    claimAppends.push(merged.record);
    emit({ kind: merged.kind, runId, domainId: claim.domainId, claimId: claim.claimId, matchedClaimId: target.claimId, receiptId: newRefs[0], receiptRefs: claim.receiptRefs, addedProducts: merged.addedProducts, prevLevel: merged.prevLevel, nextLevel: merged.nextLevel, similarity: pick(best) });
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

/**
 * Dispositions — the kinds that mean "this claim has been dealt with", so a claim carrying one is not
 * re-presented as `fresh`. Deliberately EXCLUDES the two FYI kinds below.
 *
 * FYI kinds (`stale-decision-evidence`, `grown-unmatched`) are NOT dispositions: they change nothing,
 * they only report that evidence is sitting unabsorbed. They are excluded from `DISPOSITION_KINDS`
 * and therefore from `accountedByClaim` on purpose, which makes them re-fire on every run while the
 * condition is unresolved. That is the intended behaviour — a state that needs a human decision
 * should keep saying so, and "reported once, then silent" is how an unresolved state gets forgotten.
 */
const DISPOSITION_KINDS = new Set(['fresh', 'corroborate', 'corroborate-same-product', 'dedup-proposed', 'merge-queue']);

/**
 * R3-1: statuses that are a decision AGAINST a claim, so its evidence must never be auto-corroborated.
 * `rejected` is obvious. `merged` is a tombstone — adjudicate already absorbed its evidence into the
 * merge target, so new evidence must be surfaced for a human, not silently re-pointed.
 * `trial` is NOT here: trial means on-probation, and a trial claim restating an accepted neighbour
 * must still be able to strengthen that neighbour.
 */
const DECISION_STANDS = new Set(['rejected', 'merged']);

/** CLI wiring: read state, run the pure core, perform writes through the writer. */
export function runCorroborate(root, cfgDir, { nowIso = new Date().toISOString() } = {}) {
  const cfg = loadConfig(cfgDir);
  const proposedAll = readJsonl(join(root, 'claims-proposed.jsonl'));
  // Hostile finding F3 (2026-09-18): runId used to be `nowIso.slice(0,10)` — the UTC DATE. Two runs
  // on the same day therefore shared one runId, their deterministic eventIds collided, and the second
  // run's `receipt-count` (the novelty denominator) was silently swallowed as a duplicate. They also
  // collapsed into a single novelty window bucket, so the dial could never leave INSUFFICIENT_DATA
  // within a day. A runId must identify a RUN. (The old `runIdSeen` override was dead — synthesize
  // never wrote the field — and is dropped.)
  const runId = `${nowIso.slice(0, 19)}Z`;
  const events = readJsonl(join(root, 'events.jsonl'));
  const seen = new Set(events.map((e) => e.eventId));
  const claimsWithEvents = new Set(events.filter((e) => DISPOSITION_KINDS.has(e.kind)).map((e) => e.claimId));
  const proposed = proposedAll.filter((c) => c.status === 'proposed' && !claimsWithEvents.has(c.claimId));
  const pendingProposed = proposedAll.filter((c) => c.status === 'proposed' && claimsWithEvents.has(c.claimId));

  // Receipt accounting: which receipts a claim's existing disposition already accounted for.
  // Legacy events (written before this change) carry no receiptRefs, so their claims are treated as
  // fully accounted — the conservative choice that preserves the old behaviour on old data.
  const accountedByClaim = new Map();
  for (const e of events) {
    if (!DISPOSITION_KINDS.has(e.kind) || !e.claimId || e.claimId === '-') continue;
    const set = accountedByClaim.get(e.claimId) ?? new Set();
    for (const r of (e.receiptRefs ?? [])) set.add(r);
    accountedByClaim.set(e.claimId, set);
  }
  const grownProposed = proposedAll.filter((c) => {
    if (c.status !== 'proposed' || !claimsWithEvents.has(c.claimId)) return false;
    const accounted = accountedByClaim.get(c.claimId);
    if (!accounted || accounted.size === 0) return false;
    return c.receiptRefs.some((r) => !accounted.has(r));
  });

  const folded = loadClaims(join(root, 'claims.jsonl'));
  const accepted = folded.filter((c) => c.status === 'accepted');
  const decidedById = new Map(folded.map((c) => [c.claimId, c]));
  const receiptsById = new Map(readJsonl(join(root, 'receipts.jsonl')).map((r) => [r.receiptId, r]));

  // Receipts already counted by an earlier run — the novelty denominator is per-run yield, so a
  // receipt reviewed last week must not inflate (or deflate) today's ratio.
  const alreadyCountedReceipts = new Set();
  for (const e of events) {
    if (e.kind !== 'receipt-count') continue;
    for (const rid of (e.receiptIds ?? [])) alreadyCountedReceipts.add(rid);
  }

  const { events: newEvents, claimAppends, pendingRewrite } = corroborateBatch({
    proposed, grownProposed, accepted, pendingProposed, receiptsById,
    tuning: { ...cfg.tuning, stopwords: cfg.stopwords }, negationCues: cfg.negationCues,
    runId, nowIso, seenEventIds: seen, alreadyCountedReceipts, decidedById,
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
  return { runId, events: newEvents.length, claimAppends: claimAppends.length, tally, examined: proposed.length + grownProposed.length, grown: grownProposed.length };
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
  console.log(`  examined ${res.examined} claim(s) (${res.grown} with grown evidence)`);
  console.log(`  ${JSON.stringify(res.tally)}`);
  console.log('next: node src/packet.mjs --root <root>');
  process.exit(0);
}
