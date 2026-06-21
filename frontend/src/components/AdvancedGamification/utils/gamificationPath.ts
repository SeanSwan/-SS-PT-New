const USER_ID_SEGMENT_PATTERN = /^[1-9]\d*$/;

export const GAMIFICATION_SAFE_ERROR_COPY = 'Gamification system is temporarily unavailable.';

export function getSafeGamificationUserSegment(userId: unknown) {
  const value = typeof userId === 'number' ? String(userId) : typeof userId === 'string' ? userId.trim() : '';
  if (!USER_ID_SEGMENT_PATTERN.test(value)) return null;
  return Number.isSafeInteger(Number(value)) ? value : null;
}

export function getGamificationUserPath(userId: unknown, suffix: string) {
  const userSegment = getSafeGamificationUserSegment(userId);
  if (!userSegment) return null;
  const safeSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`;
  return `/users/${userSegment}${safeSuffix}`;
}
