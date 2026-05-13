/**
 * lazyLoadWithErrorHandling.tsx
 * Shared route lazy-loader with one retry for transient dev-server chunk fetch failures.
 */
import React, { lazy } from 'react';
import { logger } from '@/utils/logger';

type LazyRouteModule = { default: React.ComponentType<any> };
type LazyRouteImport = () => Promise<LazyRouteModule>;

interface LazyRouteOptions {
  retryDelayMs?: number;
  maxRetries?: number;
}

const retryableImportMessages = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'Loading chunk',
  'net::ERR_CONNECTION_REFUSED',
  'NetworkError',
];

export const isRetryableLazyImportError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return retryableImportMessages.some((fragment) => message.includes(fragment));
};

const waitForRetry = (retryDelayMs: number) => (
  new Promise((resolve) => globalThis.setTimeout(resolve, retryDelayMs))
);

const createErrorRouteModule = (componentName: string): LazyRouteModule => ({
  default: () => (
    <div style={{
      padding: '2rem',
      textAlign: 'center',
      background: 'var(--bg-base, #0A0A0F)',
      color: 'var(--text-primary, #E0ECF4)',
      minHeight: '50vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h2 style={{ color: 'var(--error, #ff416c)' }}>Error Loading {componentName}</h2>
      <p>Please refresh the page or contact support.</p>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #00c8ff))',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          color: 'var(--button-text-dark, #002060)',
          fontWeight: 500,
          cursor: 'pointer',
          marginTop: '1rem'
        }}
      >
        Retry
      </button>
    </div>
  )
});

export async function resolveLazyRouteModule(
  importFn: LazyRouteImport,
  componentName: string,
  fallbackImportFn: LazyRouteImport | null = null,
  options: LazyRouteOptions = {}
): Promise<LazyRouteModule> {
  const { retryDelayMs = 250, maxRetries = 1 } = options;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await importFn();
    } catch (error) {
      lastError = error;

      if (attempt >= maxRetries || !isRetryableLazyImportError(error)) {
        break;
      }

      logger.warn(`[Route Loader] ${componentName} failed to load; retrying once.`, error);
      await waitForRetry(retryDelayMs);
    }
  }

  logger.error(`Failed to load ${componentName}:`, lastError);

  if (fallbackImportFn) {
    logger.log(`Trying fallback for ${componentName}...`);
    try {
      return await fallbackImportFn();
    } catch (fallbackError) {
      logger.error(`Fallback also failed for ${componentName}:`, fallbackError);
    }
  }

  return createErrorRouteModule(componentName);
}

export function lazyLoadWithErrorHandling(
  importFn: LazyRouteImport,
  componentName: string,
  fallbackImportFn: LazyRouteImport | null = null
) {
  return lazy(() => resolveLazyRouteModule(importFn, componentName, fallbackImportFn));
}
