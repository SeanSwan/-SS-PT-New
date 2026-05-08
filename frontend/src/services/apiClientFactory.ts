import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { logger } from '@/utils/logger';
import {
  createAuthSessionExpiredError,
  isPublicAuthRequest,
  shouldFailClosedForExpiredSession,
} from './authRequestPolicy';
import { ProductionTokenManager } from './productionTokenManager';

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

      if (token && !isPublicAuthRequest(config.url)) {
        if (ProductionTokenManager.isTokenExpired(token)) {
          logger.log('[API] Token is expired, attempting refresh...');

          const hasRefreshToken = !!ProductionTokenManager.getRefreshToken();
          if (shouldFailClosedForExpiredSession(config.url, true, hasRefreshToken)) {
            ProductionTokenManager.clearAuthData();
            redirectToLoginOnce();
            return Promise.reject(createAuthSessionExpiredError(config));
          }

          const newToken = await ProductionTokenManager.refreshAccessToken(apiBaseUrl);

          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`;
          } else {
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
    async (error: AxiosError) => {
      const originalRequest = error.config as any;
      const isCanceledRequest =
        error.code === 'ERR_CANCELED'
        || error.name === 'CanceledError'
        || error.message === 'canceled'
        || axios.isCancel(error);

      if (isCanceledRequest) {
        return Promise.reject(error);
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const errorData = error.response.data as any;

        if (errorData?.errorCode === 'TOKEN_EXPIRED' || errorData?.message?.includes('expired')) {
          logger.log('[API] Token expired, attempting refresh...');

          const newToken = await ProductionTokenManager.refreshAccessToken(apiBaseUrl);

          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return client(originalRequest);
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

      const errorData = error.response?.data as any;
      if (errorData?.degraded === true) {
        (error as any).isDegraded = true;
      }

      const isNotificationsEndpoint = originalRequest?.url?.includes('/notifications');
      const is503Error = error.response?.status === 503;

      if (!(isNotificationsEndpoint && is503Error)) {
        console.error('[API] Response error:', {
          status: error.response?.status,
          message: error.message,
          url: originalRequest?.url
        });
      }

      if (error.response?.status === 402) {
        const data = error.response.data as any;
        const isBackground = originalRequest?._isBackgroundRequest === true;

        if (!isBackground && paywallTrigger) {
          const featureName = data?.featureName || 'Premium Feature';
          paywallTrigger(featureName, data);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};
