/**
 * Safe exercise catalog video samples.
 *
 * Converts VideoCatalog rows into client-safe demo metadata shared by the
 * Workout Rolodex, Content Studio coverage, and Bootcamp floor mode.
 */

import { Sequelize } from 'sequelize';

const SAMPLE_ATTRIBUTES = [
  'exerciseId',
  'title',
  'source',
  'youtubeVideoId',
  'thumbnailUrl',
  'durationSeconds',
  'videoUrl',
];

const cleanString = (value) => (
  typeof value === 'string' && value.trim() ? value.trim() : null
);

const cleanPublicUrl = (value) => {
  const candidate = cleanString(value);
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
};

const cleanYoutubeVideoId = (value) => {
  const candidate = cleanString(value);
  return candidate && /^[a-zA-Z0-9_-]{6,20}$/.test(candidate) ? candidate : null;
};

const cleanYoutubeUrl = (value) => {
  const candidate = cleanPublicUrl(value);
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    const host = parsed.hostname.toLowerCase();
    return host === 'youtube.com'
      || host.endsWith('.youtube.com')
      || host === 'youtu.be'
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
};

const toDurationSeconds = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

function getVideoSampleAttributes(VideoCatalog) {
  const available = VideoCatalog?.rawAttributes ? new Set(Object.keys(VideoCatalog.rawAttributes)) : null;
  return SAMPLE_ATTRIBUTES.filter(attribute => !available || available.has(attribute));
}

function buildVideoSampleOrder(VideoCatalog) {
  const available = VideoCatalog?.rawAttributes ? new Set(Object.keys(VideoCatalog.rawAttributes)) : null;
  const order = [];
  if (!available || available.has('publishedAt')) order.push(['publishedAt', 'DESC']);
  if (!available || available.has('created_at')) order.push(['created_at', 'DESC']);
  if (!available || available.has('createdAt')) order.push(['createdAt', 'DESC']);
  return order;
}

export function buildCatalogVideoSample(rawSample) {
  if (!rawSample) return null;

  const source = cleanString(rawSample.source)?.toLowerCase() ?? null;
  const youtubeVideoId = cleanYoutubeVideoId(rawSample.youtubeVideoId);
  const generatedYoutubeUrl = source === 'youtube' && youtubeVideoId
    ? `https://www.youtube.com/watch?v=${youtubeVideoId}`
    : null;
  const existingYoutubeUrl = source === 'youtube' ? cleanYoutubeUrl(rawSample.videoUrl) : null;
  const hasVideoUrl = Boolean(generatedYoutubeUrl || existingYoutubeUrl);

  return {
    title: cleanString(rawSample.title),
    source,
    videoUrl: generatedYoutubeUrl || existingYoutubeUrl,
    thumbnailUrl: hasVideoUrl ? cleanPublicUrl(rawSample.thumbnailUrl) : null,
    durationSeconds: toDurationSeconds(rawSample.durationSeconds),
  };
}

export async function getCatalogVideoSamplesByExercise(VideoCatalog, options = {}) {
  if (!VideoCatalog?.findAll) return {};

  const exerciseIds = Array.isArray(options.exerciseIds)
    ? options.exerciseIds.filter(id => id !== null && id !== undefined && id !== '')
    : [];
  const where = {
    exerciseId: { [Sequelize.Op.ne]: null },
    status: 'published',
  };
  if (exerciseIds.length > 0) {
    where.exerciseId = { [Sequelize.Op.in]: exerciseIds };
  }

  try {
    const samples = await VideoCatalog.findAll({
      where,
      attributes: getVideoSampleAttributes(VideoCatalog),
      order: buildVideoSampleOrder(VideoCatalog),
      raw: true,
    });

    return samples.reduce((acc, row) => {
      if (!row.exerciseId || acc[row.exerciseId]) return acc;
      const sample = buildCatalogVideoSample(row);
      if (sample?.videoUrl) acc[row.exerciseId] = sample;
      return acc;
    }, {});
  } catch {
    return {};
  }
}
