/**
 * Workout Plan PDF Key Service
 * ============================
 *
 * Shared storage-key validation for private workout-plan PDF objects.
 */

const WORKOUT_PLAN_PDF_PREFIX = 'workout-plans/';

export const slugifyWorkoutPlanPdfSegment = (value, fallback) => {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
  return slug || fallback;
};

export const normalizeWorkoutPlanPdfStorageKey = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const key = value.trim().replace(/^\/+/, '');
  if (
    !key.startsWith(WORKOUT_PLAN_PDF_PREFIX)
    || !/\.pdf$/i.test(key)
    || /[\0\r\n\t]/.test(key)
    || key.includes('\\')
    || key.split('/').some((part) => part === '..' || part === '')
  ) {
    return null;
  }
  return key;
};

export const workoutPlanPdfStorageKeyMatchesPlan = (storageKey, planId) => {
  const key = normalizeWorkoutPlanPdfStorageKey(storageKey);
  if (!key || planId === undefined || planId === null || String(planId).trim() === '') return false;

  const planSegment = slugifyWorkoutPlanPdfSegment(planId, 'plan');
  const fileName = key.split('/').pop() || '';
  return fileName === `${planSegment}.pdf` || fileName.startsWith(`${planSegment}-`);
};
