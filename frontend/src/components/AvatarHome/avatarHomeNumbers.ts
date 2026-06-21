const DECIMAL_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;

export const normalizeAvatarHomeLevel = (value: unknown): number | null => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;

  const parsed = typeof value === 'number'
    ? value
    : DECIMAL_NUMBER_PATTERN.test(value.trim())
      ? Number(value.trim())
      : Number.NaN;

  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
};
