#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/renderers.mjs
 * PURPOSE: The four pure renderers — brain state in, Markdown/JSONL text out.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR07/08/09/24)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * PURE AND FILESYSTEM-FREE, ON PURPOSE. These functions take a built brain and
 * return strings. They cannot read a transcript, cannot write a file, and cannot
 * publish anything — so a rendering bug can produce bad text but can never leak
 * Lane B or half-publish a generation. `render.mjs` owns validation and the
 * atomic generation swap around them.
 *
 * Split out of `render.mjs` to hold both files under the Rule 4 cap.
 *
 * THE CONTRACT EVERY RENDERER HONOURS:
 *   - a title is capped at MAX_TITLE_WORDS (the fidelity gate in render.mjs is
 *     the enforcing control; this keeps the common case small before it runs);
 *   - creator-influenced text goes through `esc()`, which escapes Markdown
 *     metacharacters AND collapses newlines so a table cannot be broken;
 *   - every citation is a `watch?v=…&t=…s` deep link to the creator's own video;
 *   - nothing claims a claim is VERIFIED. Rows are labelled `candidate`.
 *
 * @module creator-brains/renderers
 */

export const MAX_TITLE_WORDS = 7;

/** Schema of the published pointer and the machine contract. */
export const BRAIN_SCHEMA_VERSION = 2;

