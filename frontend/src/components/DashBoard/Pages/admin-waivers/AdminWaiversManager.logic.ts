/**
 * AdminWaiversManager.logic.ts
 * Pure route/filter helpers for the active admin waiver manager.
 * Activation-queue handoffs may carry a clientId, but only strict positive
 * integer ids are allowed into the admin waiver API query.
 */

import type { WaiverStatus } from './adminWaivers.types';

export const QUICK_FILTERS: { label: string; value: WaiverStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending Match', value: 'pending_match' },
  { label: 'Linked', value: 'linked' },
  { label: 'Superseded', value: 'superseded' },
  { label: 'Revoked', value: 'revoked' },
];

export const SEARCH_DEBOUNCE_MS = 300;

const POSITIVE_CLIENT_ID = /^[1-9]\d*$/;

export const getWaiverActivationClientId = (searchParams: URLSearchParams): string => {
  const clientId = searchParams.get('clientId')?.trim() || '';
  return POSITIVE_CLIENT_ID.test(clientId) ? clientId : '';
};
