#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/extract.mjs
 * PURPOSE: Validated transcripts → a creator's candidate claims, topic map,
 *          polarity-aware recurring phrases, and timeline.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR06/07/08/17)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13
 * ============================================================================
 *
 * THIS FUNCTION IS NOW PURE, AND THAT IS THE FIX FOR TWO FINDINGS.
 *
 *   It used to read Lane B itself and accept whatever it found. A document with
 *   `cues: []` was counted in `docCount` BEFORE validation, so the coverage
 *   report read `docCount=1, covered=0, gaps=0` — the video appeared in neither
 *   the covered list nor the gaps, while the page still asserted "every
 *   discovered video has a transcript" (review HR17).
 *
 *   Now the caller supplies documents it has ALREADY validated
 *   (`store.listDocsChecked`), passes the invalid ones in explicitly, and the
 *   gaps come from state. A malformed document cannot reach this function, so it
 *   can be neither silently counted nor silently omitted.
 *
 * POLARITY IS THE OTHER FIX (review HR06).
 *   "always blur the tear trough crease" and "never blur the tear trough crease"
 *   produced an identical phrase and merged into one two-video doctrine — the
 *   brain asserting the opposite of what the creator said, twice. Recurring
 *   phrases are grouped by (phrase, POLARITY), and opposite polarities on the
 *   same phrase are reported as a stance conflict with both citations rather
 *   than averaged into a false consensus.
 *
 * @module creator-brains/extract
 */

import { claimFromCue, segmentCues, termCounts } from './lexicon.mjs';
import { slugify } from './paths.mjs';
import { listDocsChecked, readState, stateOrDefault } from './store.mjs';
import { fmtTimestamp } from '../../swan-scout/yt-scout-transcript.mjs';

/** Claims are CANDIDATES. Nothing here validates that a creator endorses them. */
export const CLAIM_VALIDATION = 'candidate';
export const EXTRACTOR = 'deterministic-v2';

const deepLink = (videoId, ms) => `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor((ms || 0) / 1000)}s`;

/**
 * Build a creator's candidate brain.
 *
 * TWO CALL FORMS, ONE IMPLEMENTATION:
 *   buildBrain(creator, { docs, invalidDocs, gaps })   <- the pure core
 *   buildBrain(storeRoot, creator, { gaps })            <- store-backed
 *
 *   The core stays pure because that is what fixes HR17: the caller supplies
 *   documents it has ALREADY validated, so an unusable document cannot be
 *   silently counted as read. The store-backed form is a convenience that does
 *   the validating read itself — it never falls back to an unvalidated read, so
 *   both forms give the same guarantees and neither can reintroduce the defect.
 */
export function buildBrain(a, b = {}, c = {}) {
  if (typeof a === 'string') {
    // Store-backed: (root, creator, opts)
    const r = a;
    const creator = b || {};
    return buildBrainFromStore(r, creator, c);
  }
  return buildBrainCore(a, b);
}

/** Read the creator's documents through the validating reader, then build. */
export function buildBrainFromStore(r, creator, { gaps = [], ...opts } = {}) {
  const { valid, invalid } = listDocsChecked(r, creator.channelId);
  const rows = Object.values(stateOrDefault(readState(r)).videos || {})
    .filter((v) => v.channelId === creator.channelId);
  const stateGaps = gaps.length
    ? gaps
    : rows
      .filter((v) => !valid.some((d) => d.videoId === v.videoId))
      .map((v) => ({
        videoId: v.videoId,
        state: v.state,
        // Say the useful thing. A `fetched` row with no document is the case a
        // reader most needs named — it is the state map contradicting the disk,
        // which is precisely what went unreported before HR08.
        reason: v.lastError || (v.state === 'fetched'
          ? 'state says fetched but no valid transcript document is present'
          : 'no transcript'),
      }));
  return buildBrainCore(creator, {
    ...opts, docs: valid, invalidDocs: invalid, gaps: stateGaps,
  });
}

