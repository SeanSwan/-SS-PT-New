/**
 * Response helpers for the admin social-publishing routes.
 * ========================================================
 * Split out to keep the route file under the 300-line rule. These shape the
 * degraded-but-honest responses used when native storage is unavailable: the
 * surface reports what it can and says plainly that it is degraded, rather than
 * 500-ing or pretending the data is complete.
 *
 * @module adminSocialPublishingHelpers
 */

import { PROVIDER_CAPABILITIES } from '../services/socialProviderCapabilities.mjs';

const STORAGE_UNAVAILABLE_MESSAGE = 'Native social publishing storage is unavailable.';

export const getAdminSafeConnectError = (err) => {
  const message = String(err?.message || '');
  if (message.startsWith('Native credential encryption is not configured.')) return message;
  if (message.startsWith('Bluesky session failed:')) return message;
  return 'Failed to initiate connection';
};

export const getSchedulerStatus = () => ({
  enabled: process.env.MARKETING_PUBLISHER_WORKER_ENABLED !== 'false',
  intervalMs: Number(process.env.MARKETING_PUBLISHER_WORKER_INTERVAL_MS || 60000),
});

export const buildStorageUnavailableStatus = () => ({
  ok: false,
  reason: 'storage_unavailable',
  message: STORAGE_UNAVAILABLE_MESSAGE,
});

export const buildStorageUnavailableResponse = data => ({
  success: true,
  degraded: true,
  data,
  storage: buildStorageUnavailableStatus(),
  message: STORAGE_UNAVAILABLE_MESSAGE,
});

export const buildStorageUnavailableHealth = () => buildStorageUnavailableResponse({
  mode: 'native',
  configured: false,
  accountCount: 0,
  providers: PROVIDER_CAPABILITIES,
  scheduler: getSchedulerStatus(),
  storage: buildStorageUnavailableStatus(),
});

export { STORAGE_UNAVAILABLE_MESSAGE };
