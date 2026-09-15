#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/probe.test.mjs
 * PURPOSE: The PROBE boundary — T-26 (a probe with no language list has not
 *          answered), T-26b (a machine translation is refused) and T-27 (a
 *          health check that cannot fail is not a health check).
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR19)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * Split out of `unit.test.mjs` for the Rule 4 cap, along a real seam: these are
 * the only tests that exercise the ADAPTER into yt-dlp rather than the engine's
 * own logic, and they exist because a hostile review found the adapter was the
 * weak point. T-26 guarded a MISSING `languages` field while the real adapter
 * always supplied the field — so an exit-0 empty subprocess passed as a healthy
 * "no captions" answer and reached terminal `unavailable`.
 *
 * RUN: node --test scripts/creator-brains/test/probe.test.mjs
 * @module creator-brains/test/probe
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { makeClock, tempRoot, fakeDeps, rollingJson3 } from './helpers.mjs';
import { STATES, newVideoState } from '../lib/fsm.mjs';
test('T-26 a probe returning no languages array is a FAILURE, not "no captions" (review F2)', async () => {
  const { fetchVideo } = await import('../lib/fetch.mjs');
  const r = tempRoot('cb-t26');
  const clock = makeClock();
  const creator = { channelId: `UC${'s'.repeat(22)}`, title: 'C' };

  // A yt-dlp output-shape change, an empty stdout, or a future probe impl all
  // look like this. Treating it as a definitive "no captions" verdict is the
  // fail-open class this engine's own header says it eliminated one layer up.
  for (const bad of [{ ok: true }, { ok: true, languages: null }, { ok: true, languages: 'en' }]) {
    const video = newVideoState('aircAruvnKk', creator.channelId, { now: clock.iso() });
    const out = await fetchVideo(video, { r, creator, deps: fakeDeps({ probeSubs: () => bad }), now: clock });
    assert.equal(out.state, STATES.FAILED_TRANSIENT, `wrong state for ${JSON.stringify(bad)}`);
    assert.match(out.lastError, /no language list|shape/i);
  }
});

test('T-26b a machine-translated track is REFUSED, not passed off as the creator\'s words (review W7)', async () => {
  const { fetchVideo } = await import('../lib/fetch.mjs');
  const { pickLanguage } = await import('../lib/ytdlp.mjs');

  // The words actually spoken are German; `en` is one of YouTube's ~4,890
  // auto-translate targets. Fetching it would put English words in the
  // creator's mouth and attach their name to them.
  const langs = ['de-orig', 'en', 'fr', 'es', 'ja'];
  const picked = pickLanguage(langs, 'en', ['de-orig']);
  assert.equal(picked.lang, null, 'a translation is not an acceptable substitute');
  assert.match(picked.reason, /machine translation/i);
  assert.equal(pickLanguage(langs, 'de', ['de-orig']).lang, 'de-orig', 'the original is chosen when wanted');
  assert.equal(pickLanguage(langs, 'de', ['de-orig']).original, true);

  const r = tempRoot('cb-t26b');
  const clock = makeClock();
  const creator = { channelId: `UC${'t'.repeat(22)}`, title: 'C' };
  const video = newVideoState('aircAruvnKk', creator.channelId, { now: clock.iso() });
  const out = await fetchVideo(video, {
    r, creator, deps: fakeDeps({ probeSubs: () => ({ ok: true, languages: langs, originals: ['de-orig'] }) }), now: clock,
  });
  assert.equal(out.state, STATES.NO_TRACK_RETRY, 'no original English track means no English brain');
  assert.equal(out.lastError, null, 'and that is an ANSWER, not an error');
});

// ── T-27 (review F3) — a health check that cannot fail is not a health check ─

test('T-27 selfCheck reports FAILURE for an explicit yt-dlp path that does not run (review F3)', async () => {
  const { selfCheck } = await import('../lib/ytdlp.mjs');
  const prior = process.env.CREATOR_BRAINS_YTDLP;
  try {
    process.env.CREATOR_BRAINS_YTDLP = 'C:\\definitely\\not\\a\\binary\\yt-dlp.exe';
    const check = selfCheck();
    assert.equal(check.ok, false, 'a typo\'d explicit path is not a healthy install');
    assert.match(check.reason, /does not run|did not run/i);
  } finally {
    if (prior === undefined) delete process.env.CREATOR_BRAINS_YTDLP;
    else process.env.CREATOR_BRAINS_YTDLP = prior;
  }
});

// ── parseJson3 reuse (CB0: "port it, do not rewrite it") ────────────────────

test('T-17 the engine reuses the scout json3 parser rather than a second one', async () => {
  const { parseJson3 } = await import('../../swan-scout/yt-scout-transcript.mjs');
  const { text, cues } = parseJson3(rollingJson3());
  assert.ok(cues.length >= 2, 'rolling duplicates are suppressed');
  assert.match(text, /shadow lift/);
});
