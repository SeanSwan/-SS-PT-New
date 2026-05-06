/**
 * plaudMergeDateSplitService.mjs
 * ==============================
 * Review-path adapter for deterministic PLAUD transcript date splitting.
 * Chooses the best available timeline anchor from decrypted merge metadata
 * and delegates actual transcript splitting to plaudTranscriptSplitterService.
 */
import {
  splitPlaudTranscriptIntoWorkoutCandidates,
} from './plaudTranscriptSplitterService.mjs';

const DEFAULT_TIME_ZONE = 'America/Los_Angeles';

function isValidIso(value) {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function earliestIso(values) {
  return values
    .filter(isValidIso)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] || null;
}

function normalizeTimeZone(rawTimeZone) {
  const candidate = rawTimeZone || DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate });
    return candidate;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

function timelineReference(payload) {
  const clipTimeline = Array.isArray(payload?.clipTimeline) ? payload.clipTimeline : [];
  const recordedAt = earliestIso(clipTimeline.map((clip) => clip?.recordedAt));
  if (recordedAt) {
    return { referenceIso: recordedAt, referenceSource: 'clip_timeline_recorded_at' };
  }

  const uploadedAt = earliestIso(clipTimeline.map((clip) => clip?.uploadedAt));
  if (uploadedAt) {
    return { referenceIso: uploadedAt, referenceSource: 'clip_timeline_uploaded_at' };
  }
  return null;
}

function rowReference(row) {
  if (isValidIso(row?.completed_at)) {
    return { referenceIso: row.completed_at, referenceSource: 'merge_request_completed_at' };
  }
  if (isValidIso(row?.created_at)) {
    return { referenceIso: row.created_at, referenceSource: 'merge_request_created_at' };
  }
  return { referenceIso: new Date().toISOString(), referenceSource: 'server_now' };
}

export function buildPlaudMergeDateSplitCandidates({
  payload,
  row,
  timeZone = DEFAULT_TIME_ZONE,
} = {}) {
  const reference = timelineReference(payload) || rowReference(row);
  const normalizedTimeZone = normalizeTimeZone(timeZone);
  return splitPlaudTranscriptIntoWorkoutCandidates({
    transcript: payload?.transcript || '',
    referenceIso: reference.referenceIso,
    timeZone: normalizedTimeZone,
    referenceSource: reference.referenceSource,
  });
}

export const _internal = {
  earliestIso,
  isValidIso,
  normalizeTimeZone,
  rowReference,
  timelineReference,
};
