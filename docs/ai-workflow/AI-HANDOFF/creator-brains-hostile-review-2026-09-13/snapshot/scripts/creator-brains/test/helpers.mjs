#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/helpers.mjs
 * PURPOSE: Shared test fixtures — an isolated temp store, a deterministic
 *          clock, and FAKE yt-dlp dependencies so no unit test touches the
 *          network.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint §6)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHY EVERY DEPENDENCY IS INJECTED:
 *   The upstream hostile review's worst finding was "runs go green, zero
 *   segments stored, brain silently stale for weeks" — a pipeline that cannot
 *   be tested without the network is a pipeline nobody tests. Every function
 *   that would call yt-dlp takes its caller-supplied dependency instead, so the
 *   suite proves the LOGIC (state routing, fail-closed behaviour, tier law)
 *   without proving anything about YouTube that day. The two `@live` tests at
 *   the end exist to prove the real boundary separately.
 *
 * @module creator-brains/test/helpers
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Every temp root made in this process, reaped once at exit.
 *
 *  Registered as a SINGLE listener rather than one per tempRoot() call: an
 *  `process.on('exit')` per test trips Node's MaxListenersExceededWarning at
 *  11 tests and buries the real output under a memory-leak warning that is not
 *  a leak. */
const TEMP_DIRS = [];
let reaperRegistered = false;

export function tempRoot(label = 'cb') {
  const dir = mkdtempSync(join(tmpdir(), `${label}-`));
  TEMP_DIRS.push(dir);
  if (!reaperRegistered) {
    reaperRegistered = true;
    process.on('exit', () => {
      for (const d of TEMP_DIRS) { try { rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }
    });
  }
  return dir;
}

/** A frozen, advanceable clock. Retry windows are 48h; tests must not wait. */
export function makeClock(startMs = Date.parse('2026-09-12T06:30:00Z')) {
  let t = startMs;
  const clock = () => t;
  clock.advance = (ms) => { t += ms; return t; };
  clock.set = (ms) => { t = ms; return t; };
  clock.iso = () => new Date(t).toISOString();
  return clock;
}

/** Build a json3 payload the way YouTube emits it: events with tStartMs+segs. */
export function json3(cues) {
  return JSON.stringify({
    events: cues.map(([ms, text]) => ({
      tStartMs: ms,
      dDurationMs: 3000,
      segs: text.split(' ').map((w) => ({ utf8: `${w} ` })),
    })),
  });
}

/** A raw json3 string with rolling duplicate lines, the way auto-captions look. */
export function rollingJson3() {
  return json3([
    [0, 'welcome to the channel'],
    [3000, 'welcome to the channel'],
    [6000, 'today we cover shadow lift'],
    [9000, 'today we cover shadow lift and tone'],
  ]);
}

/** Fake yt-dlp deps. Each is overridable per test. */
export function fakeDeps(overrides = {}) {
  return {
    /** (videoId) -> {ok:true, languages:[...]} | {ok:false, error} */
    probeSubs: (id) => ({ ok: true, languages: ['en'] }),
    /** (videoId, lang) -> raw json3 string (may throw) */
    fetchJson3: (id) => rollingJson3(),
    /** (channelUrl, {limit}) -> rows */
    listUploads: () => [],
    /** (ref) -> {channelId, title, url} | null */
    resolveCreator: (ref) => ({ channelId: 'UC' + 'a'.repeat(22), title: ref, url: 'https://x' }),
    ...overrides,
  };
}

/** A row shaped like listUploads output. */
export function uploadRow(i, extra = {}) {
  return {
    id: `vid${String(i).padStart(8, '0')}`.slice(0, 11),
    title: `Video ${i}`,
    duration: String(600 + i),
    view_count: String(1000 - i),
    upload_date: '20260101',
    ...extra,
  };
}

/** A stored transcript document shaped like fetch.mjs writes. */
export function fixtureDoc(overrides = {}) {
  return {
    videoId: 'aircAruvnKk',
    channelId: 'UC' + 'a'.repeat(22),
    language: 'en',
    source: 'timed-text',
    fetchedAt: '2026-09-12T06:30:00.000Z',
    text: 'never blur the tear trough crease because it flattens the face and kills dimension',
    cues: [
      { ms: 0, text: 'never blur the tear trough crease' },
      { ms: 6000, text: 'because it flattens the face and kills dimension' },
    ],
    contentHash: 'deadbeef',
    chars: 82,
    cueCount: 2,
    ...overrides,
  };
}

/** Count the longest run of consecutive words two strings share. */
export function longestVerbatimRun(a, b) {
  const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const A = words(a); const B = new Set();
  const bw = words(b);
  for (let i = 0; i < bw.length; i += 1) for (let j = i + 1; j <= bw.length; j += 1) B.add(bw.slice(i, j).join(' '));
  let best = 0;
  for (let i = 0; i < A.length; i += 1) {
    for (let j = i + 1; j <= A.length; j += 1) {
      const span = A.slice(i, j);
      if (span.length <= best) continue;
      if (B.has(span.join(' '))) best = span.length;
    }
  }
  return best;
}
