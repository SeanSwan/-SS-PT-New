export const NUTRITION_GENTLE_MODE_STORAGE_KEY = 'ss-nutrition-gentle-mode';

export const readNutritionGentleModePreference = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(NUTRITION_GENTLE_MODE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const writeNutritionGentleModePreference = (enabled: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NUTRITION_GENTLE_MODE_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Storage can be unavailable in private or embedded contexts; UI state still works.
  }
};
