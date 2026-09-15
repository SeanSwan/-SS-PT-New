#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/fetch.mjs
 * PURPOSE: One video id → one durable transcript document, or one NAMED
 *          failure state. This is the module the whole engine's honesty rests
 *          on.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S5)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * THE ORDER IS THE POINT:
 *   1. probe  — "does a caption track exist?"  (answers, or fails to answer)
 *   2. fetch  — only if the probe said yes
 *   3. parse  — only if a payload actually arrived
 *   4. store  — only if the parse produced real cues
 * Every step can fail, and every failure has its OWN state. The upstream
 * hostile review found that collapsing steps 1 and 2 makes a video with
 * perfectly good captions look permanently uncaptioned (finding F2), because
 * `yt-dlp --write-auto-sub --skip-download` exits 0 and writes nothing in BOTH
 * cases. Asking the question directly is the only way to tell them apart.
 *
 * INV-3 — DISCOVERY-BOUND FETCHING:
 *   A video id may only be fetched if discovery produced it for a known
 *   creator. Without this, any id reaching the CLI becomes a fetch, and the
 *   "enabled creator set" boundary stops meaning anything. `requireDiscovered`
 *   is what the daily runner passes; the live test passes it off deliberately
 *   because it is fetching a canary, not a catalog entry.
 *
 * NO MEDIA IS EVER DOWNLOADED. `ytdlp.runYtDlp` refuses media flags outright,
 * so this is enforced in two places rather than promised in one comment.
 *
 * @module creator-brains/fetch
 */

import { parseJson3 } from '../../swan-scout/yt-scout-transcript.mjs';
import { probeSubs as realProbeSubs, fetchJson3 as realFetchJson3, pickLanguage } from './ytdlp.mjs';
import { applyOutcome } from './fsm.mjs';
import { docPath, writeDoc } from './store.mjs';
import { nowIso } from './paths.mjs';

/** Marker words whose presence makes a cue worth keeping as a claim. */
export const ASR_ONLY = 'timed-text';

/**
 * Fetch and store one video's transcript.
 *
 * Returns the NEXT video record flattened with fetch metadata:
 *   { ...video, state, lastError, wrote, reason, language, contentHash }
 * so callers never have to reach into a nested object to find out what
 * happened — a return shape that hides the outcome is how "0 fetched" becomes
 * indistinguishable from "0 to fetch".
 */
