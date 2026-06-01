/**
 * WorkoutBuilderPage.logic
 * ------------------------
 * Pure helpers for the active /workout-builder surface. Keeping identity
 * parsing here lets the page stay lean and gives tests a stable contract.
 */

export const parsePositiveClientId = (value: string | null | undefined): number | null => {
  const rawClientId = value?.trim();
  if (!rawClientId || !/^[1-9]\d*$/.test(rawClientId)) return null;

  const parsedClientId = Number(rawClientId);
  return Number.isSafeInteger(parsedClientId) ? parsedClientId : null;
};
