#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/query.mjs
 * PURPOSE: Ask the brains a question. Returns cited, creator-grouped hits.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S6)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * READS LANE C ONLY. The query surface never opens a transcript document, so a
 * question can be answered and shared without the owner-private tier being in
 * the room — the same boundary the export path holds, enforced the same way
 * (this module does not import the Lane B reader).
 *
 * THE DISAGREEMENT SIGNAL IS THE PRODUCT:
 *   Grouping hits by creator is not cosmetic. When two creators answer the same
 *   topic differently, that difference IS the information — the upstream plan
 *   calls it "the signal" and nothing else in the system produces it. So the
 *   result carries `byCreator` and, when the same topic draws opposing
 *   modalities, a `conflicts` list naming both sides with citations.
 *
 * LEXICAL, NOT SEMANTIC, AND THAT IS A KNOWN LIMIT:
 *   `tear trough` will not find `under-eye hollow`. Both hostile-review seats
 *   independently said embeddings are required for this use case, and they are
 *   right — but that is a later, rebuildable index over exactly these rows. v1
 *   is honest about being lexical: no result says "nothing" without saying
 *   which words it looked for.
 *
 * @module creator-brains/query
 */

import { join } from 'node:path';
import { listDir, paths } from './paths.mjs';
import { readJsonl } from './paths.mjs';

/** Load every brain's rules.jsonl into one hit list. */
export function loadHits(r, { creator = null } = {}) {
  const base = paths(r).brainsDir;
  const hits = [];
  for (const slug of listDir(base)) {
    const rows = readJsonl(join(base, slug, 'rules.jsonl'));
    for (const row of rows) {
      if (creator && row.creator_id !== creator) continue;
      hits.push({
        ...row,
        slug,
        url: Array.isArray(row.cites) && row.cites.length ? row.cites[0] : null,
      });
    }
  }
  return hits;
}

/**
 * Search across one or all brains.
 * Returns `{ query, terms, hits, byCreator, conflicts, scanned }`.
 * An empty query THROWS — answering "everything" to a blank question is how a
 * search surface quietly becomes useless.
 */
export function queryBrains(query, { r, creator = null, limit = 40 } = {}) {
  if (typeof query !== 'string' || !query.trim()) {
    throw new Error('a query is required — refusing to return every claim for an empty query');
  }
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const all = loadHits(r, { creator });

  const scored = [];
  for (const hit of all) {
    const hay = `${hit.topic || ''} ${hit.key_phrase || ''} ${hit.statement || ''}`.toLowerCase();
    let score = 0;
    let matched = 0;
    for (const t of terms) {
      if (hay.includes(t)) { matched += 1; score += t.length; }
    }
    if (!matched) continue;
    scored.push({ ...hit, score, matched });
  }

  scored.sort((a, b) => (b.matched - a.matched) || (b.score - a.score));
  const hits = scored.slice(0, limit).map((h) => ({
    creatorId: h.creator_id,
    videoId: h.video_id,
    tStartMs: h.t_start_ms,
    modality: h.modality,
    topic: h.topic,
    statement: h.statement,
    keyPhrase: h.key_phrase,
    url: h.url,
    slug: h.slug,
  }));

  const byCreator = {};
  for (const h of hits) {
    byCreator[h.creatorId] = byCreator[h.creatorId] || [];
    byCreator[h.creatorId].push(h);
  }

  // Where two creators take opposing positions on the same topic, say so.
  const conflicts = [];
  const topics = new Set(hits.map((h) => h.topic).filter(Boolean));
  for (const topic of topics) {
    const mods = new Map();
    for (const h of hits) {
      if (h.topic !== topic) continue;
      if (!mods.has(h.modality)) mods.set(h.modality, []);
      mods.get(h.modality).push(h);
    }
    const opposing = ['directive', 'caution'].filter((m) => mods.has(m));
    if (opposing.length > 1) {
      conflicts.push({
        topic,
        sides: opposing.map((m) => ({ modality: m, examples: mods.get(m).slice(0, 2) })),
      });
    }
  }

  return { query: query.trim(), terms, hits, byCreator, conflicts, scanned: all.length };
}

/** Human-readable rendering for the CLI. */
export function formatResults(res) {
  const L = [];
  L.push(`query: ${res.query}  (terms: ${res.terms.join(', ')}; scanned ${res.scanned} claims)`);
  if (!res.hits.length) {
    L.push('');
    L.push(`No match for ${res.terms.map((t) => `"${t}"`).join(' ')}.`);
    L.push('This search is lexical — a paraphrase will not match. Try a term the creator would');
    L.push('actually say, or read topics.md for their real vocabulary.');
    return L.join('\n');
  }
  const creators = Object.keys(res.byCreator);
  L.push(`hits: ${res.hits.length} across ${creators.length} creator(s)`);
  for (const cid of creators) {
    L.push('');
    L.push(`## ${cid}`);
    for (const h of res.byCreator[cid]) {
      // `statement` is already prefixed with the modality (`directive — …`), so
      // printing the field again produced "directive — directive — change mask".
      L.push(`  [${fmtMs(h.tStartMs)}] ${h.modality} — ${h.keyPhrase || h.statement}`);
      if (h.url) L.push(`      ${h.url}`);
    }
  }
  if (res.conflicts.length) {
    L.push('');
    L.push('## Disagreement');
    for (const c of res.conflicts) {
      L.push(`- on "${c.topic}": ${c.sides.map((s) => `${s.modality} (${s.examples.length})`).join(' vs ')}`);
      for (const s of c.sides) for (const e of s.examples) L.push(`    ${s.modality}: ${e.url}`);
    }
  }
  return L.join('\n');
}

function fmtMs(ms) {
  const t = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(t / 3600); const m = Math.floor((t % 3600) / 60); const s = t % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