function buildBrainCore(creator, {
  docs = [], invalidDocs = [], gaps = [], topTopics = 40, doctrineMinVideos = 2, generatedAt = null,
} = {}) {
  const namespace = creator.channelId;
  const label = slugify(creator.title || namespace) || namespace;

  const claims = [];
  const timeline = [];
  const dropped = [];
  const docTexts = [];

  for (const doc of docs) {
    docTexts.push(doc.text || '');
    const windows = segmentCues(doc.cues);
    const moments = [];

    doc.cues.forEach((cue, i) => {
      const extracted = claimFromCue(cue.text);
      if (!extracted) { dropped.push({ videoId: doc.videoId, cueIndex: i, reason: 'not_a_claim' }); return; }

      // End of the support window: the next cue's start, so a consumer can slice
      // the original span without guessing (review HR24).
      const next = doc.cues[i + 1];
      const tEndMs = next ? next.ms : (cue.ms + 3000);

      claims.push({
        claimId: `${doc.videoId}:${cue.ms}:${extracted.modality}:${extracted.polarity}`,
        creatorId: namespace,
        videoId: doc.videoId,
        docRevision: doc.contentHash ?? null,
        tStartMs: cue.ms,
        tEndMs,
        timestamp: fmtTimestamp(cue.ms),
        modality: extracted.modality,
        polarity: extracted.polarity,
        condition: extracted.condition,
        action: extracted.action,
        object: extracted.object,
        keyPhrase: extracted.keyPhrase,
        statement: extracted.statement,
        cites: [deepLink(doc.videoId, cue.ms)],
        support: { cueIndex: i, cueCount: doc.cues.length, spanMs: [cue.ms, tEndMs] },
        extractor: EXTRACTOR,
        validation: CLAIM_VALIDATION,
      });
      moments.push({
        ms: cue.ms,
        timestamp: fmtTimestamp(cue.ms),
        modality: extracted.modality,
        polarity: extracted.polarity,
        phrase: extracted.keyPhrase,
        url: deepLink(doc.videoId, cue.ms),
      });
    });

    timeline.push({
      videoId: doc.videoId,
      title: doc.title || doc.videoId,
      publishedAt: doc.publishedAt || null,
      language: doc.language || null,
      cueCount: doc.cueCount || doc.cues.length,
      windowCount: windows.length,
      docRevision: doc.contentHash ?? null,
      moments,
      url: `https://www.youtube.com/watch?v=${doc.videoId}`,
    });
  }

  // ── Topics ────────────────────────────────────────────────────────────────
  const { counts, spread } = termCounts(docTexts);
  const topics = [...counts.entries()]
    .map(([term, n]) => ({ term, count: n, videos: spread.get(term) || 0 }))
    .sort((a, b) => (b.videos - a.videos) || (b.count - a.count) || a.term.localeCompare(b.term))
    .slice(0, topTopics);

  // Relevance ranking against the creator's OWN vocabulary.
  const vocab = new Set(
    [...counts.entries()]
      .filter(([term, n]) => (spread.get(term) || 0) >= 2 || n >= 5)
      .sort((a, b) => (spread.get(b[0]) || 0) - (spread.get(a[0]) || 0))
      .slice(0, 200)
      .map(([term]) => term),
  );
  for (const c of claims) c.onTopic = c.keyPhrase.split(' ').filter((w) => vocab.has(w)).length;
  claims.sort((a, b) => (b.onTopic - a.onTopic) || a.videoId.localeCompare(b.videoId) || a.tStartMs - b.tStartMs);

  // ── Recurring phrases, GROUPED BY POLARITY (review HR06) ──────────────────
  const byPhrase = new Map();
  for (const c of claims) {
    const key = `${c.keyPhrase.toLowerCase()}|${c.polarity}`;
    if (!byPhrase.has(key)) {
      byPhrase.set(key, {
        phrase: c.keyPhrase,
        polarity: c.polarity,
        modality: c.modality,
        videos: new Set(),
        cites: [],
        tStartMs: c.tStartMs,
        videoId: c.videoId,
      });
    }
    const e = byPhrase.get(key);
    e.videos.add(c.videoId);
    if (e.cites.length < 5) e.cites.push(c.cites[0]);
  }
  const doctrine = [...byPhrase.values()]
    .filter((e) => e.videos.size >= doctrineMinVideos)
    .map((e) => ({ ...e, videos: e.videos.size }))
    .sort((a, b) => b.videos - a.videos)
    .slice(0, 30);

  // Opposing polarities on the SAME phrase: report the tension, never average it.
  const phrasePolarities = new Map();
  for (const d of doctrine) {
    const k = d.phrase.toLowerCase();
    if (!phrasePolarities.has(k)) phrasePolarities.set(k, []);
    phrasePolarities.get(k).push(d);
  }
  const stanceConflicts = [...phrasePolarities.entries()]
    .filter(([, list]) => new Set(list.map((x) => x.polarity)).size > 1)
    .map(([phrase, list]) => ({
      phrase,
      sides: list.map((x) => ({ polarity: x.polarity, videos: x.videos, cites: x.cites })),
    }));

  // A video is "covered" only when it produced a VALIDATED timeline entry.
  const coveredIds = new Set(timeline.map((t) => t.videoId));
  //
  // Gaps are DEDUPED BY VIDEO ID. Callers legitimately supply a state-derived
  // gap AND an invalid-document gap for the same video, and the first version
  // counted both — the coverage table then reported two rows for one video and
  // the gap total disagreed with the number of videos actually missing.
  const gapByVideo = new Map();
  for (const g of gaps) {
    if (!g || !g.videoId) continue;
    const prior = gapByVideo.get(g.videoId);
    gapByVideo.set(g.videoId, prior
      ? { ...g, reason: `${prior.reason}; ${g.reason}` }
      : g);
  }
  for (const d of invalidDocs) {
    const prior = gapByVideo.get(d.videoId);
    const reason = `document rejected: ${d.problems.join('; ')}`;
    gapByVideo.set(d.videoId, prior
      ? { ...prior, reason: `${prior.reason}; ${reason}` }
      : { videoId: d.videoId, state: 'invalid_document', reason });
  }
  const allGaps = [...gapByVideo.values()];

  return {
    namespace,
    slug: label,
    creatorId: namespace,
    title: creator.title || namespace,
    handle: creator.handle || null,
    generatedAt: generatedAt || new Date().toISOString(),
    docCount: docs.length,
    coveredCount: coveredIds.size,
    invalidDocs,
    claims,
    topics,
    doctrine,
    stanceConflicts,
    timeline: timeline.sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || ''))),
    gaps: allGaps,
    dropped: dropped.length,
    extractor: EXTRACTOR,
  };
}

export { deepLink };
