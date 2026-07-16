import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { logger } from '@/utils/logger';
import {
  createAuthSessionExpiredError,
  isPublicAuthRequest,
  shouldFailClosedForExpiredSession,
} from './authRequestPolicy';
import { ProductionTokenManager } from './productionTokenManager';
import { getBrowserTimeZoneHeader } from './clientTimeZoneHeader';
import { restoreAdminSessionFromImpersonation } from '../utils/adminImpersonationSession';

type PaywallTriggerFn = (featureName: string, data?: Record<string, unknown>) => void;

let paywallTrigger: PaywallTriggerFn | null = null;
let authRedirectStarted = false;

export function registerPaywallTrigger(fn: PaywallTriggerFn) { paywallTrigger = fn; }
export function unregisterPaywallTrigger() { paywallTrigger = null; }

const redirectToLoginOnce = () => {
  if (authRedirectStarted || typeof window === 'undefined') return;
  const path = window.location.pathname;

  if (path.includes('/login') || path.includes('/register')) return;

  authRedirectStarted = true;
  window.location.href = '/login';
};

const restoreAdminSessionOnce = () => {
  if (typeof window === 'undefined') return false;
  const restored = restoreAdminSessionFromImpersonation();
  if (!restored) return false;
  if (!authRedirectStarted) {
    authRedirectStarted = true;
    window.location.href = restored.redirectPath || '/dashboard/admin/overview';
  }
  return true;
};

export const createProductionApiClient = (
  apiBaseUrl: string,
  isProduction: boolean,
): AxiosInstance => {
  const client = axios.create({
    baseURL: apiBaseUrl,
    timeout: isProduction ? 30000 : 15000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    withCredentials: true,
  });

  client.interceptors.request.use(
    async (config) => {
      const token = ProductionTokenManager.getToken();
      const clientTimeZone = getBrowserTimeZoneHeader();
      if (clientTimeZone) {
        config.headers['X-Client-Timezone'] = clientTimeZone;
      }

      if (token && !isPublicAuthRequest(config.url)) {
        if (ProductionTokenManager.isTokenExpired(token)) {
          logger.log('[API] Token is expired, attempting refresh...');

          const hasRefreshToken = !!ProductionTokenManager.getRefreshToken();
          if (shouldFailClosedForExpiredSession(config.url, true, hasRefreshToken)) {
            if (restoreAdminSessionOnce()) {
              return Promise.reject(createAuthSessionExpiredError(config));
            }
            ProductionTokenManager.clearAuthData();
            redirectToLoginOnce();
            return Promise.reject(createAuthSessionExpiredError(config));
          }

          const newToken = await ProductionTokenManager.refreshAccessToken(apiBaseUrl);

          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`;
          } else {
            if (restoreAdminSessionOnce()) {
              return Promise.reject(createAuthSessionExpiredError(config));
            }
            redirectToLoginOnce();
            return Promise.reject(createAuthSessionExpiredError(config));
          }
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      if (isProduction) {
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
      }

      return config;
    },
    (error) => {
      console.error('[API] Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  client.interceptors.response.use(
    (response: AxiosResponse) => {
      ProductionTokenManager.resetAuthFailureCount();
      return response;
    },
    async (error: any) => {
      const apiError: any = error;
      const originalRequest = apiError.config as any;
      const isCanceledRequest =
        apiError.code === 'ERR_CANCELED'
        || apiError.name === 'CanceledError'
        || apiError.message === 'canceled'
        || axios.isCancel(apiError);

      if (isCanceledRequest) {
        return Promise.reject(apiError);
      }

      if (apiError.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const errorData = apiError.response.data as any;

        if (errorData?.errorCode === 'TOKEN_EXPIRED' || errorData?.message?.includes('expired')) {
          logger.log('[API] Token expired, attempting refresh...');

          const newToken = await ProductionTokenManager.refreshAccessToken(apiBaseUrl);

          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return client(originalRequest);
          }

          if (restoreAdminSessionOnce()) {
            return Promise.reject(createAuthSessionExpiredError(originalRequest));
          }
          ProductionTokenManager.clearAuthData();
          redirectToLoginOnce();
          return Promise.reject(createAuthSessionExpiredError(originalRequest));
        }

        const shouldRedirect = ProductionTokenManager.incrementAuthFailure();
        if (shouldRedirect) {
          redirectToLoginOnce();
        }
      }

      const errorData = apiError.response?.data as any;
      if (errorData?.degraded === true) {
        apiError.isDegraded = true;
      }

      const isNotificationsEndpoint = originalRequest?.url?.includes('/notifications');
      const is503Error = apiError.response?.status === 503;

      if (!(isNotificationsEndpoint && is503Error)) {
        console.error('[API] Response error:', {
          status: apiError.response?.status,
          message: apiError.message,
          url: originalRequest?.url
        });
      }

      if (apiError.response?.status === 402) {
        const data = apiError.response.data as any;
        const isBackground = originalRequest?._isBackgroundRequest === true;

        if (!isBackground && paywallTrigger) {
          const featureName = data?.featureName || 'Premium Feature';
          paywallTrigger(featureName, data);
        }
      }

      return Promise.reject(apiError);
    }
  );

  return client;
};
