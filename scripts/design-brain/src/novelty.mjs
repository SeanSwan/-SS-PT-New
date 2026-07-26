/**
 * novelty.mjs — the "is this domain still teaching us anything?" dial (Kimi design §2).
 * ====================================================================================
 * Pure arithmetic over the append-only events.jsonl that corroborate emits. No second accounting
 * system: novelty reads dispositions, never recomputes them.
 *
 *   novelty_run = (fresh + contradiction-candidate) / validReceipts     per domain-run
 *   N_domain    = mean(novelty over the last `window` runs)
 *
 * Corroborations, same-product re-hits, dedups, and merge-queue items contribute 0 — they are
 * certainty or unresolved noise, not novelty. A live contradiction stream DOES count as novelty
 * (a contradicting domain is not mapped). History is never recomputed retroactively — novelty is
 * point-in-time.
 *
 * States: INSUFFICIENT DATA (<2 runs) → PRODUCTIVE (N≥productive) → COOLING (between) →
 * TAPPED OUT (N<tappedOut AND ≥minKnownClaims AND ≥minWindowReceipts). The two floors are the guard
 * against a starved/badly-queried domain reading as "mapped".
 *
 * @module design-brain/novelty
 */
import { join } from 'node:path';
import { readJsonl, loadClaims } from './synthesize.mjs';

/**
 * Pure core. events[] + claims[] + config → per-domain novelty state.
 * @returns {Array<{domainId, runs, rolling, state, lastRun, knownClaims, windowReceipts, corroborated}>}
 */
export function computeNovelty(events, claims, domains, tuning) {
  const { window, productive, tappedOut, minKnownClaims, minWindowReceipts } = tuning.novelty;

  // group events by domain → run, preserving first-seen run order
  const perDomain = new Map();
  for (const e of events) {
    if (e.sourceClass === 'mobbin') continue; // Provider-classed records can never influence claims novelty.
    if (!e.domainId || e.domainId === '-') continue;
    if (!perDomain.has(e.domainId)) perDomain.set(e.domainId, new Map());
    const runs = perDomain.get(e.domainId);
    if (!runs.has(e.runId)) runs.set(e.runId, { fresh: 0, contradiction: 0, corroborate: 0, mergeQueue: 0, receipts: 0 });
    const r = runs.get(e.runId);
    if (e.kind === 'fresh') r.fresh += 1;
    else if (e.kind === 'contradiction-candidate') r.contradiction += 1;
    else if (e.kind === 'corroborate' || e.kind === 'corroborate-same-product' || e.kind === 'dedup-proposed') r.corroborate += 1;
    else if (e.kind === 'merge-queue') r.mergeQueue += 1;
    else if (e.kind === 'receipt-count') r.receipts += e.count || 0;
  }

  const knownByDomain = new Map();
  for (const c of claims) knownByDomain.set(c.domainId, (knownByDomain.get(c.domainId) || 0) + 1);

  const out = [];
  for (const d of domains) {
    const runsMap = perDomain.get(d.id);
    const runList = runsMap ? [...runsMap.entries()].map(([runId, v]) => ({ runId, ...v })) : [];
    const windowRuns = runList.slice(-window);
    const noveltyPer = windowRuns.map((r) => (r.receipts > 0 ? (r.fresh + r.contradiction) / r.receipts : 0));
    const rolling = noveltyPer.length ? noveltyPer.reduce((a, b) => a + b, 0) / noveltyPer.length : 0;
    const knownClaims = knownByDomain.get(d.id) || 0;
    const windowReceipts = windowRuns.reduce((a, r) => a + r.receipts, 0);
    const corroborated = windowRuns.reduce((a, r) => a + r.corroborate, 0);

    let state;
    if (runList.length < 2) state = 'INSUFFICIENT_DATA';
    else if (rolling >= productive) state = 'PRODUCTIVE';
    else if (rolling >= tappedOut) state = 'COOLING';
    else if (knownClaims >= minKnownClaims && windowReceipts >= minWindowReceipts) state = 'TAPPED_OUT';
    else state = 'COOLING'; // low novelty but under a floor → not proven tapped out (starved/badly-queried)

    const last = runList[runList.length - 1];
    out.push({
      domainId: d.id, name: d.name, depth: d.depth,
      runs: runList.length, rolling: Math.round(rolling * 1000) / 1000, state,
      knownClaims, windowReceipts, corroborated,
      lastRun: last ? { runId: last.runId, receipts: last.receipts, fresh: last.fresh, corroborate: last.corroborate, mergeQueue: last.mergeQueue, contradiction: last.contradiction } : null,
      noveltyPer: noveltyPer.map((n) => Math.round(n * 1000) / 1000),
    });
  }
  return out;
}

