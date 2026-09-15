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
 * TWO ENFORCEMENT SURFACES, both here so the boundary reads in one place: the
 * import graph (export.mjs cannot reach Lane B) and the content check (no
 * derived surface carries an 8+ word verbatim run of a transcript).
 *
 * T-12d EXISTS BECAUSE A REVIEW BROKE THE OLD TEST: creators read their titles
 * aloud, and one carried a 13-word run into timeline.md AND the vault copy while
 * every test was green, because the fixture set no title.
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

/** Every derived surface: each PUBLISHED generation's files plus the vault stage,
 *  resolved through the atomic pointer (HR07/HR25) — what a reader sees. */
function collectSurfaces(r) {
  const surfaces = [];
  for (const ns of listDir(paths(r).brainsDir)) {
    const pointerPath = join(paths(r).brainsDir, ns, 'current.json');
    if (!existsSync(pointerPath)) continue;
    const ptr = JSON.parse(readFileSync(pointerPath, 'utf-8'));
    const genDir = join(paths(r).brainsDir, ns, ptr.generation);
    for (const name of listDir(genDir)) {
      surfaces.push([`${ns}/${ptr.generation}/${name}`, readFileSync(join(genDir, name), 'utf-8')]);
    }
  }
  for (const name of listDir(paths(r).vaultDir)) {
    surfaces.push([`vault/${name}`, readFileSync(join(paths(r).vaultDir, name), 'utf-8')]);
  }
  return surfaces;
}

/** The staged vault path for one published file. Filenames carry the channel id
 *  so two creators sharing a display name cannot collide (HR07). */
function vaultFile(r, brain, fileName) {
  const ext = fileName.endsWith('.jsonl') ? '.jsonl' : '.md';
  const stem = fileName.replace(/\.(md|jsonl)$/, '');
  const suffix = fileName === 'index.md' ? '' : `.${stem}`;
  return join(paths(r).vaultDir, `${brain.slug}-${brain.namespace}${suffix}${ext}`);
}

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

  const surfaces = collectSurfaces(r);

  let worst = 0; let where = '';
  for (const [name, surface] of surfaces) {
    const run = longestVerbatimRun(surface, TEXT);
    if (run > worst) { worst = run; where = name; }
  }
  assert.ok(worst < 8, `title leaked a ${worst}-word verbatim run into ${where}`);
  assert.ok(safeTitle(TITLE).split(' ').length <= MAX_TITLE_WORDS + 1, 'titles are capped');
  assert.match(readFileSync(vaultFile(r, brain, 'timeline.md'), 'utf-8'), /…/, 'the title is visibly truncated');
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

test('T-12f two non-Latin-titled creators never share one brain NAMESPACE (review F12)', async () => {
  const { buildBrain } = await import('../lib/extract.mjs');
  const { publishBrain } = await import('../lib/render.mjs');
  const r = tempRoot('cb-t12f');
  const chA = `UC${'p'.repeat(22)}`;
  const chB = `UC${'q'.repeat(22)}`;
  writeDoc(r, fixtureDoc({ channelId: chA, videoId: 'nnn00000001' }));
  writeDoc(r, fixtureDoc({ channelId: chB, videoId: 'nnn00000002' }));

  const a = buildBrain(r, { channelId: chA, title: '【公式】' });
  const b = buildBrain(r, { channelId: chB, title: 'Киноканал' });
  publishBrain(a, { r, now: makeClock() });
  publishBrain(b, { r, now: makeClock() });

  // IDENTITY IS THE CHANNEL ID, NOT THE DISPLAY NAME. Two channels may share a
  // label — that is what a label is for — so the invariant is that their
  // NAMESPACES and their on-disk directories differ, not that their labels do.
  assert.notEqual(a.namespace, b.namespace, 'namespaces must be distinct');
  assert.equal(a.namespace, chA);
  assert.ok(existsSync(join(paths(r).brainsDir, chA, 'current.json')), 'A published under its channel id');
  assert.ok(existsSync(join(paths(r).brainsDir, chB, 'current.json')), 'B published under its channel id');
  // And no display-name directory was created holding both.
  assert.ok(!existsSync(join(paths(r).brainsDir, a.slug)) || a.slug === a.namespace,
    'no shared display-name directory');
});

test('T-12g a stale vault artifact is reaped, but a foreign file is left alone', async () => {
  const { buildBrain } = await import('../lib/extract.mjs');
  const { renderBrain } = await import('../lib/render.mjs');
  const { exportBrains } = await import('../lib/export.mjs');
  const { writeFileSync } = await import('node:fs');
  const r = tempRoot('cb-t12g');
  seed(r);
  const brain = buildBrain(r, { channelId: CH_A, title: 'Creator A' });
  renderBrain(brain, { r, now: makeClock() });
  exportBrains({ r, now: makeClock() });

  // A file staged under the PREVIOUS naming scheme (before filenames carried the
  // channel id), and a file that belongs to somebody else. The README tells the
  // owner to copy the whole staging directory into the wiki vault, so an orphan
  // becomes permanent vault content that nothing ever regenerates.
  const stale = join(paths(r).vaultDir, `${brain.slug}.rules.jsonl`);
  const foreign = join(paths(r).vaultDir, 'someone-elses-notes.md');
  // Make it "ours" by recording it in the manifest, which is the ONLY thing that
  // authorises a reap — history, not the current slug list (review HR08).
  const { readManifest, saveManifest } = await import('../lib/manifest.mjs');
  const manifest = readManifest(r);
  manifest.artifacts[stale] = { writtenAt: new Date(0).toISOString() };
  saveManifest(manifest, r);
  writeFileSync(stale, 'stale artifact from the previous naming scheme', 'utf-8');
  writeFileSync(foreign, 'not ours', 'utf-8');

  const res = exportBrains({ r, now: makeClock() });
  assert.ok(!existsSync(stale), 'an artifact the manifest owns and we no longer produce is reaped');
  assert.ok(res.reaped.some((p) => p.endsWith(`${brain.slug}.rules.jsonl`)), 'and the reap is reported');
  // A delete primitive pointed at a shared directory must be AIMED, not swept.
  assert.ok(existsSync(foreign), 'a file the manifest does not own is left alone');
  assert.ok(res.skipped.some((x) => String(x.file).endsWith('someone-elses-notes.md')),
    'and the foreign file is REPORTED, not silently ignored');
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

  const surfaces = collectSurfaces(r);

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
  // Defence in depth, NOT the primary control. The reviewer's HR09 note is
  // right that an import check "is not a content/trust boundary" — the fidelity
  // gate over published bytes is what actually protects the tier. This still
  // matters: export has no way to reach transcript text, so a careless future
  // edit there cannot leak one.
  assert.ok(!/from '\.\/store\.mjs'/.test(src), 'export.mjs must not import the store module');
  assert.ok(!/from '\.\/extract\.mjs'/.test(src), 'export.mjs must not import the extractor (it reads Lane B)');
  assert.ok(!/\blistDocs\b|\breadDoc\b|\blistDocsChecked\b|\bvalidateDoc\b/.test(src),
    'export.mjs must not call a document reader');
  // And it must read only what a published generation's pointer names.
  assert.ok(/listPublished/.test(src), 'export resolves published generations');
  assert.ok(/readManifest/.test(src), 'export reaps from recorded history, not from the current list');
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

