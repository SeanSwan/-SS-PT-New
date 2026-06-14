/**
 * Content Studio coverage service.
 *
 * Keeps exercise video coverage aligned with the shared WorkoutLogger Rolodex
 * contract so Content Studio, Bootcamp demo mode, and Swan Coach all read the
 * same exercise media fields.
 */

import { Sequelize } from 'sequelize';
import {
  formatLibraryExercise,
  getLibraryAttributes,
  getLibraryWhere,
} from './exerciseLibraryContract.mjs';

export const getCoverageExerciseAttributes = (Exercise) => getLibraryAttributes(Exercise);

const toCount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const roundPercent = (covered, total) => (
  total > 0 ? Math.round((covered / total) * 1000) / 10 : 0
);

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

const toDurationSeconds = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const buildOrder = (Exercise) => {
  const available = Exercise?.rawAttributes ? new Set(Object.keys(Exercise.rawAttributes)) : null;
  const order = [];
  if (!available || available.has('bodyPartCategory')) order.push(['bodyPartCategory', 'ASC']);
  order.push(['name', 'ASC']);
  return order;
};

function buildCatalogVideoSample(rawSample) {
  if (!rawSample) return null;

  const source = cleanString(rawSample.source);
  const youtubeVideoId = cleanYoutubeVideoId(rawSample.youtubeVideoId);
  const isYoutube = source === 'youtube' && youtubeVideoId;

  return {
    title: cleanString(rawSample.title),
    source,
    videoUrl: isYoutube ? `https://www.youtube.com/watch?v=${youtubeVideoId}` : null,
    thumbnailUrl: isYoutube ? cleanPublicUrl(rawSample.thumbnailUrl) : null,
    durationSeconds: toDurationSeconds(rawSample.durationSeconds),
  };
}

export function buildContentStudioCoveragePayload(
  exercises = [],
  videoCounts = {},
  catalogVideoSamples = {},
) {
  const coverage = exercises.map((rawExercise) => {
    const exercise = formatLibraryExercise(rawExercise);
    const catalogVideoCount = toCount(videoCounts[exercise.id]);
    const catalogVideoSample = buildCatalogVideoSample(catalogVideoSamples[exercise.id]);
    const hasLegacyVideo = Boolean(exercise.videoUrl);
    const mediaPreviewUrl = exercise.thumbnailUrl
      || exercise.imageUrl
      || catalogVideoSample?.thumbnailUrl
      || null;

    return {
      id: exercise.id,
      name: exercise.name,
      exerciseKey: exercise.exerciseKey,
      exerciseType: exercise.exerciseType,
      bodyPartCategory: exercise.bodyPartCategory || 'Unknown',
      primaryMuscles: exercise.primaryMuscles,
      difficulty: exercise.difficulty,
      source: exercise.source,
      videoUrl: exercise.videoUrl,
      imageUrl: exercise.imageUrl,
      thumbnailUrl: exercise.thumbnailUrl,
      mediaPreviewUrl,
      hasLegacyVideo,
      catalogVideoCount,
      catalogVideoSample,
      covered: hasLegacyVideo || catalogVideoCount > 0,
    };
  });

  const totalExercises = coverage.length;
  const coveredCount = coverage.filter(exercise => exercise.covered).length;
  const gapCount = totalExercises - coveredCount;
  const byBodyPart = {};

  coverage.forEach((exercise) => {
    const bodyPart = exercise.bodyPartCategory || 'Unknown';
    if (!byBodyPart[bodyPart]) byBodyPart[bodyPart] = { total: 0, covered: 0, gaps: 0 };
    byBodyPart[bodyPart].total += 1;
    if (exercise.covered) byBodyPart[bodyPart].covered += 1;
    else byBodyPart[bodyPart].gaps += 1;
  });

  return {
    summary: {
      totalExercises,
      coveredCount,
      gapCount,
      coveragePercent: roundPercent(coveredCount, totalExercises),
    },
    byBodyPart,
    exercises: coverage,
  };
}

