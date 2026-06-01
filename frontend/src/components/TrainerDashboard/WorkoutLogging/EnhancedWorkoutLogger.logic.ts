export const normalizeDashboardReturnTo = (raw: string | null): string | null => {
  const isProtocolRelative = Boolean(raw && raw[0] === '/' && raw[1] === '/');
  const hasUnsafeCharacters = Boolean(raw && /[\r\n\t\\]/.test(raw));

  if (!raw || isProtocolRelative || hasUnsafeCharacters || !raw.startsWith('/dashboard/')) {
    return null;
  }

  return raw;
};

export const buildClientHubWorkoutCompleteReturnPath = (returnPath: string): string => {
  const [pathAndQuery, hash = ''] = returnPath.split('#');
  const [pathname, query = ''] = pathAndQuery.split('?');

  if (pathname !== '/dashboard/admin/client-management') return returnPath;

  const params = new URLSearchParams(query);
  params.set('tab', 'training');
  params.set('trainingSection', 'history');

  const search = params.toString();
  return `${pathname}${search ? `?${search}` : ''}${hash ? `#${hash}` : ''}`;
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
