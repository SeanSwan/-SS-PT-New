#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/render.mjs
 * PURPOSE: A built brain → four files on disk: index.md, topics.md,
 *          timeline.md, rules.jsonl.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S6)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHY MARKDOWN AND JSONL AND NOT A DATABASE ROW:
 *   The destination is a Karpathy-style wiki vault — a directory of linked
 *   Markdown that Obsidian and Hermes can both read. Emitting anything else
 *   means a translation step somebody has to maintain. `rules.jsonl` exists
 *   alongside because machines (SwanGuard CB4b, the future query surface) want
 *   a shape they can parse without a Markdown parser.
 *
 * EVERY LINK IS A DEEP LINK:
 *   `watch?v=<id>&t=<seconds>s` is the whole point of the citation — it opens
 *   the creator's own video at the second the claim was made. A citation the
 *   reader cannot click is a citation they will not check.
 *
 * THIS MODULE RECEIVES A BUILT BRAIN. IT DOES NOT READ TRANSCRIPTS.
 *   `renderBrain` takes the object `buildBrain` produced. It has no access to
 *   Lane B, which is what makes the tier boundary hold even if a future edit
 *   here is careless — there is nothing to leak.
 *
 * @module creator-brains/render
 */

import { join } from 'node:path';
import { paths, writeTextAtomic, ensureDir } from './paths.mjs';

/** Lane C title budget. Same reasoning as the claim-phrase cap; see safeTitle. */
export const MAX_TITLE_WORDS = 7;

/**
 * A Lane C title, capped to the same word budget as a claim phrase.
 *
 * WHY THIS IS NOT PARANOIA — it is a reproduced leak. Creators read their own
 * video titles aloud, so a long title appears VERBATIM in the transcript. A
 * hostile review built one — "how to blur the tear trough crease on a mature
 * face without filler" — and the rendered timeline carried a 13-word verbatim
 * run of the transcript, both in `brains/` and in the staged vault copy. The
 * phrase cap does not cover titles because titles never pass through
 * `keyPhraseFrom`, and `esc()` escapes Markdown metacharacters rather than
 * shortening anything.
 *
 * Titles are public Lane-A metadata, so this is not a confidentiality problem —
 * it is the tier invariant ("no derived surface carries an 8+ word verbatim run
 * of the transcript") being enforced uniformly instead of per-field. A reader
 * who wants the full title clicks the link, which is the same answer this
 * engine gives everywhere else.
 */
