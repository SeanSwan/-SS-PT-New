import type { AxiosRequestConfig } from 'axios';

export const AUTH_SESSION_EXPIRED_CODE = 'AUTH_SESSION_EXPIRED';

export interface AuthSessionExpiredError extends Error {
  code: typeof AUTH_SESSION_EXPIRED_CODE;
  isAuthSessionExpired: true;
  config?: AxiosRequestConfig;
}

const PUBLIC_AUTH_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/force-change-password',
  '/api/auth/refresh-token',
  '/api/health',
]);

export const normalizeApiPath = (url?: string): string => {
  if (!url) return '';

  try {
    return new URL(url, 'https://sswanstudios.com').pathname;
  } catch {
    return url.split('?')[0] || '';
  }
};

export const isPublicAuthRequest = (url?: string): boolean => {
  const path = normalizeApiPath(url);
  return PUBLIC_AUTH_PATHS.has(path);
};

export const shouldFailClosedForExpiredSession = (
  url: string | undefined,
  hadAccessToken: boolean,
  hasRefreshToken: boolean,
): boolean => {
  return hadAccessToken && !hasRefreshToken && !isPublicAuthRequest(url);
};

export const createAuthSessionExpiredError = (
  config?: AxiosRequestConfig,
): AuthSessionExpiredError => {
  const error = new Error('Authentication session expired. Please sign in again.') as AuthSessionExpiredError;
  error.code = AUTH_SESSION_EXPIRED_CODE;
  error.isAuthSessionExpired = true;
  error.config = config;
  return error;
};
