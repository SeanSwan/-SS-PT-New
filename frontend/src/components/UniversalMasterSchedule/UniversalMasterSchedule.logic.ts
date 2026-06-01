export const parseScheduleUserId = (value: string | number | null | undefined): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  const trimmedValue = value?.trim();
  if (!trimmedValue || !/^[1-9]\d*$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
};

export const normalizeScheduleOptionalId = (
  value: string | number | null | undefined
): number | null | undefined => {
  if (value == null) return undefined;

  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return parseScheduleUserId(value);
};
