/**
 * packet.mjs — render the weekly batch-adjudication packet: Sean's ONE human surface.
 * ===================================================================================
 * One markdown file, ≤8 lines per claim, decided by EDITING THE FILE: each claim carries a
 * `DECIDE:` line where Sean replaces `_` with a letter —
 *     a = accept   r = reject   t = trial   m CLM-xxx = merge into that claim
 * Then: node src/adjudicate.mjs --root <root> --batch <file>. No UI, no clicks, one edit pass —
 * "one markdown file beats any UI for adjudication" (Pass C, accepted).
 *
 * USAGE
 *   node src/packet.mjs --root <data-root>       # renders batches/BATCH-<date>.md from proposed claims
 *
 * @module design-brain/packet
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { resolveDataRoot } from './paths.mjs';
import { safeWriteText } from './writer.mjs';
import { readJsonl, loadClaims } from './synthesize.mjs';
import { computeNovelty, recommendNextDomain, renderNoveltyBlock } from './novelty.mjs';

const CFG_DIR = join(dirname(dirname(fileURLToPath(import.meta.url))), 'config');
const readCfg = (f, d) => (existsSync(join(CFG_DIR, f)) ? JSON.parse(readFileSync(join(CFG_DIR, f), 'utf8')) : d);

/**
 * The latest disposition per proposed claim, from events.jsonl. A claim that CORROBORATED an
 * accepted claim (or was dedup'd) is DONE — it must not appear as a DECIDE block, or Sean would be
 * re-judging what the machine already folded in. Only `fresh` and `merge-queue` need a letter.
 */
function dispositions(events) {
  const m = new Map();
  for (const e of events) {
    if (['fresh', 'corroborate', 'corroborate-same-product', 'dedup-proposed', 'merge-queue'].includes(e.kind) && e.claimId && e.claimId !== '-') {
      m.set(e.claimId, e.kind);
    }
  }
  return m;
}

/** Render one claim as its packet block (≤8 lines). */
export function renderClaim(c) {
  const conf = `${c.confidence.level}${c.singleSource ? ' (SINGLE SOURCE)' : ''}`;
  const lines = [
    `### ${c.claimId} — ${c.domainId} · ${conf}`,
    `**${c.principle.trim()}**`,
    `products: ${c.products.join(', ')}  ·  receipts: ${c.receiptRefs.join(', ')}`,
  ];
  if (c.exceptions?.length) lines.push(`exceptions: ${c.exceptions.join('; ')}`);
  if (c.contradictions?.length) lines.push(`⚠ contradicts: ${c.contradictions.join(', ')}`);
  lines.push('DECIDE: _   (a=accept  r=reject  t=trial  m CLM-xxx=merge)');
  lines.push('');
  return lines.join('\n');
}

/**
 * Pure core: claims[] → packet markdown.
 * `disp` is the events disposition map; when present, only fresh/merge-queue claims get DECIDE blocks
 * and corroborations are summarised as FYI (no letter). `noveltyBlock`/`fyi` are prepended strings.
 *
 * Hostile finding F1a (2026-09-18): a claim Sean had ALREADY adjudicated was re-presented as a
 * DECIDE block on the next cycle, because synthesize regenerates claims from receipts and every
 * regenerated row carries status=proposed. His letter on that block was then silently dropped by
 * adjudicate's idempotency guard. `adjudicatedIds` (claim ids already in claims.jsonl) is the
 * authoritative "do not ask again" set; withheld claims are named so nothing disappears quietly.
 */
export function renderPacket(claims, { batchId, disp = null, adjudicatedIds = null, noveltyBlock = '', fyi = '' }) {
  let proposed = claims.filter((c) => c.status === 'proposed');
  const withheld = [];
  if (adjudicatedIds) {
    proposed = proposed.filter((c) => {
      if (adjudicatedIds.has(c.claimId)) { withheld.push(c.claimId); return false; }
      return true;
    });
  }
  if (disp) {
    // Suppress claims already folded by corroborate; keep fresh, merge-queue, and any not-yet-scored.
    proposed = proposed.filter((c) => {
      const d = disp.get(c.claimId);
      return d === undefined || d === 'fresh' || d === 'merge-queue';
    });
  }
  const head = [
    `# Batch ${batchId} — ${proposed.length} claims to adjudicate`,
    '',
    '> Edit each `DECIDE:` line, save, then run:',
    '> `node src/adjudicate.mjs --root <root> --batch <this file>`',
    '> Unmarked claims stay proposed — skipping is allowed, guessing is not.',
    '',
  ];
  if (withheld.length) {
    head.push(
      `> ${withheld.length} claim(s) already adjudicated and withheld from this batch:`,
      `> ${withheld.join(', ')}`,
      '> (they live in claims.jsonl; re-deciding them is not possible and will be reported as ignored)',
      '',
    );
  }
  const parts = [];
  if (noveltyBlock) parts.push(noveltyBlock, '');
  parts.push(head.join('\n'));
  if (fyi) parts.push(fyi, '');
  const perDomain = new Map();
  for (const c of proposed) perDomain.set(c.domainId, (perDomain.get(c.domainId) || 0) + 1);
  parts.push(`domains: ${[...perDomain.entries()].map(([d, n]) => `${d}×${n}`).join(' · ') || '(none)'}`, '');
  return parts.join('\n') + '\n' + proposed.map(renderClaim).join('\n');
}