/** Next-domain recommendation: fewest total runs, deep first, then config order. Deliberately dumb. */
export function recommendNextDomain(noveltyRows) {
  const candidates = noveltyRows
    .filter((r) => r.state !== 'PRODUCTIVE')
    .sort((a, b) => (a.runs - b.runs) || (a.depth === 'deep' ? -1 : 1) - (b.depth === 'deep' ? -1 : 1));
  return candidates[0] || null;
}

/** Load state from disk and compute. */
export function noveltyReport(root, cfgDir, readCfg) {
  const events = readJsonl(join(root, 'events.jsonl'));
  const claims = loadClaims(join(root, 'claims.jsonl'));
  const tuning = readCfg('tuning.json');
  const domains = readCfg('domains.json').domains;
  const rows = computeNovelty(events, claims, domains, tuning);
  return { rows, nextDomain: recommendNextDomain(rows) };
}

const LABEL = {
  INSUFFICIENT_DATA: 'INSUFFICIENT DATA', PRODUCTIVE: 'PRODUCTIVE', COOLING: 'COOLING', TAPPED_OUT: 'TAPPED OUT',
};

/** The packet header block — ≤8 lines, read before any claim. */
export function renderNoveltyBlock(rows, nextDomain) {
  const active = rows.filter((r) => r.runs > 0);
  const lines = ['## NOVELTY'];
  if (!active.length) { lines.push('(no runs yet)'); return lines.join('\n') + '\n'; }
  for (const r of active) {
    const trend = r.noveltyPer.length ? ` (last ${r.noveltyPer.length}: ${r.noveltyPer.join(' / ')})` : '';
    const detail = r.state === 'INSUFFICIENT_DATA'
      ? `(${r.runs} run${r.runs === 1 ? '' : 's'})`
      : `rolling ${r.rolling}${trend}  ${r.windowReceipts} receipts → ${r.lastRun?.fresh ?? 0} new · ${r.corroborated} corroborations`;
    lines.push(`${r.domainId}  ${LABEL[r.state].padEnd(11)} ${detail}`);
  }
  if (nextDomain) lines.push(`Next best domain: ${nextDomain.domainId} (${nextDomain.runs} runs, depth=${nextDomain.depth})`);
  return lines.join('\n') + '\n';
}

/** CLI entrypoint: print the full novelty table + tapped-out recommendations. */
if (process.argv[1]?.endsWith('novelty.mjs')) {
  const { resolveDataRoot } = await import('./paths.mjs');
  const { fileURLToPath } = await import('node:url');
  const { dirname } = await import('node:path');
  const { readFileSync: rf, existsSync: ex } = await import('node:fs');
  const i = process.argv.indexOf('--root');
  const root = resolveDataRoot(i !== -1 ? process.argv[i + 1] : undefined);
  const cfgDir = join(dirname(dirname(fileURLToPath(import.meta.url))), 'config');
  const readCfg = (f) => JSON.parse(rf(join(cfgDir, f), 'utf8'));
  const events = readJsonl(join(root, 'events.jsonl'));
  const claims = loadClaims(join(root, 'claims.jsonl'));
  const rows = computeNovelty(events, claims, readCfg('domains.json').domains, readCfg('tuning.json'));
  process.stdout.write(renderNoveltyTable(rows, recommendNextDomain(rows)));
  process.exit(0);
}

/** The `brain novelty` CLI table + recommendation prose. */
export function renderNoveltyTable(rows, nextDomain) {
  const lines = ['DOMAIN  STATE             ROLLING  RUNS  KNOWN  LAST-RUN', ''];
  for (const r of rows) {
    const last = r.lastRun ? `${r.lastRun.receipts} receipts → ${r.lastRun.fresh} new, ${r.lastRun.corroborate} corrob` : 'never run';
    lines.push(`${r.domainId.padEnd(6)}  ${LABEL[r.state].padEnd(16)}  ${String(r.rolling).padEnd(6)}  ${String(r.runs).padEnd(4)}  ${String(r.knownClaims).padEnd(5)}  ${last}`);
  }
  const tapped = rows.filter((r) => r.state === 'TAPPED_OUT');
  for (const r of tapped) {
    lines.push('', `▸ ${r.domainId} is TAPPED OUT: rolling novelty ${r.rolling} over ${r.noveltyPer.length} runs`);
    lines.push(`  (${r.windowReceipts} receipts, ${r.lastRun?.fresh ?? 0} new principles last run, ${r.corroborated} corroborations —`);
    lines.push(`  the brain is re-confirming, not learning). ${r.knownClaims} known claims.`);
    if (nextDomain) lines.push(`  RECOMMENDATION: stop Mobbin spend on ${r.domainId}. Next: ${nextDomain.domainId} (${nextDomain.depth}, ${nextDomain.runs} runs).`);
    lines.push('  Runs are NOT blocked — this is a recommendation; you decide.');
  }
  return lines.join('\n') + '\n';
}
