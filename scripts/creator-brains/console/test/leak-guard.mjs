/**
 * ============================================================================
 * FILE: scripts/creator-brains/console/test/leak-guard.mjs
 * PURPOSE: The LANE B leak detector, shared by the boundary and HY4 suites.
 * PART OF: Creator Brains Console (blueprint 06-test-plan.md)
 * SLICE: S0
 * ============================================================================
 *
 * WHY THIS IS SHARED RATHER THAN COPIED. Two suites need to assert the same
 * invariant — T-B7 (boundary) and HY4-H5 (the reviewer's schema-level version) —
 * and if each carried its own copy they would drift, which is exactly how a
 * boundary stops being one. There is one definition of "a payload carries
 * transcript content", and it lives here.
 *
 * ---------------------------------------------------------------------------
 * THE FALSE POSITIVE THIS DETECTOR WAS BUILT PAST, AND WHY IT MATTERS
 * ---------------------------------------------------------------------------
 *
 * The first version asserted on key NAMES alone:
 *
 *     const TRANSCRIPT_FIELDS = ['segments','transcript','text','captions','subtitles'];
 *     assert.ok(!TRANSCRIPT_FIELDS.includes(k), ...);
 *
 * and immediately reported:
 *
 *     LANE B SHAPE LEAK: '/api/status.throttle.text' is a transcript-bearing field
 *
 * That is wrong twice over. `throttle.text` is a ONE-LINE OPERATOR SENTENCE
 * ('none — traffic is allowed'); it is deliberately part of the contract
 * (`05-contracts.md` §3 lists it as engine-formatted truth, passed through
 * verbatim); and a test that demanded its removal would be asking for a real
 * capability to be deleted in order to satisfy a guess about a field name.
 *
 * The lesson generalises: a boundary test must assert the SHAPE OF THE LEAK, not
 * a list of suspicious words. Words are cheap and legitimate; an array of timed
 * caption cues is neither. So this detector:
 *
 *   1. keeps the unmistakable CONTAINER names (`segments`, `cues`, `captions`,
 *      `subtitles`, `transcript`) — those are never anything else;
 *   2. treats a bare `text`/`body`/`content` as a violation only when its VALUE
 *      could carry a transcript — long, multi-sentence, or non-string;
 *   3. independently catches the real artefact regardless of the key name, by
 *      recognising the engine's own cue shape (`{ tStartMs|ms, text }`) inside
 *      any array. A leak renamed to `items` is still caught.
 *
 * Point 3 is the one that earns its keep: it means the detector does not depend
 * on the leaker choosing a predictable name, which is the assumption that makes
 * keyword-based guards theatre.
 *
 * @module creator-brains/console/test/leak-guard
 */

import assert from 'node:assert/strict';

/** Field names that are ONLY ever transcript containers — never display prose. */
export const TRANSCRIPT_CONTAINER_FIELDS = Object.freeze([
  'segments', 'cues', 'captions', 'subtitles', 'transcript',
]);

/** Field names that are usually display prose, and so need a value check. */
const PROSE_FIELDS = Object.freeze(['text', 'body', 'content', 'caption']);

/** A sentence longer than this is a passage, not a UI label. */
const PROSE_CHARS_MAX = 400;

/** Two or more sentence terminators means we are reading prose, not a label. */
const SENTENCE_MIN = 2;

/**
 * THE NAME-INDEPENDENT SIZE GATE (added 2026-09-18, hostile round 2).
 *
 * The detector's own docstring used to claim it "does not depend on the leaker
 * choosing a predictable name". A hostile pass proved that claim false: a
 * 50 KB transcript under `notes`, `detail`, `snippet` or any other unlisted key
 * walked straight through, because the prose check only fired for the four names
 * in PROSE_FIELDS. 8 of 11 probe leaks escaped.
 *
 * No UI string is anywhere near this size — the longest contract-pinned prose in
 * the payload (`throttle.text`) is tens of characters, and `backlog.lines` is an
 * array of SHORT lines, which is why the threshold is per-string and not a sum.
 * A single string this long is a document, not a label, whatever it is called.
 */
