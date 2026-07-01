/**
 * Helpers for carrying a completed Swan Coach debate into Build Plan routes.
 */

const SAFE_DEBATE_JOB_ID = /^debate_[A-Za-z0-9_-]{3,128}$/;

export const parseWorkoutPlannerDebateJobId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return SAFE_DEBATE_JOB_ID.test(trimmed) ? trimmed : null;
};

export const appendWorkoutPlannerDebateJobId = (route: string | null | undefined, jobId: unknown): string | null => {
  const safeJobId = parseWorkoutPlannerDebateJobId(jobId);
  if (!route || !safeJobId) return route ?? null;

  const [pathWithSearch, hash = ''] = route.split('#', 2);
  const [path, search = ''] = pathWithSearch.split('?', 2);
  if (!/^\/dashboard\/(admin|trainer)\/workout-planner\/?$/.test(path)) return route;

  const params = new URLSearchParams(search);
  params.set('debateJobId', safeJobId);
  const query = params.toString();
  return `${path}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
};