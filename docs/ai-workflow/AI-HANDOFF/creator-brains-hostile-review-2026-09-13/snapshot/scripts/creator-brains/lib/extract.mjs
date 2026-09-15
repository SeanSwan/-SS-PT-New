#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/extract.mjs
 * PURPOSE: Stored transcripts → a per-creator mini-brain: cited claims, a
 *          recurring-topic map, doctrine, and a timeline.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S6)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHY THIS IS DETERMINISTIC AND NOT AN LLM CALL:
 *   Two reasons, both load-bearing.
 *   1. COST AND GATE. Extracting rules with a model over a back catalogue is
 *      the ~$140–$575 line item the upstream review computed, and spending it
 *      needs Sean's explicit authorization (CLAUDE.md rule 16). A v1 that
 *      silently depends on it is a v1 that cannot run.
 *   2. HONESTY. A deterministic extractor cannot hallucinate a rule that is not
 *      in the transcript. It is weaker product and stronger evidence, which is
 *      the right trade for the layer everything else will be built on.
 *   The LLM lane is a SEAM, not a rewrite: `rules.jsonl` is the contract, and a
 *   model-backed extractor writes the same shape.
 *
 * THE 7-WORD CAP IS A LEGAL CONTROL, NOT A STYLE CHOICE:
 *   Lane C (this module's output) is the only thing that may leave the machine.
 *   Every phrase it carries is capped at 7 words so no derived surface can
 *   contain a long verbatim run of the creator's spoken work — the same
 *   boundary the upstream plan calls the restatement band, made mechanical.
 *   The reader who wants more context gets a deep link to the creator's own
 *   video at the exact second. That is the product, not a limitation.
 *
 * TOPICS AND DOCTRINE:
 *   A term recurring across many of a creator's videos IS what that creator
 *   talks about; a phrase asserted in several videos is closer to doctrine than
 *   a one-off. Both are pure counting, which is why they are trustworthy.
 *
 * @module creator-brains/extract
 */

import { listDocs, loadState } from './store.mjs';
import { slugify } from './paths.mjs';
import { claimFromCue, segmentCues, termCounts } from './lexicon.mjs';
import { redact } from './digest.mjs';
import { fmtTimestamp } from '../../swan-scout/yt-scout-transcript.mjs';



/**
 * Build a creator's mini-brain from stored documents.
 * Reads Lane B; returns ONLY Lane C shape.
 */
export function buildBrain(r, creator, { topTopics = 40, doctrineMinVideos = 2, generatedAt = null } = {}) {
  const docs = listDocs(r, { channelId: creator.channelId });
  // A SLUG MUST BE UNIQUE PER CREATOR. slugify falls back to the literal
  // string creator for any title it cannot transliterate, so every
  // non-Latin-titled channel would write into the SAME rains/creator/
  // directory and the same vault filename -- overwriting each other while
  // query still attributed the surviving rows by creator_id. A channel-id
  // fragment keeps the directory stable and distinct without inventing a name.
  const baseSlug = slugify(creator.title || creator.channelId);
  const slug = creator.slug
    || (baseSlug === 'creator' ? `creator-${creator.channelId.slice(2, 10).toLowerCase()}` : baseSlug);

  // COVERAGE GAPS — computed from STATE, not from what happened to be readable.
  //   If this were derived from the documents we found, a video whose document
  //   was deleted would simply not appear — and a brain that omits what it
  //   cannot see is a brain that reports silence as agreement. Reading the
  //   state map means every discovered video is accounted for explicitly.
  const docIds = new Set(docs.map((d) => d && d.videoId));
  const stateMap = loadState(r);
  const gaps = [];
  for (const v of Object.values(stateMap.videos || {})) {
    if (v.channelId !== creator.channelId) continue;
    if (docIds.has(v.videoId)) continue;
    gaps.push({
      videoId: v.videoId,
      state: v.state,
      // Redacted on the way OUT, because this string is rendered into a Lane C
      // page and Lane C is the tier that gets exported. `lastError` originates
      // in a yt-dlp stderr tail, so it is the one creator-of-the-string we do
      // not control.
      reason: redact(
        v.lastError || (v.state === 'fetched' ? 'marked fetched but its document is missing' : 'no transcript'),
      ),
    });
  }

  const claims = [];
  const timeline = [];
  const dropped = [];
  const docTerms = [];

  for (const doc of docs) {
    if (!doc || !Array.isArray(doc.cues) || !doc.cues.length) { dropped.push({ videoId: doc && doc.videoId, reason: 'no_cues' }); continue; }
    docTerms.push(doc.text || '');
    const windows = segmentCues(doc.cues);
    const moments = [];

    doc.cues.forEach((cue, i) => {
      // ONE CALL DECIDES EVERYTHING. Boilerplate, length, modality and phrase
      // anchoring all live behind `claimFromCue`, so the vocabulary stays
      // private to lexicon.mjs and there is no second route to Lane C text.
      const extracted = claimFromCue(cue.text);
      if (!extracted) { dropped.push({ videoId: doc.videoId, cueIndex: i, reason: 'not_a_claim' }); return; }
      const { modality: mod, phrase } = extracted;
      const citeUrl = `https://www.youtube.com/watch?v=${doc.videoId}&t=${Math.floor(cue.ms / 1000)}s`;
      claims.push({
        claimId: `${doc.videoId}:${cue.ms}:${mod}`,
        creatorId: creator.channelId,
        videoId: doc.videoId,
        tStartMs: cue.ms,
        timestamp: fmtTimestamp(cue.ms),
        modality: mod,
        keyPhrase: phrase,
        topic: phrase.split(' ')[0].toLowerCase(),
        // A template, NOT the cue. The creator's sentence never crosses tiers.
        statement: `${mod} — ${phrase}`,
        cites: [citeUrl],
        support: { cueIndex: i, cueCount: doc.cues.length },
      });
      moments.push({ ms: cue.ms, timestamp: fmtTimestamp(cue.ms), modality: mod, phrase, url: citeUrl });
    });

    timeline.push({
      videoId: doc.videoId,
      title: doc.title || doc.videoId,
      publishedAt: doc.publishedAt || null,
      language: doc.language || null,
      cueCount: doc.cueCount || doc.cues.length,
      windowCount: windows.length,
      moments,
      url: `https://www.youtube.com/watch?v=${doc.videoId}`,
    });
  }

  // ── Topics: what this creator actually talks about ────────────────────────
  const { counts, spread } = termCounts(docTerms);
  const topics = [...counts.entries()]
    .map(([term, n]) => ({ term, count: n, videos: spread.get(term) || 0 }))
    .filter((t) => t.videos >= 1)
    .sort((a, b) => (b.videos - a.videos) || (b.count - a.count) || a.term.localeCompare(b.term))
    .slice(0, topTopics);

  // ── Relevance: rank claims by whether they are ABOUT something this creator
  //    actually discusses.
  //
  //    Without this, a live run ranked "master concepts never" alongside "click
  //    skin tone" — the first is a sentence fragment that happened to contain a
  //    marker word, the second is the creator's technique. The vocabulary that
  //    separates them is the creator's OWN, computed from the same corpus, so
  //    this is a ranking signal rather than another hand-written word list that
  //    would silently encode one creator's domain.
  //
  //    Ranking, NOT filtering: a low-relevance claim is still stored and still
  //    cited, because "this phrase recurs and I cannot explain why" is a fact
  //    worth keeping. It just does not get to lead the page.
  const vocab = new Set(
    [...counts.entries()]
      .filter(([term, n]) => (spread.get(term) || 0) >= 2 || n >= 5)
      .sort((a, b) => (spread.get(b[0]) || 0) - (spread.get(a[0]) || 0))
      .slice(0, 200)
      .map(([term]) => term),
  );
  for (const c of claims) {
    c.onTopic = c.keyPhrase.split(' ').filter((w) => vocab.has(w)).length;
  }
  claims.sort((a, b) => (b.onTopic - a.onTopic) || a.videoId.localeCompare(b.videoId) || a.tStartMs - b.tStartMs);

  // ── Doctrine: a phrase asserted across several videos is what they believe ─
  const byPhrase = new Map();
  for (const c of claims) {
    const k = c.keyPhrase.toLowerCase();
    if (!byPhrase.has(k)) byPhrase.set(k, { phrase: c.keyPhrase, modality: c.modality, videos: new Set(), cites: [], tStartMs: c.tStartMs, videoId: c.videoId });
    const e = byPhrase.get(k);
    e.videos.add(c.videoId);
    if (e.cites.length < 5) e.cites.push(c.cites[0]);
  }
  const doctrine = [...byPhrase.values()]
    .filter((e) => e.videos.size >= doctrineMinVideos)
    .map((e) => ({ phrase: e.phrase, modality: e.modality, videos: e.videos.size, cites: e.cites, tStartMs: e.tStartMs, videoId: e.videoId }))
    .sort((a, b) => b.videos - a.videos)
    .slice(0, 30);


  return {
    slug,
    creatorId: creator.channelId,
    title: creator.title || creator.channelId,
    handle: creator.handle || null,
    generatedAt: generatedAt || new Date().toISOString(),
    docCount: docs.length,
    gaps,
    dropped: dropped.length,
    droppedDetail: dropped.slice(0, 20),
    claims,
    topics,
    doctrine,
    timeline: timeline.sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || ''))),
  };
}