export function safeTitle(title, maxWords = MAX_TITLE_WORDS) {
  const raw = String(title ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return '—';
  const w = raw.split(' ');
  return w.length <= maxWords ? raw : `${w.slice(0, maxWords).join(' ')}…`;
}

export const deepLink = (videoId, ms) => `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor((ms || 0) / 1000)}s`;

const fmtDate = (s) => (s && /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : (s || '—'));

// ─────────────────────────────────────────────────────────────────────────────
// Rendering (pure — returns text, writes nothing)
// ─────────────────────────────────────────────────────────────────────────────

function frontMatter(brain) {
  return [
    '---',
    `creator_id: ${brain.namespace}`,
    `title: ${JSON.stringify(safeTitle(brain.title))}`,
    `schema_version: ${BRAIN_SCHEMA_VERSION}`,
    brain.handle ? `handle: ${brain.handle}` : null,
    `generated_at: ${brain.generatedAt}`,
    `videos_covered: ${brain.timeline.length}`,
    `claims: ${brain.claims.length}`,
    'tier: derived (Lane C)',
    '---',
    '',
  ].filter(Boolean).join('\n');
}

export function renderIndex(brain, at = Date.now()) {
  const L = [frontMatter(brain)];
  L.push(`# ${safeTitle(brain.title)} — creator brain`);
  L.push('');
  L.push(`> Derived from **${brain.docCount}** validated transcripts · **${brain.claims.length}** candidate claims · **${brain.doctrine.length}** recurring phrases.`);
  L.push('> Every line links back to the creator\'s own video at the second it was said.');
  L.push('> Claims are CANDIDATES produced by a deterministic rule, not validated statements of the creator\'s position.');
  L.push(`> Regenerated ${new Date(at).toISOString()}.`);
  L.push('');

  L.push('## What this creator keeps saying');
  L.push('');
  if (!brain.doctrine.length) {
    L.push('_No phrase has recurred with consistent polarity across more than one video yet._');
  } else {
    L.push('| Recurring | Said in | Polarity | First citation |');
    L.push('|---|---|---|---|');
    for (const d of brain.doctrine.slice(0, 20)) {
      L.push(`| ${esc(d.phrase)} | ${d.videos} videos | ${d.polarity} | [${fmtMs(d.tStartMs)}](${deepLink(d.videoId, d.tStartMs)}) |`);
    }
  }
  L.push('');

  L.push('## Topics');
  L.push('');
  if (!brain.topics.length) L.push('_No topics extracted yet._');
  else L.push(brain.topics.slice(0, 25).map((t) => `\`${t.term}\` (${t.videos}v/${t.count}x)`).join(' · '));
  L.push('');

  L.push('## Strongest candidate claims');
  L.push('');
  L.push('_Ranked by how much of this creator\'s own recurring vocabulary each claim uses._');
  L.push('');
  if (!brain.claims.length) L.push('_No claims extracted yet._');
  else {
    for (const c of brain.claims.slice(0, 30)) {
      const stamp = c.onTopic ? ` \`+${c.onTopic}\`` : '';
      L.push(`- **${c.modality}**${c.polarity === 'negative' ? ' (negative)' : ''} — ${esc(c.keyPhrase)}${stamp} — [${c.timestamp}](${c.cites[0]}) · \`${c.videoId}\``);
    }
  }
  L.push('');

  L.push('## Coverage');
  L.push('');
  L.push(`- videos with validated transcripts: **${brain.timeline.length}**`);
  L.push(`- documents read: **${brain.docCount}**`);
  if (brain.dropped) L.push(`- cues skipped as not citable: **${brain.dropped}**`);
  if (brain.invalidDocs && brain.invalidDocs.length) L.push(`- documents REJECTED as invalid: **${brain.invalidDocs.length}**`);
  L.push('');

  // COVERAGE GAPS ARE PART OF THE BRAIN, NOT AN OMISSION FROM IT.
  L.push('## Coverage gaps');
  L.push('');
  L.push(`**${(brain.gaps || []).length}** video(s) are discovered but contribute nothing yet:`);
  L.push('');
  if (!brain.gaps || !brain.gaps.length) {
    L.push('_None — every discovered video has a validated transcript._');
  } else {
    L.push('| Video | State | Why |');
    L.push('|---|---|---|');
    for (const g of brain.gaps.slice(0, 50)) L.push(`| \`${g.videoId}\` | ${g.state} | ${esc(g.reason)} |`);
    if (brain.gaps.length > 50) L.push(`| … | | ${brain.gaps.length - 50} more |`);
  }
  L.push('');
  L.push('## Files');
  L.push('');
  L.push('- `topics.md` — the recurring vocabulary, ranked');
  L.push('- `timeline.md` — every covered video with its cited moments');
  L.push('- `rules.jsonl` — machine-readable candidate claims (the downstream contract)');
  L.push('');
  return L.join('\n');
}

export function renderTopics(brain) {
  const L = [frontMatter(brain), `# ${safeTitle(brain.title)} — topics`, ''];
  if (!brain.topics.length) { L.push('_No topics extracted._'); return L.join('\n'); }
  L.push('| Term | Videos | Mentions |');
  L.push('|---|---|---|');
  for (const t of brain.topics) L.push(`| \`${t.term}\` | ${t.videos} | ${t.count} |`);
  L.push('');
  L.push('_Ranked by how many of this creator\'s videos a term appears in, then raw frequency._');
  L.push('');
  return L.join('\n');
}

export function renderTimeline(brain) {
  const L = [frontMatter(brain), `# ${safeTitle(brain.title)} — timeline`, ''];
  if (!brain.timeline.length) { L.push('_No videos covered yet._'); return L.join('\n'); }
  for (const v of brain.timeline) {
    L.push(`## ${esc(safeTitle(v.title))}`);
    L.push('');
    L.push(`- video: \`${v.videoId}\``);
    L.push(`- published: ${fmtDate(v.publishedAt)}`);
    L.push(`- language: ${v.language || '—'} · cues: ${v.cueCount} · segments: ${v.windowCount}`);
    L.push(`- open: ${v.url}`);
    if (v.moments.length) {
      L.push('');
      for (const m of v.moments.slice(0, 12)) {
        L.push(`  - \`${m.timestamp}\` **${m.modality}**${m.polarity === 'negative' ? ' (negative)' : ''} — ${esc(m.phrase)} — ${m.url}`);
      }
    }
    L.push('');
  }
  return L.join('\n');
}

/**
 * The machine contract (review HR24). Every row carries what a consumer needs to
 * decide whether to trust it: schema version, the exact document generation it
 * was extracted from, the support window, provenance, validation state and
 * citation liveness.
 */
export function renderRules(brain) {
  const rows = brain.claims.map((c) => JSON.stringify({
    schema_version: BRAIN_SCHEMA_VERSION,
    claim_id: c.claimId,
    creator_id: c.creatorId,
    video_id: c.videoId,
    doc_revision: c.docRevision ?? null,
    t_start_ms: c.tStartMs,
    t_end_ms: c.tEndMs ?? null,
    polarity: c.polarity,
    modality: c.modality,
    condition: c.condition ?? null,
    topic: c.topic,
    key_phrase: c.keyPhrase,
    statement: c.statement,
    support: c.support ?? null,
    cites: c.cites,
    extractor: c.extractor || 'deterministic-v2',
    validation: 'candidate',
    citation_status: c.citationStatus || 'live',
    tier: 'derived',
  }));
  return `${rows.join('\n')}\n`;
}

/** Escape creator-influenced text for a Markdown table or heading. */
export function esc(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/[\r\n]+/g, ' ')
    .replace(/([|*_`[\]])/g, '\\$1');
}

function fmtMs(ms) {
  const t = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(t / 3600); const m = Math.floor((t % 3600) / 60); const s = t % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export const RENDERERS = {
  'index.md': renderIndex,
  'topics.md': renderTopics,
  'timeline.md': renderTimeline,
  'rules.jsonl': renderRules,
};
