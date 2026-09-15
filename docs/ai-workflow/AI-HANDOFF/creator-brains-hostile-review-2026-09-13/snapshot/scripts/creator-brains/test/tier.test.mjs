#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/tier.test.mjs
 * PURPOSE: The Lane B / Lane C tier boundary — T-12d…T-12g plus the export
 *          contract tests.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint §6)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHY THIS IS ITS OWN FILE: the tier boundary is the safety model, and it has
 * TWO enforcement surfaces with different failure modes — the import graph
 * (export.mjs must not be able to reach Lane B) and the content check (no
 * derived surface carries an 8+ word verbatim run of a transcript). Keeping
 * them together makes it possible to read the whole boundary in one place.
 *
 * T-12d EXISTS BECAUSE A HOSTILE REVIEW BROKE THE OLD TEST. Creators read their
 * own video titles aloud, so a long title is verbatim transcript text; one
 * carried a 13-word run into timeline.md AND its vault copy while every test in
 * this suite was green, because the fixture set no title.
 *
 * RUN: node --test scripts/creator-brains/test/tier.test.mjs
 * @module creator-brains/test/tier
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fixtureDoc, longestVerbatimRun, makeClock, tempRoot } from './helpers.mjs';
import { paths, listDir } from '../lib/paths.mjs';
import { writeDoc } from '../lib/store.mjs';

const CH_A = 'UC' + 'a'.repeat(22);
const CH_B = 'UC' + 'b'.repeat(22);

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
test('T-12d a LONG VIDEO TITLE cannot leak transcript text into Lane C (review F1)', async () => {
  const { buildBrain } = await import('../lib/extract.mjs');
  const { renderBrain, safeTitle, MAX_TITLE_WORDS } = await import('../lib/render.mjs');
  const { exportBrains } = await import('../lib/export.mjs');
  const r = tempRoot('cb-t12d');

  // DIRECTLY REPRODUCED FROM A HOSTILE REVIEW. Creators read their own titles
  // aloud, so a long title appears verbatim in the transcript. This one carried
  // a 13-word run into timeline.md AND its vault copy while every other test
  // was green — `fixtureDoc` set no title, so nothing exercised the path.
  const TITLE = 'how to blur the tear trough crease on a mature face without filler';
  const TEXT = `${TITLE} and thats the whole technique`;
  writeDoc(r, fixtureDoc({
    videoId: 'ttl00000001',
    channelId: CH_A,
    title: TITLE,
    text: TEXT,
    cues: [{ ms: 0, text: TEXT }],
  }));

  const brain = buildBrain(r, { channelId: CH_A, title: 'Creator A' });
  renderBrain(brain, { r, now: makeClock() });
  exportBrains({ r, now: makeClock() });

  const surfaces = [];
  for (const f of listDir(paths(r).brainsDir)) {
    const dir = join(paths(r).brainsDir, f);
    for (const name of listDir(dir)) surfaces.push([name, readFileSync(join(dir, name), 'utf-8')]);
  }
  for (const name of listDir(paths(r).vaultDir)) {
    surfaces.push([name, readFileSync(join(paths(r).vaultDir, name), 'utf-8')]);
  }

  let worst = 0; let where = '';
  for (const [name, surface] of surfaces) {
    const run = longestVerbatimRun(surface, TEXT);
    if (run > worst) { worst = run; where = name; }
  }
  assert.ok(worst < 8, `title leaked a ${worst}-word verbatim run into ${where}`);
  assert.ok(safeTitle(TITLE).split(' ').length <= MAX_TITLE_WORDS + 1, 'titles are capped');
  assert.match(readFileSync(join(paths(r).vaultDir, `${brain.slug}.timeline.md`), 'utf-8'), /…/, 'the title is visibly truncated');
});

