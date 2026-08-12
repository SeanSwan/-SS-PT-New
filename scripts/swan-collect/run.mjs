#!/usr/bin/env node
/**
 * run.mjs — the collector runner. Entity in, reconciled items on disk, receipt out.
 * ============================================================================
 * This is the piece that turns the parts into something you invoke:
 *
 *   entity → SCOPE GATE → per-source adapters → normalize → reconcile → store
 *                ↓ deny                                          ↓
 *           explained refusal                              sync receipt
 *
 * ORDERING IS THE POINT. The scope gate runs FIRST and once, before any network
 * call, so a refused entity costs nothing and leaves no trace. Every adapter then
 * runs independently: one source failing (rate limit, outage, bad handle) must
 * never abort the others, because a newsroom that loses Bluesky when YouTube is
 * down is a newsroom with a single point of failure it did not choose.
 *
 * Usage:
 *   node run.mjs --name "Reuters" --category organization \
 *                --bluesky reuters.com --rss https://feeds.npr.org/1001/rss.xml
 *   node run.mjs --sources            # what can run right now, and what cannot
 *
 * @module swan-collect/run
 */

import { createDefaultRegistry } from './default-registry.mjs';
import { createStore } from './core/store.mjs';
import { reconcile } from './core/reconcile.mjs';
import { checkEntity } from './core/entity-scope.mjs';
import { CollectError } from './core/item.mjs';

/**
 * Collect one entity across every satisfied source.
 *
 * Returns a RECEIPT — never throws for a single source's failure. The receipt is
 * the audit artifact: it records what ran, what each source produced, and what
 * failed and why. A run that half-worked must be legible as such.
 */
export async function collectEntity(entity, {
  registry, store, credentials = {}, now = () => new Date().toISOString(), max = 100, log = () => {},
} = {}) {
  // A dropped handle must be LOUD. Silently ignoring a source the operator asked
  // for means they believe it is covered when it is not — which, for a newsroom,
  // is a gap in the evidence base that nobody knows exists.
  const droppedHandles = [];
  const verdict = checkEntity(entity, {
    onDroppedHandle: (source, why) => {
      droppedHandles.push({ source, why });
      log(`  ⚠ handle for '${source}' was rejected: ${why}`);
    },
  });
  if (!verdict.allowed) {
    // A refusal is a first-class result, not an exception. It is returned in the
    // same shape as a success so a caller cannot forget to handle it.
    // Same key set as the success shape (Kimi K3 packet-7 L6) so a consumer
    // iterating the receipt never has to branch on which kind it got.
    return { allowed: false, code: verdict.code, reason: verdict.reason, sources: [], droppedHandles, totals: zero() };
  }

  const ent = verdict.entity;
  const reg = registry || await createDefaultRegistry();
  const at = now();
  const sources = [];

  for (const adapter of reg.listEnabled(credentials)) {
    const handle = ent.handles[adapter.handleField];
    if (!handle) continue; // this entity simply has no presence on this source

    const entry = { source: adapter.key, tier: adapter.tier, termsPosture: adapter.termsPosture, handle };
    try {
      log(`  ${adapter.key}: collecting ${handle}…`);
      const result = await adapter.collect(handle, {
        max,
        entityRef: ent.name,
        apiKey: credentials[adapter.key],
      });
      const fetched = result.items || [];

      // Scope seal in practice: `previous` is read from the cell for exactly
      // this (source, entity) pair, so reconcile can never see a mixed set.
      const previous = store ? await store.read(adapter.key, ent.name) : [];
      const diff = reconcile(previous, fetched, { at, windowComplete: result.windowComplete === true });

      // `kept` MUST be included. The write is a full-cell replace, so anything
      // omitted here is deleted from the evidence base (Kimi K3 packet-7 H1).
      const merged = [...diff.added, ...diff.updated, ...diff.kept, ...diff.retracted];
      if (store) await store.write(adapter.key, ent.name, merged, { savedAt: at });

      Object.assign(entry, {
        ok: true,
        fetched: fetched.length,
        added: diff.added.length,
        updated: diff.updated.length,
        kept: diff.kept.length,
        retracted: diff.retracted.length,
        stored: merged.length,
        windowComplete: diff.windowComplete,
      });
    } catch (e) {
      // One source failing is expected and survivable. Record it and continue.
      Object.assign(entry, { ok: false, error: e instanceof CollectError ? e.message : `unexpected: ${e.message}` });
      log(`  ${adapter.key}: FAILED — ${entry.error}`);
    }
    sources.push(entry);
  }

  return { allowed: true, entity: ent, at, sources, droppedHandles, totals: tally(sources) };
}