async function getVideoCountsByExercise(VideoCatalog) {
  if (!VideoCatalog?.findAll) return {};
  try {
    const counts = await VideoCatalog.findAll({
      where: {
        exerciseId: { [Sequelize.Op.ne]: null },
        status: 'published',
      },
      attributes: [
        'exerciseId',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'videoCount'],
      ],
      group: ['exerciseId'],
      raw: true,
    });

    return counts.reduce((acc, row) => {
      acc[row.exerciseId] = toCount(row.videoCount);
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function getVideoSampleAttributes(VideoCatalog) {
  const available = VideoCatalog?.rawAttributes ? new Set(Object.keys(VideoCatalog.rawAttributes)) : null;
  return [
    'exerciseId',
    'title',
    'source',
    'youtubeVideoId',
    'thumbnailUrl',
    'durationSeconds',
  ].filter(attribute => !available || available.has(attribute));
}

function buildVideoSampleOrder(VideoCatalog) {
  const available = VideoCatalog?.rawAttributes ? new Set(Object.keys(VideoCatalog.rawAttributes)) : null;
  const order = [];
  if (!available || available.has('publishedAt')) order.push(['publishedAt', 'DESC']);
  if (!available || available.has('created_at')) order.push(['created_at', 'DESC']);
  if (!available || available.has('createdAt')) order.push(['createdAt', 'DESC']);
  return order;
}

async function getCatalogVideoSamplesByExercise(VideoCatalog) {
  if (!VideoCatalog?.findAll) return {};
  try {
    const samples = await VideoCatalog.findAll({
      where: {
        exerciseId: { [Sequelize.Op.ne]: null },
        status: 'published',
      },
      attributes: getVideoSampleAttributes(VideoCatalog),
      order: buildVideoSampleOrder(VideoCatalog),
      raw: true,
    });

    return samples.reduce((acc, row) => {
      if (row.exerciseId && !acc[row.exerciseId]) acc[row.exerciseId] = row;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export async function loadContentStudioCoveragePayload({ Exercise, VideoCatalog } = {}) {
  if (!Exercise?.findAll) {
    throw new Error('Exercise model not available');
  }

  const [exercises, videoCounts, catalogVideoSamples] = await Promise.all([
    Exercise.findAll({
      where: getLibraryWhere(Exercise),
      attributes: getCoverageExerciseAttributes(Exercise),
      order: buildOrder(Exercise),
      raw: true,
    }),
    getVideoCountsByExercise(VideoCatalog),
    getCatalogVideoSamplesByExercise(VideoCatalog),
  ]);

  return buildContentStudioCoveragePayload(exercises, videoCounts, catalogVideoSamples);
}

export function buildSwanCoachCoveragePromptBlock(payload) {
  const summary = payload?.summary;
  if (!summary || summary.totalExercises <= 0) return '';

  const gapLines = Object.entries(payload.byBodyPart || {})
    .map(([bodyPart, data]) => ({
      bodyPart,
      gaps: toCount(data.gaps ?? ((data.total || 0) - (data.covered || 0))),
    }))
    .filter(item => item.gaps > 0)
    .sort((a, b) => b.gaps - a.gaps || a.bodyPart.localeCompare(b.bodyPart))
    .slice(0, 5)
    .map(item => `${item.bodyPart}: ${item.gaps} gap${item.gaps === 1 ? '' : 's'}`);

  const gapSummary = gapLines.length > 0 ? gapLines.join(', ') : 'none';

  return `
--- CONTENT STUDIO EXERCISE VIDEO COVERAGE ---
${summary.coveredCount}/${summary.totalExercises} exercises have recorded demo coverage (${summary.coveragePercent}%).
Top video gaps by body part: ${gapSummary}.
Prefer video-covered exercises for floor mode and bootcamp demo mode when the training outcome stays the same; never choose a weaker exercise only because it has a video.
--- END CONTENT STUDIO COVERAGE ---`;
}

export async function buildSwanCoachCoveragePromptBlockFromModels() {
  const { getAllModels } = await import('../models/index.mjs');
  const { Exercise, VideoCatalog } = getAllModels();
  if (!Exercise) return '';
  const payload = await loadContentStudioCoveragePayload({ Exercise, VideoCatalog });
  return buildSwanCoachCoveragePromptBlock(payload);
}