test('T-12e rules.jsonl keeps its extension when staged (review F5)', async () => {
  const { buildBrain } = await import('../lib/extract.mjs');
  const { renderBrain } = await import('../lib/render.mjs');
  const { exportBrains } = await import('../lib/export.mjs');
  const r = tempRoot('cb-t12e');
  seed(r);
  const brain = buildBrain(r, { channelId: CH_A, title: 'Creator A' });
  renderBrain(brain, { r, now: makeClock() });
  const res = exportBrains({ r, now: makeClock() });

  // The declared downstream contract is `rules.jsonl` — a consumer globs
  // `*.jsonl`. Staging it as `slug.rules.md` meant that glob found nothing.
  const jsonl = res.written.filter((p) => p.endsWith('.jsonl'));
  assert.equal(jsonl.length, 1, `expected one .jsonl in the vault, got: ${res.written.join(', ')}`);
  assert.match(jsonl[0], /\.rules\.jsonl$/);
  const rows = readFileSync(jsonl[0], 'utf-8').trim().split('\n').map((l) => JSON.parse(l));
  assert.ok(rows.length > 0);
  assert.ok(rows[0].claim_id && rows[0].creator_id && rows[0].video_id, 'still the documented shape');
});

test('T-12f two non-Latin-titled creators do not share one brain directory (review F12)', async () => {
  const { buildBrain } = await import('../lib/extract.mjs');
  const r = tempRoot('cb-t12f');
  const chA = `UC${'p'.repeat(22)}`;
  const chB = `UC${'q'.repeat(22)}`;
  writeDoc(r, fixtureDoc({ channelId: chA, videoId: 'nnn00000001' }));
  writeDoc(r, fixtureDoc({ channelId: chB, videoId: 'nnn00000002' }));

  const a = buildBrain(r, { channelId: chA, title: '【公式】' });
  const b = buildBrain(r, { channelId: chB, title: 'Киноканал' });
  assert.notEqual(a.slug, b.slug, 'untransliterable titles must still produce distinct slugs');
  assert.match(a.slug, new RegExp(chA.slice(2, 10).toLowerCase()), 'the slug carries a channel-id fragment');
});

test('T-12g a stale vault artifact is reaped, but a foreign file is left alone', async () => {
  const { buildBrain } = await import('../lib/extract.mjs');
  const { renderBrain } = await import('../lib/render.mjs');
  const { exportBrains } = await import('../lib/export.mjs');
  const { writeFileSync, existsSync } = await import('node:fs');
  const r = tempRoot('cb-t12g');
  seed(r);
  const brain = buildBrain(r, { channelId: CH_A, title: 'Creator A' });
  renderBrain(brain, { r, now: makeClock() });
  exportBrains({ r, now: makeClock() });

  // A file we previously staged under an older naming scheme, and a file that
  // belongs to somebody else. The README tells the owner to copy the whole
  // staging directory into the wiki vault, so an orphan becomes permanent vault
  // content that nothing ever regenerates.
  const stale = join(paths(r).vaultDir, `${brain.slug}.rules.md`);
  const foreign = join(paths(r).vaultDir, 'someone-elses-notes.md');
  writeFileSync(stale, 'stale artifact from the previous naming scheme', 'utf-8');
  writeFileSync(foreign, 'not ours', 'utf-8');

  const res = exportBrains({ r, now: makeClock() });
  assert.ok(!existsSync(stale), 'an artifact we no longer produce is reaped');
  assert.ok(res.reaped.some((p) => p.endsWith(`${brain.slug}.rules.md`)), 'and the reap is reported');
  // A delete primitive pointed at a shared directory must be AIMED, not swept.
  assert.ok(existsSync(foreign), 'a file matching no known slug is left alone');
});

// ── T-12 (CB-12) — the tier law ─────────────────────────────────────────────