const zero = () => ({ fetched: 0, added: 0, updated: 0, retracted: 0, failed: 0 });

function tally(sources) {
  const t = zero();
  for (const s of sources) {
    if (!s.ok) { t.failed += 1; continue; }
    t.fetched += s.fetched; t.added += s.added; t.updated += s.updated; t.retracted += s.retracted;
  }
  return t;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  // `handles` is null-prototype: with a plain object, `--__proto__ <value>` set the
  // prototype instead of an own key, so it was invisible to Object.keys and the
  // unknown-source guard below SILENTLY IGNORED it rather than refusing. Any flag
  // the caller typed must either be a real source or be rejected — never absorbed.
  const out = { handles: Object.create(null), credentials: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (!flag.startsWith('--')) continue;
    const key = flag.slice(2);
    const next = argv[i + 1];
    const value = next && !next.startsWith('--') ? (i += 1, next) : true;
    if (key === 'name') out.name = value;
    else if (key === 'category') out.category = value;
    else if (key === 'citation') out.citation = value;
    else if (key === 'max') out.max = Number(value);
    else if (key === 'dir') out.dir = value;
    else if (key === 'sources' || key === 'help') out[key] = true;
    else out.handles[key] = value; // --bluesky reuters.com, --rss https://…
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const registry = await createDefaultRegistry();

  // Credentials come from the environment ONLY. Never a flag — a flag lands in
  // shell history and in the process list where any local user can read it.
  const credentials = {
    youtube: process.env.YOUTUBE_API_KEY,
    ...Object.fromEntries(['x', 'instagram', 'tiktok', 'facebook', 'linkedin', 'threads']
      .map((p) => [`vendor_${p}`, process.env.SWAN_VENDOR_KEY])),
  };

  if (args.help || (!args.name && !args.sources)) {
    console.log(`swan-collect — portable entity intel

  node run.mjs --sources
  node run.mjs --name "Reuters" --category organization --bluesky reuters.com
  node run.mjs --name "NPR" --category organization --rss https://feeds.npr.org/1001/rss.xml

Categories: organization | official | brand_account | public_figure
  (official and public_figure require --citation <https url>)

Credentials come from the environment: YOUTUBE_API_KEY, SWAN_VENDOR_KEY.`);
    return;
  }

  if (args.sources) {
    const { available, unavailable } = registry.status(credentials);
    console.log('AVAILABLE NOW');
    for (const a of available) console.log(`  ${a.key.padEnd(18)} ${a.termsPosture}`);
    console.log('\nUNAVAILABLE');
    for (const a of unavailable) console.log(`  ${a.key.padEnd(18)} ${a.reason}`);
    return;
  }

  // parseArgs lets any unrecognized --flag fall through to handles, because
  // source keys are dynamic and cannot be enumerated in the parser. The cost is
  // that a typo (--blueksy) becomes a handle for a source that does not exist,
  // gets skipped, and the run still prints "0 source(s) failed" and exits 0 —
  // a green result for a source that was never contacted. Refuse instead.
  const unknownSources = Object.keys(args.handles).filter((k) => !registry.has(k));
  if (unknownSources.length) {
    const valid = registry.list().map((a) => a.key).join(', ');
    console.error(`REFUSED (unknown-source): no adapter for ${unknownSources.map((k) => `--${k}`).join(', ')}. Valid sources: ${valid}`);
    process.exitCode = 2;
    return;
  }

  const store = createStore(args.dir || '.ai-workflow/collect-store');
  const receipt = await collectEntity(
    { name: args.name, category: args.category, citation: args.citation, handles: args.handles },
    { registry, store, credentials, max: args.max || 100, log: (m) => console.log(m) },
  );

  if (!receipt.allowed) {
    console.error(`REFUSED (${receipt.code}): ${receipt.reason}`);
    process.exitCode = 2;
    return;
  }

  console.log(`\n${receipt.entity.name} — ${receipt.at}`);
  for (const s of receipt.sources) {
    console.log(s.ok
      ? `  ${s.source.padEnd(18)} ${s.fetched} fetched · +${s.added} ~${s.updated} =${s.kept} ⊘${s.retracted} · ${s.stored} stored · window ${s.windowComplete ? 'complete' : 'partial'}`
      : `  ${s.source.padEnd(18)} FAILED — ${s.error}`);
  }
  const t = receipt.totals;
  console.log(`  TOTAL: ${t.fetched} fetched, +${t.added} new, ${t.retracted} withdrawn, ${t.failed} source(s) failed`);
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(`fatal: ${e.message}`); process.exitCode = 1; });
}
