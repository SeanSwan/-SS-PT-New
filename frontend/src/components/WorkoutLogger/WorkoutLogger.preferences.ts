/**
 * WorkoutLogger.preferences
 * -------------------------
 * Small, persisted operator preferences for the logger shell. Kept out of the
 * 1200-line component so the shell stays lean (Rule 4) and the localStorage
 * access is testable in isolation.
 *
 * Quick Log preference persists across mounts so a trainer who prefers the
 * fast 1-set-at-a-time view isn't reset to Full Mode every session. Keyed
 * GLOBALLY (not per client) so it follows the operator, not the client record.
 */

const QUICK_LOG_MODE_KEY = 'ss-workout-logger-quick-mode';

export const readQuickLogPreference = (): boolean => {
  try {
    return typeof window !== 'undefined'
      && window.localStorage.getItem(QUICK_LOG_MODE_KEY) === '1';
  } catch {
    return false;
  }
};

export const writeQuickLogPreference = (value: boolean): void => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(QUICK_LOG_MODE_KEY, value ? '1' : '0');
    }
  } catch {
    // localStorage can throw in private mode / when quota is exceeded; the
    // preference is a nicety, never block logging on it.
  }
};
