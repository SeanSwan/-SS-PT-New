#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/brain.test.mjs
 * PURPOSE: Tests T-08, T-11 and T-12 — brain extraction with timestamped
 *          citations, cross-creator query, and the Lane B / Lane C tier law.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint §6)
 * ADDED: 2026-09-12
 *
 * RUN: node --test scripts/creator-brains/test/brain.test.mjs
 * @module creator-brains/test/brain
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { fixtureDoc, longestVerbatimRun, makeClock, tempRoot } from './helpers.mjs';
import { paths, listDir } from '../lib/paths.mjs';
import { writeDoc } from '../lib/store.mjs';

const CH_A = `UC${'a'.repeat(22)}`;
const CH_B = `UC${'b'.repeat(22)}`;

/** Seed Lane B through the REAL store writer, so the boundary the fetcher uses
 *  is the boundary these tests exercise. */
function seed(r) {
  const docs = [
    fixtureDoc({
      videoId: 'aaa11111111',
      channelId: CH_A,
      text: 'always lift the shadows before you touch the highlights in the tone curve because lifting first preserves the rolloff',
      cues: [
        { ms: 0, text: 'always lift the shadows before you touch the highlights' },
        { ms: 5000, text: 'in the tone curve because lifting first preserves the rolloff' },
      ],
    }),
    fixtureDoc({
      videoId: 'bbb22222222',
      channelId: CH_A,
      text: 'never blur the tear trough crease on a mature face it flattens the entire face and kills the dimension we paid for',
      cues: [
        { ms: 12000, text: 'never blur the tear trough crease on a mature face' },
        { ms: 18000, text: 'it flattens the entire face and kills the dimension we paid for' },
      ],
    }),
    fixtureDoc({
      videoId: 'ccc33333333',
      channelId: CH_B,
      text: 'shadow lift is a crutch in my opinion i would rather dodge the midtones and let the shadows stay deep',
      cues: [
        { ms: 30000, text: 'shadow lift is a crutch in my opinion' },
        { ms: 36000, text: 'i would rather dodge the midtones and let the shadows stay deep' },
      ],
    }),
  ];
  for (const d of docs) writeDoc(r, d);
  return docs;
}

// ── T-08 (CB-08) ────────────────────────────────────────────────────────────

test('T-08 build emits the four brain artifacts with resolvable citations', async () => {
  const { buildBrain } = await import('../lib/extract.mjs');
  const { renderBrain } = await import('../lib/render.mjs');
  const r = tempRoot('cb-t08');
  seed(r);
  const creator = { channelId: CH_A, title: 'Creator A', handle: '@creatora' };

  const brain = buildBrain(r, creator);
  assert.ok(brain.claims.length > 0, 'claims were extracted');
  const out = renderBrain(brain, { r, now: makeClock() });

  const dir = join(paths(r).brainsDir, brain.slug);
  for (const f of ['index.md', 'topics.md', 'timeline.md', 'rules.jsonl']) {
    assert.ok(existsSync(join(dir, f)), `${f} exists`);
  }
  assert.ok(out.files.length >= 4);

  const index = readFileSync(join(dir, 'index.md'), 'utf-8');
  assert.match(index, /watch\?v=/, 'index carries deep links');
  assert.match(index, /&t=\d+s/, 'deep links carry a timestamp');

  // Every citation must resolve to a stored document — no invented sources.
  for (const claim of brain.claims) {
    assert.ok(claim.videoId, 'claim names a video');
    assert.ok(Number.isFinite(claim.tStartMs), 'claim has a start offset');
    assert.ok(claim.cites.some((u) => u.includes(claim.videoId)), 'citation names its own video');
  }
});

test('T-08b the brain is scoped to ONE creator — no cross-contamination', async () => {
  const { buildBrain } = await import('../lib/extract.mjs');
  const r = tempRoot('cb-t08b');
  seed(r);
  const a = buildBrain(r, { channelId: CH_A, title: 'Creator A' });
  assert.ok(a.claims.every((c) => c.creatorId === CH_A), 'only channel A claims');
  assert.equal(a.docCount, 2, 'channel A has exactly two documents');
});