const TRANSCRIPT_CHARS_MAX = 2_000;

/**
 * Timing field names that mark a caption cue. The first version listed only
 * `tStartMs|ms|t_start_ms|start`, so a cue renamed to `begin` or `offset` passed.
 */
const CUE_TIME_FIELDS = Object.freeze([
  'tstartms', 'ms', 't_start_ms', 'start', 'begin', 'offset', 'time', 't',
  'startms', 'start_ms', 'starttime', 'from', 'at',
]);

/**
 * Is this object shaped like one caption cue (`{ <numeric time>, text }`)?
 *
 * THE VALUE MUST BE NUMERIC, and that single requirement is what keeps this
 * honest. Broadening the key list alone produced a false positive within
 * minutes: `throttle` carries `{ ..., start, text }`, and `throttle.start` is an
 * ISO TIMESTAMP STRING, not a millisecond offset. Matching on the key `start`
 * alone therefore condemned a legitimate, contract-pinned status object.
 *
 * A caption cue's timing is always a number (ms offset). An operator-facing
 * object's time is always a formatted string. Requiring `number` separates them
 * on the thing that actually differs, rather than on a name either could use.
 */
function looksLikeCueObject(e) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return false;
  if (typeof e.text !== 'string') return false;
  return Object.entries(e).some(([k, v]) => CUE_TIME_FIELDS.includes(k.toLowerCase())
    && typeof v === 'number' && Number.isFinite(v));
}

/**
 * Mirrors the engine's Segment shape, but tolerates renamed timing keys AND a
 * single cue that is not wrapped in an array — both of which escaped the first
 * version, which required `Array.isArray` plus one of four hard-coded keys.
 */
export function looksLikeCueArray(v) {
  if (Array.isArray(v)) return v.some((e) => looksLikeCueObject(e));
  return looksLikeCueObject(v);
}

/** Is this value plausibly a transcript rather than a status sentence? */
export function looksLikeTranscriptText(v) {
  if (v === null || v === undefined) return false;
  if (typeof v !== 'string') return true; // an object/array under `text` is not a display string
  const trimmed = v.trim();
  if (trimmed.length > PROSE_CHARS_MAX) return true;
  return (trimmed.match(/[.!?]\s/g) || []).length >= SENTENCE_MIN;
}

/**
 * Assert no transcript content appears anywhere in a decoded payload.
 * Walks arrays and objects, reporting the exact path of the first violation.
 */
export function assertNoTranscriptFields(value, path = '$') {
  if (Array.isArray(value)) {
    assert.ok(
      !looksLikeCueArray(value),
      `LANE B SHAPE LEAK: '${path}' is an array of timed caption cues`,
    );
    value.forEach((v, i) => assertNoTranscriptFields(v, `${path}[${i}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;

  // A single cue object (not just an array of them) is a leak.
  assert.ok(
    !looksLikeCueObject(value),
    `LANE B SHAPE LEAK: '${path}' is a timed caption cue object`,
  );

  for (const [k, v] of Object.entries(value)) {
    const key = k.toLowerCase();
    assert.ok(
      !TRANSCRIPT_CONTAINER_FIELDS.includes(key),
      `LANE B SHAPE LEAK: '${path}.${k}' is a transcript-bearing container field`,
    );

    // The size gate fires on ANY key name. This is the check that closes the
    // "rename the field and walk through" hole proved by the hostile probe.
    if (typeof v === 'string' && v.length > TRANSCRIPT_CHARS_MAX) {
      throw new assert.AssertionError({
        message: `LANE B SHAPE LEAK: '${path}.${k}' carries a ${v.length}-char string `
          + `— transcript-scale content under any key name is a leak`,
      });
    }

    if (PROSE_FIELDS.includes(key) && looksLikeTranscriptText(v)) {
      throw new assert.AssertionError({
        message: `LANE B SHAPE LEAK: '${path}.${k}' carries transcript-scale text `
          + `(${typeof v === 'string' ? `${v.length} chars` : typeof v})`,
      });
    }
    assertNoTranscriptFields(v, `${path}.${k}`);
  }
}
