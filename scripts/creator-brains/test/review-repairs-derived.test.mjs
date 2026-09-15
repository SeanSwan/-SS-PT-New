#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/review-repairs-derived.test.mjs
 * PURPOSE: Regressions for DERIVED-TRUTH findings HR07-HR13 at the real
 *          boundary the reviewer used.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair evidence)
 * ADDED: 2026-09-13
 *
 * What the engine DERIVES and PUBLISHES: namespace identity, source
 * reconciliation, the fidelity gate, polarity fidelity, the OAuth boundary,
 * document identity, enumeration completeness, timestamp validity.
 * Siblings: review-repairs.test.mjs (HR01-HR06),
 * review-repairs-store.test.mjs (HR14-HR24).
 *
 * RUN: node --test scripts/creator-brains/test/review-repairs-derived.test.mjs
 * @module creator-brains/test/review-repairs-derived
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  existsSync, readdirSync, readFileSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import {
  fakeDeps, makeClock, tempRoot, json3,
  makeReviewStore as makeStore,
  reviewDeps as deps,
  seedReviewDoc as seedDoc,
  rebuildBrain as rebuild,
  REVIEW_TEXT as TEXT, REVIEW_A as A, REVIEW_B as B, REVIEW_VA as VA, REVIEW_VB as VB,
} from './helpers.mjs';
import { paths } from '../lib/paths.mjs';
import { ensureStore } from '../lib/store.mjs';

test('HR07 two channels with the SAME name never share a namespace', async () => {
  const { buildBrain } = await import('../lib/extract.mjs');
  const { publishBrain, listPublished } = await import('../lib/render.mjs');
  const r = await makeStore('hr07');
  await seedDoc(r, A, VA);
  await seedDoc(r, B, VB);

  for (const [ch, title] of [[A, 'Common Name'], [B, 'Common Name']]) {
    const { listDocsChecked } = await import('../lib/store.mjs');
    const { valid } = listDocsChecked(r, ch);
    const brain = buildBrain({ channelId: ch, title }, { docs: valid });
    const res = publishBrain(brain, { r, sources: valid.map((d) => d.text) });
    assert.ok(res.ok, 'both publish');
  }
  const pubs = listPublished(r);
  assert.equal(pubs.length, 2, 'two independent brains');
  assert.deepEqual(pubs.map((p) => p.namespace).sort(), [A, B].sort(), 'namespaced by channel id');
});

// ── HR08 ────────────────────────────────────────────────────────────────────
test('HR08 a missing document is re-queued and its stale claims do not survive', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const { listDocsChecked, readState } = await import('../lib/store.mjs');
  const { queryBrains } = await import('../lib/query.mjs');
  const r = await makeStore('hr08', { videos: [[VA, A]] });
  const clock = makeClock();

  await runDaily({ r, clock, deps: deps(), only: ['fetch', 'build'], lock: false });
  assert.ok(queryBrains('shadows', { r }).hits.length > 0, 'there are claims to begin with');

  // Remove the only document.
  const { unlinkSync } = await import('node:fs');
  unlinkSync(join(paths(r).docsDir, A, `${VA}.json`));

  let probed = 0;
  const rec = await runDaily({
    r,
    clock,
    deps: deps({ probeSubs: (id) => { probed += 1; return { ok: true, kind: 'ok', languages: ['en-orig'], originals: ['en-orig'] }; } }),
    only: ['reconcile', 'fetch', 'build'],
    lock: false,
  });

  assert.ok(rec.counts.repaired >= 1, 'the state row is reconciled to missing_document');
  assert.ok(probed >= 1, 'and the video is actually re-fetched');
  assert.equal(listDocsChecked(r, A).valid.length, 1, 'the document is restored');
});

test('HR08b a creator with no readable documents publishes an EMPTY generation', async () => {
  const { runDaily } = await import('../lib/run.mjs');
  const { listPublished } = await import('../lib/render.mjs');
  const { queryBrains } = await import('../lib/query.mjs');
  const r = await makeStore('hr08b', { videos: [[VA, A]] });
  const clock = makeClock();
  await runDaily({ r, clock, deps: deps(), only: ['fetch', 'build'], lock: false });
  assert.ok(queryBrains('shadows', { r }).hits.length > 0);

  const { unlinkSync } = await import('node:fs');
  unlinkSync(join(paths(r).docsDir, A, `${VA}.json`));

  // Build alone, without a repairing fetch.
  await runDaily({
    r, clock, deps: deps({ probeSubs: () => ({ ok: false, kind: 'failed', error: 'offline' }) }), only: ['reconcile', 'build'], lock: false,
  });

  const pubs = listPublished(r);
  assert.equal(pubs.length, 1, 'a generation still exists');
  assert.equal(pubs[0].pointer.stats.claims, 0, 'and it is EMPTY — the stale claims are gone');
  assert.equal(queryBrains('shadows', { r }).hits.length, 0, 'so they are no longer queryable');
});