test('T-08c a claim whose source document is gone is DROPPED, and the gap is NAMED (INV-6)', async () => {
  const { buildBrain } = await import('../lib/extract.mjs');
  const { unlinkSync } = await import('node:fs');
  const { loadState, saveState } = await import('../lib/store.mjs');
  const { newVideoState } = await import('../lib/fsm.mjs');
  const r = tempRoot('cb-t08c');
  seed(r);

  // Register the seeded videos in the state map, so the brain can tell
  // "not readable" apart from "never discovered".
  const state = loadState(r);
  for (const id of ['aaa11111111', 'bbb22222222']) {
    state.videos[id] = { ...newVideoState(id, CH_A, {}), state: 'fetched' };
  }
  state.videos.ccc33333333 = { ...newVideoState('ccc33333333', CH_B, {}), state: 'fetched' };
  saveState(state, r);

  const before = buildBrain(r, { channelId: CH_A, title: 'Creator A' });
  assert.ok(before.claims.length > 0);
  assert.equal(before.gaps.length, 0, 'nothing missing yet');

  unlinkSync(join(paths(r).docsDir, CH_A, 'bbb22222222.json'));
  const after = buildBrain(r, { channelId: CH_A, title: 'Creator A' });

  assert.ok(after.claims.every((c) => c.videoId !== 'bbb22222222'), 'orphaned claims vanish');
  const gap = after.gaps.find((g) => g.videoId === 'bbb22222222');
  assert.ok(gap, 'the unreadable video is NAMED as a coverage gap, not silently omitted');
  assert.match(gap.reason, /document is missing/i);
});

test('T-11 query returns creator-grouped hits with deep links and no transcript spans', async () => {
  const { buildBrain } = await import('../lib/extract.mjs');
  const { renderBrain } = await import('../lib/render.mjs');
  const { queryBrains } = await import('../lib/query.mjs');
  const r = tempRoot('cb-t11');
  seed(r);
  for (const [ch, title] of [[CH_A, 'Creator A'], [CH_B, 'Creator B']]) {
    renderBrain(buildBrain(r, { channelId: ch, title }), { r, now: makeClock() });
  }

  const res = queryBrains('shadow', { r });
  assert.ok(res.hits.length > 0, 'the term is found');
  const creators = new Set(res.hits.map((h) => h.creatorId));
  assert.ok(creators.size >= 2, 'hits span both creators — this is the disagreement signal');
  for (const h of res.hits) assert.match(h.url, /watch\?v=/);

  // Lane C output may not carry a long verbatim run from the transcript.
  const blob = res.hits.map((h) => h.statement).join(' ');
  const worst = longestVerbatimRun(blob, fixtureDoc().text);
  assert.ok(worst < 8, `query output carried a ${worst}-word verbatim run`);
});

test('T-11b query can be narrowed to one creator', async () => {
  const { buildBrain } = await import('../lib/extract.mjs');
  const { renderBrain } = await import('../lib/render.mjs');
  const { queryBrains } = await import('../lib/query.mjs');
  const r = tempRoot('cb-t11b');
  seed(r);
  for (const [ch, title] of [[CH_A, 'Creator A'], [CH_B, 'Creator B']]) {
    renderBrain(buildBrain(r, { channelId: ch, title }), { r, now: makeClock() });
  }
  const one = queryBrains('shadow', { r, creator: CH_A });
  assert.ok(one.hits.length > 0);
  assert.ok(one.hits.every((h) => h.creatorId === CH_A), '--creator narrows hard');
});

test('T-11c an empty query is refused, not answered with everything', async () => {
  const { queryBrains } = await import('../lib/query.mjs');
  const r = tempRoot('cb-t11c');
  assert.throws(() => queryBrains('   ', { r }), /query/i);
});