/** FYI block: auto-corroborations (no action) + merge-queue suggestions + contradiction pairs. */
export function renderFyi(events, runId) {
  const inRun = events.filter((e) => e.runId === runId);
  const corr = inRun.filter((e) => e.kind === 'corroborate' || e.kind === 'corroborate-same-product');
  const mq = inRun.filter((e) => e.kind === 'merge-queue');
  const contra = inRun.filter((e) => e.kind === 'contradiction-candidate');
  const stale = inRun.filter((e) => e.kind === 'stale-decision-evidence');
  const unmatched = inRun.filter((e) => e.kind === 'grown-unmatched');
  if (!corr.length && !mq.length && !contra.length && !stale.length && !unmatched.length) return '';
  const lines = ['## THIS BATCH'];
  if (corr.length) {
    lines.push(`AUTO-CORROBORATED (FYI, no action): ${corr.length}`);
    for (const e of corr.slice(0, 10)) {
      const bump = e.prevLevel && e.nextLevel && e.prevLevel !== e.nextLevel ? `  ${e.prevLevel}→${e.nextLevel}` : '';
      const prod = e.addedProducts?.length ? `  (+${e.addedProducts.join(', +')})` : ' (same product)';
      lines.push(`  ${e.matchedClaimId}${bump}${prod}`);
    }
  }
  if (mq.length) {
    lines.push(`MERGE QUEUE (your call — suggested m): ${mq.length}`);
    for (const e of mq) lines.push(`  ${e.claimId} ≈ ${e.matchedClaimId} (S=${e.similarity?.S ?? '?'}) — suggest: m ${e.matchedClaimId}`);
  }
  if (contra.length) {
    lines.push(`CONTRADICTION CANDIDATES (never auto-resolved): ${contra.length}`);
    for (const e of contra) lines.push(`  ${e.claimId} vs ${e.matchedClaimId} — accepting the new claim cross-links both`);
  }
  if (stale.length) {
    // R2-1 (round-2 review): a claim decided AGAINST (rejected/merged) gained evidence. The decision
    // stands and nothing was written — but the new evidence must be VISIBLE, or a rejection silently
    // becomes a permanent blind spot. (R3-1: `trial` is not decided-against and is not reported here;
    // a trial claim's evidence flows to an accepted neighbour, or shows up under RESTATED below.)
    lines.push(`NEW EVIDENCE ON DECIDED CLAIMS (no action taken — your decision stands): ${stale.length}`);
    for (const e of stale) {
      const prod = e.addedProducts?.length ? `+${e.addedProducts.join(', +')}` : 'no new products';
      lines.push(`  ${e.claimId} was ${e.decidedStatus} — ${prod} now restate it. Revisit by hand if you want to.`);
    }
  }
  if (unmatched.length) {
    // R3-3 (round-3 review): receipts restating a ledgered claim that no accepted claim absorbed.
    // Before this the receipts were orphaned with NO surface anywhere naming them. Nothing was
    // written; this is the prompt to accept, merge, or reject deliberately.
    lines.push(`RESTATED BUT NOT CORROBORATED (nothing absorbed these receipts — your call): ${unmatched.length}`);
    for (const e of unmatched) {
      const why = e.reason === 'below-auto-gate'
        ? `scored S=${e.similarity?.S ?? '?'} against ${e.candidateClaimId} — below the auto-gate; suggest: m ${e.candidateClaimId}`
        : `no accepted claim matches (status ${e.status})`;
      lines.push(`  ${e.claimId} — ${why}; ${e.receiptRefs?.length ?? 0} receipt(s) unabsorbed`);
    }
  }
  return lines.join('\n');
}

function main() {
  const i = process.argv.indexOf('--root');
  const root = resolveDataRoot(i !== -1 ? process.argv[i + 1] : undefined);
  const claims = readJsonl(join(root, 'claims-proposed.jsonl'));
  const events = readJsonl(join(root, 'events.jsonl'));
  const adjudicatedIds = new Set(loadClaims(join(root, 'claims.jsonl')).map((c) => c.claimId));
  const batchId = new Date().toISOString().slice(0, 10);

  // novelty header + FYI (only when the corroborate step has produced events)
  let noveltyBlock = ''; let fyi = ''; let disp = null;
  if (events.length) {
    const rows = computeNovelty(events, loadClaims(join(root, 'claims.jsonl')), readCfg('domains.json', { domains: [] }).domains, readCfg('tuning.json'));
    noveltyBlock = renderNoveltyBlock(rows, recommendNextDomain(rows));
    const lastRun = events[events.length - 1].runId;
    fyi = renderFyi(events, lastRun);
    disp = dispositions(events);
  }

  // Hostile finding F8 (2026-09-18): the batch path was the bare date, so re-running packet
  // overwrote the file Sean was mid-edit on and destroyed his letters. An edited batch is preserved
  // by writing the new batch to a timestamped sibling instead.
  let file = join(root, 'batches', `BATCH-${batchId}.md`);
  if (existsSync(file) && /^DECIDE:\s*[artm]\b/mi.test(readFileSync(file, 'utf8'))) {
    const stamp = new Date().toISOString().slice(11, 16).replace(':', '');
    file = join(root, 'batches', `BATCH-${batchId}-${stamp}.md`);
    console.log(`note: BATCH-${batchId}.md carries your letters — preserved; writing BATCH-${batchId}-${stamp}.md`);
  }
  safeWriteText(root, file, renderPacket(claims, { batchId, disp, adjudicatedIds, noveltyBlock, fyi }));
  console.log(`packet -> ${file}`);
  console.log('edit the DECIDE lines, then run adjudicate.');
  return 0;
}

if (process.argv[1]?.endsWith('packet.mjs')) process.exit(main());