// ── HR09 ────────────────────────────────────────────────────────────────────
test('HR09 hyphenated output cannot smuggle a long verbatim run past the gate', async () => {
  const { checkArtifact, normalizeWords } = await import('../lib/fidelity.mjs');
  const stopwordFree = 'frequency separation layers masks brushes dodging burning contrast clarity texture detail sharpening noise reduction';
  const hyphenated = 'frequency-separation layers-masks brushes-dodging burning-contrast clarity-texture detail-sharpening noise-reduction';
  assert.equal(normalizeWords(hyphenated).length, 14, 'a hyphen is a separator, not a word joiner');
  const verdict = checkArtifact(`some claim: ${hyphenated}`, [stopwordFree]);
  assert.equal(verdict.ok, false, 'the 14-word run must be REJECTED');
  assert.ok(verdict.worst > 7);
});

test('HR09b a full generation that would leak is quarantined, not published', async () => {
  const { buildBrain } = await import('../lib/extract.mjs');
  const { publishBrain } = await import('../lib/render.mjs');
  const r = await makeStore('hr09b');
  const longText = 'how to blur the tear trough crease on a mature face without filler at all';
  await seedDoc(r, A, VA, `${longText} and that is the technique`);

  const { listDocsChecked } = await import('../lib/store.mjs');
  const { valid } = listDocsChecked(r, A);
  const brain = buildBrain({ channelId: A, title: 'Alpha' }, { docs: valid });

  // FORCE THE LEAK THROUGH AN UNCAPPED FIELD. A gap reason goes through `esc()`,
  // which escapes Markdown metacharacters and shortens nothing, so no per-field
  // cap protects it. That is exactly HR09's point: the guarantee has to come from
  // the gate over final bytes, not from remembering to cap every field.
  brain.gaps.push({ videoId: VA, state: 'synthetic', reason: longText });

  const res = publishBrain(brain, { r, sources: valid.map((d) => d.text) });
  assert.equal(res.ok, false, 'the generation is refused');
  assert.ok(res.quarantined && existsSync(res.quarantined), 'and a quarantine record is written');
  assert.equal(res.files.length, 0, 'nothing was published');
});

// ── HR10 ────────────────────────────────────────────────────────────────────
test('HR10 the OAuth lane reports its TRUE status at every stage', async () => {
  const { syncSubscriptions, OAUTH_STATUS } = await import('../lib/subs.mjs');
  const r = await makeStore('hr10');
  const credPath = join(r, 'client_secret.json');

  // 1. No credential: blocked, and the unblock path is spelled out.
  const noCred = await syncSubscriptions({
    r, credentialPath: join(r, 'absent.json'), tokenStorePath: join(r, 'token.json'),
  });
  assert.equal(noCred.blocked, true);
  assert.equal(noCred.reason, 'oauth_credentials_absent');
  assert.ok(noCred.steps.length >= 5, 'the steps are listed');

  // 2. A VALID credential but no token. The exchange now EXISTS, so the honest
  //    status is NOT_AUTHORIZED — a different statement from "not implemented",
  //    and the one that names what the owner must do next.
  writeFileSync(credPath, JSON.stringify({
    installed: { client_id: 'x'.repeat(40), client_secret: 'y'.repeat(20), redirect_uris: ['http://127.0.0.1'] },
  }), 'utf-8');
  const noToken = await syncSubscriptions({ r, credentialPath: credPath, tokenStorePath: join(r, 'token.json') });
  assert.equal(noToken.blocked, true, 'still blocked');
  assert.equal(noToken.reason, 'oauth_not_authorized', 'and it says WHICH blocker this is');
  assert.match(noToken.message, /authorize/, 'naming the command that fixes it');

  // 3. The status object is honest about all three facts at once.
  assert.equal(OAUTH_STATUS.exchangeImplemented, true);
  assert.equal(OAUTH_STATUS.consentImplemented, true);
  assert.equal(OAUTH_STATUS.liveAuthorizationPerformed, false,
    'no owner has consented on this machine — claiming otherwise would be the old lie in a new costume');
});

test('HR10b a partial snapshot never marks creators unsubscribed', async () => {
  const { applySnapshot } = await import('../lib/subs.mjs');
  const reg = { version: 1, creators: { [A]: { channelId: A, lifecycle: 'subscribed', enabled: true } } };
  const partial = applySnapshot(reg, { rows: [{ channelId: B, title: 'Beta' }], complete: false });
  assert.equal(reg.creators[A].lifecycle, 'subscribed', 'A is untouched by an incomplete snapshot');
  assert.equal(partial.markedUnsubscribed, 0);

  const full = applySnapshot(reg, { rows: [{ channelId: B, title: 'Beta' }], complete: true });
  assert.equal(reg.creators[A].lifecycle, 'unsubscribed', 'a COMPLETE snapshot may mark it');
  assert.equal(full.markedUnsubscribed, 1);
  assert.ok(reg.creators[A], 'and it is marked, never deleted');
});