export function safeTitle(title, maxWords = MAX_TITLE_WORDS) {
  const raw = String(title ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return '—';
  const w = raw.split(' ');
  return w.length <= maxWords ? raw : `${w.slice(0, maxWords).join(' ')}…`;
}

/** Markdown link to a video at a second. */
export const deepLink = (videoId, ms) => `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor((ms || 0) / 1000)}s`;

const fmtDate = (s) => (s && /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : (s || '—'));

/**
 * Render every artifact for one brain. Returns `{dir, files, counts}`.
 * Deterministic output: two renders of the same brain produce identical bytes,
 * which is what makes "did this change?" answerable by a hash.
 */
export function renderBrain(brain, { r, now = null } = {}) {
  const dir = join(paths(r).brainsDir, brain.slug);
  ensureDir(dir);

  // `now` may arrive as a clock FUNCTION (tests) or a timestamp (the runner).
  // Normalising here rather than at each call site is what keeps the two
  // callers from disagreeing about what the parameter is.
  const at = typeof now === 'function' ? now() : (now || Date.now());

  const files = [];
  const write = (name, text) => { writeTextAtomic(join(dir, name), text); files.push(join(dir, name)); };

  write('index.md', renderIndex(brain, at));
  write('topics.md', renderTopics(brain));
  write('timeline.md', renderTimeline(brain));
  write('rules.jsonl', renderRules(brain));

  return { dir, files, counts: { claims: brain.claims.length, topics: brain.topics.length, doctrine: brain.doctrine.length, videos: brain.timeline.length, gaps: (brain.gaps || []).length } };
}

function header(brain) {
  return [
    '---',
    `creator_id: ${brain.creatorId}`,
    `title: ${JSON.stringify(safeTitle(brain.title, 12))}`,
    brain.handle ? `handle: ${brain.handle}` : null,
    `generated_at: ${brain.generatedAt}`,
    `videos_covered: ${brain.timeline.length}`,
    `claims: ${brain.claims.length}`,
    'tier: derived (Lane C)',
    '---',
    '',
  ].filter(Boolean).join('\n');
}

export function renderIndex(brain, now = null) {
  const L = [];
  L.push(header(brain));
  L.push(`# ${safeTitle(brain.title, 12)} — creator brain`);
  L.push('');
  L.push(`> Derived from **${brain.docCount}** transcripts · **${brain.claims.length}** cited claims · **${brain.doctrine.length}** recurring doctrines.`);
  L.push('> Generated by the SS-PT Creator Brains engine. Every line links back to the creator\'s own video at the second it was said.');
  L.push(`> Regenerated ${now ? new Date(now).toISOString() : brain.generatedAt}.`);
  L.push('');

  if (brain.doctorate && brain.doctorate.length) { /* unreachable guard */ }

  L.push('## What this creator keeps saying');
  L.push('');
  if (!brain.doctrine.length) {
    L.push('_No phrase has recurred across more than one video yet — this brain is still thin._');
  } else {
    L.push('| Recurring | Said in | Modality | First citation |');
    L.push('|---|---|---|---|');
    for (const d of brain.doctrine.slice(0, 20)) {
      L.push(`| ${esc(d.phrase)} | ${d.videos} videos | ${d.modality} | [${fmtMs(d.tStartMs)}](${deepLink(d.videoId, d.tStartMs)}) |`);
    }
  }
  L.push('');

  L.push('## Topics');
  L.push('');
  if (!brain.topics.length) L.push('_No topics extracted yet._');
  else L.push(brain.topics.slice(0, 25).map((t) => `\`${t.term}\` (${t.videos}v/${t.count}x)`).join(' · '));
  L.push('');

  L.push('## Strongest claims');
  L.push('');
  L.push('_Ranked by how much of this creator\'s own recurring vocabulary each claim uses._');
  L.push('');
  const strongest = brain.claims.slice(0, 30);
  if (!strongest.length) L.push('_No claims extracted yet._');
  else {
    for (const c of strongest) {
      const stamp = c.onTopic ? ` \`+${c.onTopic}\`` : '';
      L.push(`- **${c.modality}** — ${esc(c.keyPhrase)}${stamp} — [${c.timestamp}](${c.cites[0]}) · \`${c.videoId}\``);
    }
  }
  L.push('');

  L.push('## Coverage');
  L.push('');
  L.push(`- videos with transcripts: **${brain.timeline.length}**`);
  L.push(`- of documents read: **${brain.docCount}**`);
  if (brain.dropped) L.push(`- cues skipped for having no citable phrase: **${brain.dropped}**`);
  L.push('');

  // COVERAGE GAPS ARE PART OF THE BRAIN, NOT AN OMISSION FROM IT.
  //   A creator's brain that silently omits the videos we could not read reads
  //   as "they never talked about that". Naming the gaps is the difference
  //   between a brain with holes and a brain that lies about its own edges.
  L.push('## Coverage gaps');
  L.push('');
  if (!brain.gaps || !brain.gaps.length) {
    L.push('_None — every discovered video has a transcript._');
  } else {
    L.push(`**${brain.gaps.length}** video(s) are discovered but contribute nothing yet:`);
    L.push('');
    L.push('| Video | State | Why |');
    L.push('|---|---|---|');
    for (const g of brain.gaps.slice(0, 50)) {
      L.push(`| \`${g.videoId}\` | ${g.state} | ${esc(g.reason)} |`);
    }
    if (brain.gaps.length > 50) L.push(`| … | | ${brain.gaps.length - 50} more |`);
  }
  L.push('');
  L.push('## Files');
  L.push('');
  L.push('- `topics.md` — the recurring vocabulary, ranked');
  L.push('- `timeline.md` — every covered video with its cited moments');
  L.push('- `rules.jsonl` — machine-readable claims (the downstream contract)');
  L.push('');
  return L.join('\n');
}

export function renderTopics(brain) {
  const L = [header(brain), `# ${safeTitle(brain.title, 12)} — topics`, ''];
  if (!brain.topics.length) { L.push('_No topics extracted._'); return L.join('\n'); }
  L.push('| Term | Videos | Mentions |');
  L.push('|---|---|---|');
  for (const t of brain.topics) L.push(`| \`${t.term}\` | ${t.videos} | ${t.count} |`);
  L.push('');
  L.push('_Terms are ranked by how many of this creator\'s videos they appear in, then by raw frequency._');
  L.push('');
  return L.join('\n');
}

export function renderTimeline(brain) {
  const L = [header(brain), `# ${safeTitle(brain.title, 12)} — timeline`, ''];
  if (!brain.timeline.length) { L.push('_No videos covered yet._'); return L.join('\n'); }
  for (const v of brain.timeline) {
    L.push(`## ${esc(safeTitle(v.title))}`);
    L.push('');
    L.push(`- published: ${fmtDate(v.publishedAt)}`);
    L.push(`- language: ${v.language || '—'} · cues: ${v.cueCount} · segments: ${v.windowCount}`);
    L.push(`- open: ${v.url}`);
    if (v.moments.length) {
      L.push('');
      for (const m of v.moments.slice(0, 12)) {
        L.push(`  - \`${m.timestamp}\` **${m.modality}** — ${esc(m.phrase)} — ${m.url}`);
      }
    }
    L.push('');
  }
  return L.join('\n');
}

export function renderRules(brain) {
  const rows = brain.claims.map((c) => JSON.stringify({
    claim_id: c.claimId,
    creator_id: c.creatorId,
    video_id: c.videoId,
    t_start_ms: c.tStartMs,
    modality: c.modality,
    topic: c.topic,
    key_phrase: c.keyPhrase,
    statement: c.statement,
    cites: c.cites,
    extractor: 'deterministic-v1',
    tier: 'derived',
  }));
  return `${rows.join('\n')}\n`;
}

/**
 * Escape creator-influenced text for a Markdown table or heading.
 *
 * BACKSLASH FIRST, then newline, then metacharacters. Escaping in the other
 * order would double-escape the backslash it just inserted. A raw newline in a
 * table cell silently breaks the table — every later row shifts a column — so
 * newlines collapse to spaces rather than being escaped.
 */
function esc(s) {
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