test('T-12 the phrase cap is enforced directly, not just hoped for', async () => {
  const { keyPhraseFrom, MAX_PHRASE_WORDS } = await import('../lib/lexicon.mjs');
  assert.equal(MAX_PHRASE_WORDS, 7, 'the Lane C cap is 7 words');

  // A cue with NO stopwords is the case that actually exercises the cap: the
  // surviving content words are CONTIGUOUS in the source, so nothing but the
  // cap stops them forming a long verbatim run. This fixture exists because a
  // mutation check raised the cap to 12 and every test still passed — the old
  // test only used prose full of stopwords, which the tokenizer breaks up
  // anyway, so it could never have caught the change.
  const stopwordFree = 'frequency separation layers masks brushes dodging burning contrast clarity texture detail sharpening noise reduction';
  const phrase = keyPhraseFrom(stopwordFree);
  assert.ok(phrase, 'a phrase is produced');
  assert.ok(phrase.split(' ').length <= MAX_PHRASE_WORDS, `phrase was ${phrase.split(' ').length} words: ${phrase}`);
});

test('T-12 no Lane C artifact contains an 8+ word verbatim transcript run', async () => {
  const { buildBrain } = await import('../lib/extract.mjs');
  const { renderBrain } = await import('../lib/render.mjs');
  const { exportBrains } = await import('../lib/export.mjs');
  const r = tempRoot('cb-t12');
  const docs = seed(r);

  // The adversarial document: a stopword-free directive cue. Without a working
  // cap this produces a >7-word contiguous verbatim run on every derived
  // surface. See the note above.
  writeDoc(r, fixtureDoc({
    videoId: 'ddd44444444',
    channelId: CH_A,
    text: 'always frequency separation layers masks brushes dodging burning contrast clarity texture detail sharpening noise reduction',
    cues: [{
      ms: 0,
      text: 'always frequency separation layers masks brushes dodging burning contrast clarity texture detail sharpening noise reduction',
    }],
  }));
  docs.push({ videoId: 'ddd44444444', text: 'always frequency separation layers masks brushes dodging burning contrast clarity texture detail sharpening noise reduction' });

  const creator = { channelId: CH_A, title: 'Creator A' };
  renderBrain(buildBrain(r, creator), { r, now: makeClock() });
  exportBrains({ r, now: makeClock() });

  const surfaces = [];
  for (const f of listDir(join(paths(r).brainsDir))) {
    const dir = join(paths(r).brainsDir, f);
    for (const name of listDir(dir)) surfaces.push([name, readFileSync(join(dir, name), 'utf-8')]);
  }
  for (const name of listDir(paths(r).vaultDir)) {
    surfaces.push([name, readFileSync(join(paths(r).vaultDir, name), 'utf-8')]);
  }
  assert.ok(surfaces.length > 0, 'there are derived surfaces to check');

  let worst = 0; let worstWhere = '';
  for (const [name, surface] of surfaces) {
    for (const doc of docs) {
      const run = longestVerbatimRun(surface, doc.text);
      if (run > worst) { worst = run; worstWhere = `${name} vs ${doc.videoId}`; }
    }
  }
  assert.ok(worst < 8, `derived surface carried a ${worst}-word verbatim run (${worstWhere})`);
});

test('T-12b the export path cannot read Lane B (import-graph fact, not a promise)', async () => {
  const src = readFileSync(new URL('../lib/export.mjs', import.meta.url), 'utf-8');
  assert.ok(!/from '\.\/store\.mjs'/.test(src), 'export.mjs must not import the Lane B reader');
  assert.ok(!/listDocs|readDoc/.test(src), 'export.mjs must not call a doc reader');
});

test('T-12c export stages only DERIVED files', async () => {
  const { buildBrain } = await import('../lib/extract.mjs');
  const { renderBrain } = await import('../lib/render.mjs');
  const { exportBrains } = await import('../lib/export.mjs');
  const r = tempRoot('cb-t12c');
  seed(r);
  renderBrain(buildBrain(r, { channelId: CH_A, title: 'Creator A' }), { r, now: makeClock() });
  const res = exportBrains({ r, now: makeClock() });
  assert.ok(res.written.length > 0, 'something was staged');
  const docsPrefix = `${paths(r).docsDir}`;
  for (const p of res.written) {
    assert.ok(!p.startsWith(docsPrefix), `exported path lives under Lane B: ${p}`);
  }
});

