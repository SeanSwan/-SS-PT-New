/**
 * FILE: companionPetNumbers.ts
 * PURPOSE: Shared numeric display guards for mounted companion pet health UI.
 */

const DECIMAL_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;

export const parsePetNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value !== 'string') return fallback;

  const trimmed = value.trim();
  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) return fallback;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizePetPercent = (value: unknown): number => (
  Math.min(100, Math.max(0, parsePetNumber(value, 0)))
);
