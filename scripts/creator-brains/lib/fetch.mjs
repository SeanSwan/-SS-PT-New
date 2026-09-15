#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/fetch.mjs
 * PURPOSE: One video id → one durable transcript document, or one NAMED
 *          failure state — under verified authority.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR13/18/19)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13
 * ============================================================================
 *
 * THE ORDER IS THE POINT:
 *   authority → probe → fetch → validate → store
 * Every step can fail, and every failure has its OWN state.
 *
 * WHAT THE REVIEW FOUND (HR18):
 *   The discovery-bound guard checked that a video ID existed SOMEWHERE in the
 *   state map — not that it belonged to the creator being asked for. The
 *   reviewer supplied creator B's video with creator A's identity and it was
 *   fetched and SAVED UNDER A. A caller-constructed `creator` object was being
 *   accepted as proof of ownership.
 *
 *   Authority is now established from the authoritative records: the video's own
 *   `channelId`, the registry row, and the enabled flag — all must agree with the
 *   creator the caller named. A mismatch is `not_authorized`, a PERMANENT state,
 *   and no network call happens first.
 *
 * WHAT THE REVIEW FOUND (HR19):
 *   A probe that could not be understood produced an empty language list, which
 *   became "no captions", which became a terminal `unavailable`. The probe now
 *   reports a KIND, and only a genuine answer with no tracks is `no_track`.
 *
 * WHAT THE REVIEW FOUND (HR13):
 *   A cue at -9000ms was stored and rendered as a `&t=-9s` citation. Cues are
 *   validated here, before anything is persisted.
 *
 * @module creator-brains/fetch
 */

import { parseJson3 } from '../../swan-scout/yt-scout-transcript.mjs';
import { probeSubs as realProbeSubs, pickLanguage, PROBE } from './probe.mjs';
import { fetchJson3 as realFetchJson3, validateCues } from './subtitles.mjs';
import { applyOutcome } from './fsm.mjs';
import { docPath, writeDoc, DOC_SCHEMA_VERSION } from './store.mjs';
import { nowIso } from './paths.mjs';
import { redact } from './digest.mjs';

export const SOURCE_ASR = 'timed-text';

/**
 * Fetch and store one video's transcript.
 *
 * Returns the NEXT video record flattened with fetch metadata:
 *   `{ ...video, state, lastError, wrote, reason, language, contentHash }`
 * so a caller never has to reach into a nested object to find out what happened —
 * a return shape that hides the outcome is how "0 fetched" becomes
 * indistinguishable from "0 to fetch".
 */
