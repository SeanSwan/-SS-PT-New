import axios, { AxiosInstance, AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
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
let authRedirectGeneration = -1;

type AdmittedRequest = InternalAxiosRequestConfig & { _authGeneration?: number };
const supersededRequest = (config?: AdmittedRequest) =>
  new axios.CanceledError('Authentication changed while this request was pending.', config);
const hasRetiredAdmission = (config?: AdmittedRequest) =>
  config?._authGeneration !== undefined
  && config._authGeneration !== ProductionTokenManager.getAuthGeneration();

const clearAdmittedAuth = (config: AdmittedRequest) => {
  const invalidationGeneration = ProductionTokenManager.getAuthGeneration() + 1;
  ProductionTokenManager.clearAuthData();
  if (ProductionTokenManager.getAuthGeneration() !== invalidationGeneration) throw supersededRequest(config);
  config._authGeneration = invalidationGeneration;
};

export function registerPaywallTrigger(fn: PaywallTriggerFn) { paywallTrigger = fn; }
export function unregisterPaywallTrigger() { paywallTrigger = null; }

const redirectToLoginOnce = () => {
  if (typeof window === 'undefined') return;
  const generation = ProductionTokenManager.getAuthGeneration();
  if (authRedirectStarted && authRedirectGeneration === generation) return;
  const path = window.location.pathname;

  if (path.includes('/login') || path.includes('/register')) return;

  authRedirectStarted = true;
  authRedirectGeneration = generation;
  window.location.href = '/login';
};

const restoreAdminSessionOnce = () => {
  if (typeof window === 'undefined') return false;
  const restored = restoreAdminSessionFromImpersonation();
  if (!restored) return false;
  const generation = ProductionTokenManager.getAuthGeneration();
  if (!authRedirectStarted || authRedirectGeneration !== generation) {
    authRedirectStarted = true;
    authRedirectGeneration = generation;
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
      if (hasRetiredAdmission(config)) return Promise.reject(supersededRequest(config));
      (config as AdmittedRequest)._authGeneration = ProductionTokenManager.getAuthGeneration();
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
            clearAdmittedAuth(config);
            redirectToLoginOnce();
            return Promise.reject(createAuthSessionExpiredError(config));
          }

          const outcome = await ProductionTokenManager.refreshAccessTokenOutcome(apiBaseUrl);
          if (outcome.status === 'superseded' || outcome.generation !== ProductionTokenManager.getAuthGeneration()) {
            return Promise.reject(supersededRequest(config));
          }
          // Current-session expiry may clear auth and advance the generation.
          // Keep that handled expiry distinct from a replacement-account cancellation.
          (config as AdmittedRequest)._authGeneration = outcome.generation;
          const newToken = outcome.token;

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
      if (hasRetiredAdmission(response.config)) return Promise.reject(supersededRequest(response.config));
      ProductionTokenManager.resetAuthFailureCount();
      return response;
    },
    async (error: any) => {
      const apiError: any = error;
      const originalRequest = apiError.config as any;
      if (hasRetiredAdmission(originalRequest)) return Promise.reject(supersededRequest(originalRequest));
      const isCanceledRequest =
        apiError.code === 'ERR_CANCELED'
        || apiError.name === 'CanceledError'
        || apiError.message === 'canceled'
        || axios.isCancel(apiError);

      if (isCanceledRequest) {
        return Promise.reject(apiError);
      }

      // A stale AI consent is RECOVERABLE, and the user must be shown the way
      // back. Enforcing owner decision Q5 server-side blocks every AI endpoint
      // for anyone whose grant predates the corrected disclosure — which is
      // most existing clients. Without this, they hit a raw 403 on the Smart
      // Workout Logger, Coach chat, plan generation and anywhere else, with no
      // hint that re-consenting is the fix. Nothing in the app handled this
      // code (GLM 5.3, UX panel).
      //
      // A redirect is used rather than a toast because there is exactly one
      // place to resolve it, and a dead end is what we are removing.
      if (apiError.response?.status === 403
        && (apiError.response?.data as any)?.code === 'AI_CONSENT_STALE_VERSION'
        && typeof window !== 'undefined'
        && window.location.pathname.startsWith('/dashboard/client/')
        && !window.location.pathname.includes('/ai-consent')) {
        // Client surface only. A trainer or admin acting on a client whose
        // consent is stale must NOT be bounced to the client's consent screen —
        // they cannot re-consent on someone else's behalf. Their surfaces
        // receive the rejection and render it in place.
        logger.log('[API] AI consent superseded — routing to the consent screen');
        window.location.assign('/dashboard/client/ai-consent?reconsent=1');
        return Promise.reject(apiError);
      }

      if (apiError.response?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        const errorData = apiError.response.data as any;

        if (errorData?.errorCode === 'TOKEN_EXPIRED' || errorData?.message?.includes('expired')) {
          logger.log('[API] Token expired, attempting refresh...');

          const outcome = await ProductionTokenManager.refreshAccessTokenOutcome(apiBaseUrl);
          if (outcome.status === 'superseded' || outcome.generation !== ProductionTokenManager.getAuthGeneration()) {
            return Promise.reject(supersededRequest(originalRequest));
          }
          const newToken = outcome.token;

          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return client(originalRequest);
          }

          if (restoreAdminSessionOnce()) {
            return Promise.reject(createAuthSessionExpiredError(originalRequest));
          }
          clearAdmittedAuth(originalRequest);
          redirectToLoginOnce();
          return Promise.reject(createAuthSessionExpiredError(originalRequest));
        }

        const failureGeneration = ProductionTokenManager.getAuthGeneration();
        const shouldRedirect = ProductionTokenManager.incrementAuthFailure();
        const expectedGeneration = failureGeneration + (shouldRedirect ? 1 : 0);
        if (ProductionTokenManager.getAuthGeneration() !== expectedGeneration) return Promise.reject(supersededRequest(originalRequest));
        if (shouldRedirect) {
          originalRequest._authGeneration = expectedGeneration;
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
