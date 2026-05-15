/**
 * plaudClipGroupService.mjs
 * ==========================
 * Read-only grouping hints for PLAUD/APPLAUD clips waiting to be merged.
 * Groups are suggestions only; the merge endpoint remains the source of truth.
 */
import { createHash } from 'node:crypto';
import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 25;
const DEFAULT_MAX_GAP_MINUTES = 90;
const MAX_CLIPS_PER_GROUP = 5;

function normalizeLimit(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, parsed));
}

function normalizeGap(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_GAP_MINUTES;
  return Math.min(240, Math.max(10, parsed));
}

function normalizeMaxClips(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return MAX_CLIPS_PER_GROUP;
  return Math.min(MAX_CLIPS_PER_GROUP, Math.max(1, parsed));
}

function parseTime(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function minutesBetweenMs(left, right) {
  const delta = Math.abs(right - left);
  return Number.isFinite(delta) ? Math.round(delta / 60000) : 0;
}

function sourceLabel(source) {
  if (source === 'applaud_local_sync') return 'APPLAUD sync';
  if (source === 'applaud_webhook') return 'Applaud';
  return 'Manual upload';
}

function mapRowToClip(row) {
  const recordedMs = parseTime(row.recorded_at);
  const uploadedMs = parseTime(row.uploaded_at);
  const timelineMs = recordedMs ?? uploadedMs;
  if (timelineMs == null) return null;
  return {
    clipId: row.clip_id,
    durationSec: row.duration_sec == null ? null : Number(row.duration_sec),
    sizeBytes: row.size_bytes == null ? null : Number(row.size_bytes),
    clipSource: row.clip_source || 'manual_upload',
    sourceLabel: sourceLabel(row.clip_source),
    recordedAt: row.recorded_at || null,
    uploadedAt: row.uploaded_at || null,
    timelineAt: new Date(timelineMs).toISOString(),
    timelineMs,
    timelineSource: recordedMs == null ? 'uploaded_at' : 'recorded_at',
  };
}

function confidenceFor(clips, maxGapMinutes) {
  const hasRecorded = clips.some((clip) => clip.timelineSource === 'recorded_at');
  const allRecorded = clips.every((clip) => clip.timelineSource === 'recorded_at');
  const largestGap = maxGapFor(clips);
  if (allRecorded && largestGap <= Math.min(60, maxGapMinutes)) return 'high';
  if (hasRecorded) return 'medium';
  return 'low';
}

function maxGapFor(clips) {
  let maxGap = 0;
  for (let i = 1; i < clips.length; i += 1) {
    maxGap = Math.max(maxGap, minutesBetweenMs(clips[i - 1].timelineMs, clips[i].timelineMs));
  }
  return maxGap;
}

function groupLabel(clips) {
  const labels = [...new Set(clips.map((clip) => clip.sourceLabel))];
  return labels.length === 1 ? labels[0] : 'Mixed audio';
}

function toCandidate(clips, index, maxGapMinutes) {
  const clipIds = clips.map((clip) => clip.clipId);
  const startedAt = clips[0].timelineAt;
  const endedAt = clips[clips.length - 1].timelineAt;
  const groupId = createHash('sha1').update(clipIds.join('|')).digest('hex').slice(0, 16);
  const allRecorded = clips.every((clip) => clip.timelineSource === 'recorded_at');
  const anyRecorded = clips.some((clip) => clip.timelineSource === 'recorded_at');
  return {
    groupId,
    title: `${groupLabel(clips)} group ${index + 1}`,
    clipIds,
    clipCount: clips.length,
    startedAt,
    endedAt,
    spanMinutes: minutesBetweenMs(clips[0].timelineMs, clips[clips.length - 1].timelineMs),
    maxGapMinutes: maxGapFor(clips),
    timelineAtSource: allRecorded ? 'recorded_at' : anyRecorded ? 'mixed' : 'uploaded_at',
    confidence: confidenceFor(clips, maxGapMinutes),
    sourceMix: [...new Set(clips.map((clip) => clip.clipSource))],
    clips: clips.map(({ timelineMs, ...clip }) => clip),
  };
}

export function buildPlaudClipGroupCandidates(rows, {
  maxGapMinutes = DEFAULT_MAX_GAP_MINUTES,
  maxClipsPerGroup = MAX_CLIPS_PER_GROUP,
} = {}) {
  const normalizedGap = normalizeGap(maxGapMinutes);
  const normalizedMaxClips = normalizeMaxClips(maxClipsPerGroup);
  const clips = rows
    .map(mapRowToClip)
    .filter(Boolean)
    .sort((a, b) => a.timelineMs - b.timelineMs || a.clipId.localeCompare(b.clipId));
  const groups = [];
  let current = [];

  for (const clip of clips) {
    const previous = current[current.length - 1];
    const gap = previous ? minutesBetweenMs(previous.timelineMs, clip.timelineMs) : 0;
    const dayChanged = previous ? dayKey(previous.timelineMs) !== dayKey(clip.timelineMs) : false;
    const full = current.length >= normalizedMaxClips;
    if (current.length > 0 && (full || dayChanged || gap > normalizedGap)) {
      groups.push(current);
      current = [];
    }
    current.push(clip);
  }
  if (current.length > 0) groups.push(current);
  return groups.map((group, index) => toCandidate(group, index, normalizedGap));
}

export async function listPlaudClipGroupCandidates({
  userId,
  limit,
  maxGapMinutes,
  sequelizeOverride = null,
} = {}) {
  const normalizedLimit = normalizeLimit(limit);
  const normalizedGap = normalizeGap(maxGapMinutes);
  const sequelizeToUse = sequelizeOverride || sequelize;
  const rows = await sequelizeToUse.query(
    `SELECT clip_id, duration_sec, size_bytes, clip_source, recorded_at, uploaded_at
     FROM plaud_clips
     WHERE user_id = :userId
       AND status = 'pending_merge'
       AND deleted_at IS NULL
       AND expires_at > NOW()
     ORDER BY COALESCE(recorded_at, uploaded_at) ASC, uploaded_at ASC, clip_id ASC
     LIMIT :queryLimit`,
    {
      replacements: { userId, queryLimit: normalizedLimit * MAX_CLIPS_PER_GROUP },
      type: QueryTypes.SELECT,
    },
  );
  return {
    groups: buildPlaudClipGroupCandidates(rows, { maxGapMinutes: normalizedGap }).slice(0, normalizedLimit),
    limit: normalizedLimit,
    maxGapMinutes: normalizedGap,
  };
}

export const _internal = {
  normalizeLimit,
  normalizeGap,
  normalizeMaxClips,
  mapRowToClip,
};
