export const normalizeDashboardReturnTo = (raw: string | null): string | null => {
  const isProtocolRelative = Boolean(raw && raw[0] === '/' && raw[1] === '/');

  if (!raw || isProtocolRelative || !raw.startsWith('/dashboard/')) {
    return null;
  }

  return raw;
};

export const parseLoggerClientId = (value: string | number | null | undefined): number | null => {
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

export const parseLoggerSessionId = (value: string | null | undefined): string | null => {
  const parsedValue = parseLoggerClientId(value);
  return parsedValue ? String(parsedValue) : null;
};