// ── HR11 ────────────────────────────────────────────────────────────────────
test('HR11 a timing-only change IS written, and a tampered document is repaired', async () => {
  const { writeDoc, docPath, readDoc } = await import('../lib/store.mjs');
  const r = await makeStore('hr11');
  const base = {
    schemaVersion: 2, channelId: A, videoId: VA, text: TEXT, title: 'T', language: 'en', source: 'timed-text', originalTrack: true,
  };
  const first = writeDoc(r, { ...base, cues: [{ ms: 1000, text: TEXT }] });
  assert.equal(first.reason, 'created');

  const second = writeDoc(r, { ...base, cues: [{ ms: 9000, text: TEXT }] });
  assert.equal(second.wrote, true, 'a cue moved from 1s to 9s is a CHANGE');
  assert.equal(second.reason, 'updated');
  assert.equal(readDoc(r, A, VA).cues[0].ms, 9000);

  // Tamper the text but keep its old hash.
  const p = docPath(r, A, VA);
  const doc = JSON.parse(readFileSync(p, 'utf-8'));
  doc.text = 'corrupt replacement';
  writeFileSync(p, JSON.stringify(doc), 'utf-8');

  const third = writeDoc(r, { ...base, cues: [{ ms: 9000, text: TEXT }] });
  assert.equal(third.wrote, true, 'a correct refetch must REPAIR a tampered document');
  assert.equal(third.reason, 'repaired_tampered_document');
  assert.equal(readDoc(r, A, VA).text, TEXT);
});

// ── HR12 ────────────────────────────────────────────────────────────────────
test('HR12 an incomplete enumeration cannot fabricate a deletion', async () => {
  const { discoverChannel } = await import('../lib/discover.mjs');
  const { readState } = await import('../lib/store.mjs');
  const r = await makeStore('hr12', { videos: [[VA, A]] });
  const { stateOrDefault } = await import('../lib/store.mjs');
  const state = stateOrDefault(readState(r));
  state.videos[VA].state = 'fetched';
  writeFileSync(paths(r).state, JSON.stringify({ version: 1, videos: state.videos }), 'utf-8');

  // Three INCOMPLETE walks that omit the video.
  for (let i = 0; i < 3; i += 1) {
    await discoverChannel({ channelId: A, title: 'Alpha' }, {
      r,
      now: makeClock(),
      deps: deps({ enumerate: () => ({ rows: [], invalid: [{ line: 'x', reason: 'unparseable' }], complete: false, reason: 'rows unparseable', tabs: ['videos'] }) }),
    });
  }
  const after = stateOrDefault(readState(r)).videos[VA];
  assert.equal(after.state, 'fetched', `an unverified walk must not retire a live video (got ${after.state})`);
});

test('HR12b a tab in a title cannot drop the row', async () => {
  const { parsePrintRows, classifyEnumeration } = await import('../lib/enumerate.mjs');
  const line = JSON.stringify({ id: VA, title: 'before\tafter', duration: 60, channel_id: A });
  const res = parsePrintRows(`${line}\n`);
  assert.equal(res.rows.length, 1, 'a tab inside a JSON string is data, not a field separator');
  assert.equal(res.rows[0].title, 'before\tafter');
  assert.equal(classifyEnumeration(res).complete, true);
});

test('HR12c an empty-but-successful process is INCONCLUSIVE, not an empty channel', async () => {
  const { classifyEnumeration } = await import('../lib/enumerate.mjs');
  const v = classifyEnumeration({ rows: [], invalid: [] });
  assert.equal(v.complete, false);
  assert.match(v.reason, /inconclusive/i);
});

// ── HR13 ────────────────────────────────────────────────────────────────────
test('HR13 a negative cue time is refused, never rendered as &t=-9s', async () => {
  const { validateCues } = await import('../lib/subtitles.mjs');
  const bad = validateCues([{ ms: -9000, text: 'a negative cue' }]);
  assert.equal(bad.ok, false);
  assert.match(bad.problems[0], /negative/i);

  const { fetchVideo } = await import('../lib/fetch.mjs');
  const r = await makeStore('hr13', { videos: [[VA, A]] });
  const { stateOrDefault, readState } = await import('../lib/store.mjs');
  const state = stateOrDefault(readState(r));
  const creator = { channelId: A, title: 'Alpha' };
  const out = await fetchVideo(state.videos[VA], {
    r,
    creator,
    state,
    now: makeClock(),
    authority: { registry: { creators: { [A]: { channelId: A, enabled: true } } }, requireRegistryEntry: true, requireEnabled: true, requireDiscovered: true },
    deps: deps({ fetchJson3: () => json3([[-9000, 'a negative cue']]) }),
  });
  assert.notEqual(out.state, 'fetched', 'the video is not stored as successfully fetched');
});


