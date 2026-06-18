/**
 * ============================================================================
 * FILE: TeachModeSidebar.videoAsset.ts
 * PURPOSE: Safe video asset selection for Workout Planner Teach Mode.
 * ============================================================================
 *
 * Keeps custom exercise videos and catalog fallback samples usable while refusing
 * unsafe URL schemes before a video is rendered inside the Teach Mode panel.
 */
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import type { ExerciseTeachData } from '../../../../features/teach-mode/types/TeachModeContracts';

export interface TeachModeVideoAsset {
  videoUrl: string;
  thumbnailUrl: string | null;
  sourceLabel: 'Custom video' | 'Catalog video';
}

const SAFE_ABSOLUTE_PROTOCOLS = new Set(['http:', 'https:']);

const textValue = (value: unknown): string | null => (
  typeof value === 'string' && value.trim() ? value.trim() : null
);

export const isSafeTeachModeMediaUrl = (value: unknown): value is string => {
  const raw = textValue(value);
  if (!raw) return false;
  if (raw.startsWith('/') && !raw.startsWith('//')) return true;

  try {
    return SAFE_ABSOLUTE_PROTOCOLS.has(new URL(raw).protocol);
  } catch {
    return false;
  }
};

const firstSafeMediaUrl = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (isSafeTeachModeMediaUrl(value)) return textValue(value);
  }
  return null;
};

export const buildTeachModeVideoAsset = (
  teachData?: Partial<ExerciseTeachData> | null,
  exercise?: ExerciseSlim | null,
): TeachModeVideoAsset | null => {
  if (!exercise) return null;

  const catalogSample = exercise.catalogVideoSample;
  const customVideoUrl = firstSafeMediaUrl(teachData?.videoUrl, exercise.videoUrl);
  const catalogVideoUrl = firstSafeMediaUrl(catalogSample?.videoUrl);
  const videoUrl = customVideoUrl || catalogVideoUrl;

  if (!videoUrl) return null;

  return {
    videoUrl,
    thumbnailUrl: firstSafeMediaUrl(
      teachData?.thumbnailUrl,
      exercise.thumbnailUrl,
      teachData?.imageUrl,
      exercise.imageUrl,
      catalogSample?.thumbnailUrl,
    ),
    sourceLabel: customVideoUrl ? 'Custom video' : 'Catalog video',
  };
};