export async function fetchVideo(video, {
  r, creator, deps = {}, now, requireDiscovered = false, language = 'en', state = null,
} = {}) {
  const clock = now || (() => Date.now());
  const probeSubs = deps.probeSubs || realProbeSubs;
  const fetchJson3 = deps.fetchJson3 || realFetchJson3;

  // INV-3 — refuse before any network call, and say exactly why.
  //
  // FAIL-CLOSED ON A MISSING MAP. An earlier draft read
  // `const known = map ? !!map.videos[id] : true` — so a caller that forgot to
  // pass the state map got `known = true` and every id sailed through. That is
  // the exact shape of a fail-open guard: correct in every test that passes the
  // map, and silently absent in the one caller that does not, which is
  // precisely the caller the guard exists to stop. Absent map => refuse.
  if (requireDiscovered) {
    const known = !!(state && state.videos && state.videos[video.videoId]);
    if (!known) {
      return finish(applyOutcome(video, {
        kind: 'error',
        error: `not_discovered: ${video.videoId} was not produced by discovery for this creator`,
        permanent: true,
      }, { now: clock() }), { wrote: false, reason: 'not_discovered' });
    }
  }

  // ── 1. PROBE ──────────────────────────────────────────────────────────────
  let probe;
  try {
    probe = probeSubs(video.videoId);
  } catch (e) {
    return finish(applyOutcome(video, { kind: 'error', error: `probe threw: ${e.message}` }, { now: clock() }),
      { wrote: false, reason: 'probe_threw' });
  }
  if (!probe || probe.ok !== true) {
    // We could not get an ANSWER. Transient — never a caption verdict.
    return finish(applyOutcome(video, {
      kind: 'error', error: `probe failed: ${(probe && probe.error) || 'unknown'}`,
    }, { now: clock() }), { wrote: false, reason: 'probe_failed' });
  }

  // A PROBE THAT DID NOT RETURN A LANGUAGE LIST HAS NOT ANSWERED.
  //
  //   `Array.isArray(probe.languages) ? probe.languages : []` turns a missing
  //   field into an empty list, an empty list into "no track", and "no track"
  //   into a definitive caption verdict recorded against the video. That is the
  //   fail-open class this module's own header claims to have eliminated one
  //   layer up: "we could not get an answer" silently becoming an answer. It is
  //   reachable from any yt-dlp output-shape change or a future probe
  //   implementation, and `parseListSubs('')` returns `[]`, so an exit-0 run
  //   with no output is indistinguishable from a genuinely caption-less video.
  //   Absent field => failed_transient with a shape reason.
  if (!Array.isArray(probe.languages)) {
    return finish(applyOutcome(video, {
      kind: 'error',
      error: 'probe returned no language list — output shape changed or was empty',
    }, { now: clock() }), { wrote: false, reason: 'probe_shape_rejected' });
  }

  const langs = probe.languages;
  const picked = pickLanguage(langs, language, probe.originals);
  if (!picked || !picked.lang) {
    // We DID get an answer, and the answer was "no ORIGINAL-language track in
    // the language we want". That is `no_track_confirmed` — an answer, not a
    // failure — and it is deliberately NOT satisfied by a machine translation.
    // Filling the brain with a translation would put words in the creator's
    // mouth and attach their name to them.
    return finish(applyOutcome(video, { kind: 'no_track', meta: { language: null } }, { now: clock() }), {
      wrote: false,
      reason: picked && picked.reason ? picked.reason : 'no_track_confirmed',
      languages: langs.length,
      translated: false,
    });
  }
  const pickedLang = picked.lang;

  // ── 2. FETCH ──────────────────────────────────────────────────────────────
  let raw;
  try {
    raw = fetchJson3(video.videoId, pickedLang);
  } catch (e) {
    // Absence AFTER a declared presence is a FAILURE, not a no-track. This is
    // the exhaust port the whole F2 finding is about.
    return finish(applyOutcome(video, {
      kind: 'error', error: `fetch failed after a positive probe: ${e.message}`,
    }, { now: clock() }), { wrote: false, reason: 'fetch_failed', languages: langs.length });
  }

  // ── 3. PARSE + SHAPE VALIDATION ───────────────────────────────────────────
  let parsed;
  try {
    parsed = parseJson3(raw);
  } catch (e) {
    return finish(applyOutcome(video, {
      kind: 'error', error: `json3 shape rejected: ${e.message}`,
    }, { now: clock() }), { wrote: false, reason: 'shape_rejected', languages: langs.length });
  }
  if (!parsed || !Array.isArray(parsed.cues) || parsed.cues.length === 0) {
    // A 200-with-empty-payload is the worst upstream failure mode: the run goes
    // green and the brain silently goes stale. It fails CLOSED here instead.
    return finish(applyOutcome(video, {
      kind: 'error',
      error: 'json3 shape rejected: no cues — payload was empty or its shape changed',
    }, { now: clock() }), { wrote: false, reason: 'shape_rejected', languages: langs.length });
  }

  // ── 4. STORE ──────────────────────────────────────────────────────────────
  const doc = {
    videoId: video.videoId,
    channelId: creator.channelId,
    channelTitle: creator.title ?? null,
    language: pickedLang,
    // Provenance, recorded per document: was this the track the creator
    // actually spoke, or a match we could not verify as original? See
    // ytdlp.pickLanguage for why the distinction exists.
    originalTrack: picked.original === true,
    source: picked.original === true ? ASR_ONLY : `${ASR_ONLY}-unverified-original`,
    fetchedAt: nowIso(clock),
    title: video.title ?? null,
    durationS: video.durationS ?? null,
    publishedAt: video.publishedAt ?? null,
    text: parsed.text,
    cues: parsed.cues,
    chars: parsed.text.length,
    cueCount: parsed.cues.length,
  };

  let stored;
  try {
    stored = writeDoc(r, doc);
  } catch (e) {
    return finish(applyOutcome(video, {
      kind: 'error', error: `store write failed: ${e.message}`,
    }, { now: clock() }), { wrote: false, reason: 'store_failed', languages: langs.length });
  }

  const next = applyOutcome(video, { kind: 'ok' }, {
    now: clock(),
    meta: {
      language: pickedLang,
      contentHash: stored.hash,
      docPath: docPath(r, creator.channelId, video.videoId),
    },
  });
  return finish(next, { wrote: stored.wrote, reason: stored.reason, languages: langs.length, cueCount: parsed.cues.length });
}

/** Flatten the state record with fetch metadata. Never returns a bare boolean. */
function finish(record, extra) {
  return { ...record, ...extra };
}