export async function fetchVideo(video, {
  r, creator, deps = {}, now, authority = null, language = 'en', state = null, requireDiscovered = false,
  noTrackHours = null,
} = {}) {
  const clock = now || (() => Date.now());
  const probeFn = deps.probeSubs || realProbeSubs;
  const fetchFn = deps.fetchJson3 || realFetchJson3;

  // `requireDiscovered` is the previous NAME for the discovery half of the
  // authority check. It is honoured rather than ignored: it enables the same
  // binding requirement, so an older caller gets the STRICTER behaviour, never a
  // bypass. It never disables the channel-identity check, which runs regardless.
  const auth = authority || (requireDiscovered ? { requireDiscovered: true } : null);

  const verdict = checkAuthority(video, creator, auth, state);
  if (!verdict.ok) {
    return finish(applyOutcome(video, {
      kind: 'error', error: `not_authorized: ${verdict.reason}`, permanent: true,
    }, { now: clock() }), { wrote: false, reason: 'not_authorized' });
  }

  // ── 1. PROBE ──────────────────────────────────────────────────────────────
  // ADMISSION IS PER OPERATION (review HR01). The budget now counts yt-dlp
  // invocations, so the probe and the fetch are reserved separately and a
  // refused probe leaves the video DEFERRED rather than failed.
  const probeSlot = takeSlot(deps, 'probe');
  if (!probeSlot.ok) return deferred(video, probeSlot.reason);

  let probe;
  try {
    probe = probeFn(video.videoId);
  } catch (e) {
    return finish(applyOutcome(video, { kind: 'error', error: `probe threw: ${e.message}` }, { now: clock() }),
      { wrote: false, reason: 'probe_threw' });
  }
  if (!probe || probe.ok !== true) {
    // A SHAPE ERROR AND A TRANSPORT FAILURE ARE BOTH TRANSIENT, AND NEITHER IS AN
    // ANSWER. The old code turned an empty language list into "no captions".
    const kind = (probe && probe.kind) || PROBE.FAILED;
    return finish(applyOutcome(video, {
      kind: 'error', error: `probe ${kind}: ${(probe && probe.error) || 'unknown'}`,
    }, { now: clock() }), { wrote: false, reason: `probe_${kind}` });
  }
  if (!Array.isArray(probe.languages)) {
    return finish(applyOutcome(video, {
      kind: 'error', error: 'probe returned no language list — output shape changed or was empty',
    }, { now: clock() }), { wrote: false, reason: 'probe_shape_rejected' });
  }

  const langs = probe.languages;
  const picked = pickLanguage(langs, language, probe.originals);
  if (!picked || !picked.lang) {
    // We DID get an answer, and it was "no ORIGINAL-language track in the
    // language we want". That is `no_track` — an answer, not a failure — and it
    // is deliberately NOT satisfied by a machine translation. `noTrackHours`
    // carries the caller's configured retry window through to the state machine
    // (review HR23: the blueprint advertised a configurable window that no CLI
    // flag could reach).
    return finish(applyOutcome(video, { kind: 'no_track', meta: { language: null } }, {
      now: clock(), noTrackHours,
    }), {
      wrote: false,
      reason: picked && picked.reason ? picked.reason : 'no_track_confirmed',
      languages: langs.length,
    });
  }
  const pickedLang = picked.lang;

  // ── 2. FETCH ──────────────────────────────────────────────────────────────
  const fetchSlot = takeSlot(deps, 'fetch');
  if (!fetchSlot.ok) return deferred(video, fetchSlot.reason);

  let raw;
  try {
    raw = fetchFn(video.videoId, pickedLang);
  } catch (e) {
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

  // TIMING VALIDATION AT THE ENGINE BOUNDARY (review HR13). The shared scout
  // parser coerces a missing time to 0; a negative or non-finite time makes a
  // citation that goes nowhere, so it is refused here rather than persisted.
  const cueCheck = validateCues(parsed && parsed.cues);
  if (!cueCheck.ok) {
    return finish(applyOutcome(video, {
      kind: 'error',
      error: `cue validation failed: ${cueCheck.problems.slice(0, 3).join('; ')}`,
    }, { now: clock() }), { wrote: false, reason: 'cue_validation_failed', languages: langs.length });
  }
  const cues = cueCheck.cues;
  const text = cues.map((c) => c.text).join(' ').replace(/\s+/g, ' ').trim();
  if (!text) {
    return finish(applyOutcome(video, {
      kind: 'error', error: 'json3 shape rejected: cues carried no text',
    }, { now: clock() }), { wrote: false, reason: 'shape_rejected', languages: langs.length });
  }

  // ── 4. STORE ──────────────────────────────────────────────────────────────
  const doc = {
    schemaVersion: DOC_SCHEMA_VERSION,
    videoId: video.videoId,
    channelId: creator.channelId,
    channelTitle: creator.title ?? null,
    language: pickedLang,
    // Provenance, per document: was this the track the creator actually spoke,
    // or a match we could not verify as original?
    originalTrack: picked.original === true,
    source: picked.original === true ? SOURCE_ASR : `${SOURCE_ASR}-unverified-original`,
    fetchedAt: nowIso(clock),
    title: video.title ?? null,
    durationS: video.durationS ?? null,
    publishedAt: video.publishedAt ?? null,
    text,
    cues,
    chars: text.length,
    cueCount: cues.length,
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
  return finish(next, {
    wrote: stored.wrote, reason: stored.reason, languages: langs.length, cueCount: cues.length,
  });
}

/**
 * Establish that this video may be fetched for this creator.
 *
 * The video's own channel, the registry row and the enabled flag must all agree
 * with the creator the caller named. A caller-constructed `creator` object is
 * NOT evidence (review HR18) — it is a claim, and this function checks the claim
 * against the authoritative records instead of trusting it.
 */
export function checkAuthority(video, creator, authority, state) {
  if (!video || typeof video !== 'object') return { ok: false, reason: 'no video record' };
  if (!creator || typeof creator !== 'object') return { ok: false, reason: 'no creator record' };
  if (typeof creator.channelId !== 'string' || !creator.channelId) {
    return { ok: false, reason: 'creator has no channel id' };
  }

  const fromRegistry = authority && authority.registry && authority.registry.creators
    ? authority.registry.creators[creator.channelId]
    : null;
  if (authority && authority.requireRegistryEntry && !fromRegistry) {
    return { ok: false, reason: `creator ${creator.channelId} is not in the registry` };
  }
  if (fromRegistry && authority && authority.requireEnabled && fromRegistry.enabled !== true) {
    return { ok: false, reason: `creator ${creator.channelId} is disabled` };
  }

  // The video must belong to the creator the caller named — not merely exist.
  if (video.channelId !== creator.channelId) {
    return { ok: false, reason: `video ${video.videoId} belongs to ${video.channelId}, not ${creator.channelId}` };
  }

  // The state row is the record of what discovery actually produced.
  if (authority && authority.requireDiscovered) {
    const row = state && state.videos ? state.videos[video.videoId] : null;
    if (!row) return { ok: false, reason: `not_discovered: ${video.videoId} was not produced by discovery` };
    if (row.channelId !== creator.channelId) {
      return { ok: false, reason: `state row for ${video.videoId} is bound to ${row.channelId}, not ${creator.channelId}` };
    }
  }
  return { ok: true, reason: null, registryRow: fromRegistry || null };
}

/**
 * Keep only the persisted shape — fetch metadata must not bloat the state map.
 *
 * `lastError` IS SCRUBBED ON THE WAY IN: it is echoed into the brain's
 * coverage-gap table, which is Lane C, which is exported. It lives here, beside
 * the outcome shape it narrows, so the two cannot drift apart.
 */
export function stripMeta(outcome, secrets = []) {
  const {
    wrote, reason, languages, cueCount, docPath, deferred, ...rest
  } = outcome;
  if (rest.lastError) rest.lastError = redact(rest.lastError, secrets).slice(0, 400);
  return rest;
}

/** Flatten the state record with fetch metadata. Never returns a bare boolean. */
function finish(record, extra) {
  return { ...record, ...extra };
}

/** Ask the injected budget for one operation's worth of admission. */
function takeSlot(deps, op) {
  if (typeof deps.reserve !== 'function') return { ok: true, reason: null };
  try {
    return deps.reserve(op);
  } catch (e) {
    return { ok: false, reason: `budget check failed: ${e.message}` };
  }
}

/**
 * The video is UNCHANGED and the run is out of budget for it. This is not a
 * failure and must not be recorded as one — the caller counts it as deferred
 * with a reason, which is the CB5 contract.
 */
function deferred(video, reason) {
  return {
    ...video,
    wrote: false,
    deferred: true,
    reason: 'deferred_budget',
    lastError: reason || 'transport budget exhausted',
  };
}
