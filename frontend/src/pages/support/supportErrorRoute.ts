/**
 * Build and parse a privacy-safe error-boundary handoff to the Report Room.
 */
const SAFE_CODE = /^[A-Z0-9_-]{1,80}$/;

function safePath(value: string): string | null {
  try {
    const parsed = value.startsWith('/')
      ? new URL(value, 'https://support.invalid')
      : new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.pathname.startsWith('/') ? parsed.pathname.slice(0, 500) : null;
  } catch {
    return null;
  }
}

export interface SupportErrorContext {
  source: 'error_boundary';
  path?: string;
  errorCode?: string;
}

export function buildSupportErrorRoute(locationValue: string, code: string): string {
  const params = new URLSearchParams({ source: 'error_boundary' });
  const path = safePath(locationValue);
  if (path) params.set('path', path);
  if (SAFE_CODE.test(code)) params.set('code', code);
  return `/support?${params.toString()}`;
}

export function parseSupportErrorContext(params: URLSearchParams): SupportErrorContext | null {
  if (params.get('source') !== 'error_boundary') return null;
  const path = safePath(params.get('path') ?? '');
  const candidateCode = params.get('code') ?? '';
  return {
    source: 'error_boundary',
    ...(path ? { path } : {}),
    ...(SAFE_CODE.test(candidateCode) ? { errorCode: candidateCode } : {}),
  };
}