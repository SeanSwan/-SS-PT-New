/**
 * ============================================================
 * BLUEPRINT: E2EE API Service — Server Communication
 * ============================================================
 * Purpose:  API calls for E2EE key exchange with the backend.
 * Scope:    Upload/fetch key bundles, check status, safety numbers.
 * Owner:    Phase 11 — E2EE Encryption
 * ============================================================
 */

import api from '../api.service';
import type { E2EEKeyBundle, E2EEPreKey } from './e2eeCrypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface E2EEStatus {
  serverEncryption: boolean;
  e2eeEnabled: boolean;
  preKeyCount: number;
  preKeyThreshold: number;
}

export interface RemoteKeyBundle {
  identityPublicKey: string;
  signedPreKeyId: number;
  signedPreKeyPublic: string;
  signedPreKeySignature: string;
  registrationId: number;
  deviceId: string;
  oneTimePreKey: { preKeyId: number; publicKey: string } | null;
}

// ---------------------------------------------------------------------------
// API Calls
// ---------------------------------------------------------------------------

/** Check E2EE status for current user. */
export async function getEncryptionStatus(): Promise<E2EEStatus> {
  const { data } = await api.get('/api/encryption/status');
  return data;
}

/** Upload key bundle to server. */
export async function uploadKeyBundle(bundle: E2EEKeyBundle): Promise<{ success: boolean; bundleId: string }> {
  const { data } = await api.post('/api/encryption/keys/upload', bundle);
  return data;
}

/** Fetch another user's key bundle for establishing a session. */
export async function fetchUserKeyBundle(userId: number): Promise<RemoteKeyBundle | null> {
  try {
    const { data } = await api.get(`/api/encryption/keys/${userId}`);
    return data.bundle;
  } catch (err: unknown) {
    const error = err as { response?: { status?: number } };
    if (error.response?.status === 404) return null;
    throw err;
  }
}

/** Replenish one-time prekeys on the server. */
export async function replenishPreKeys(
  deviceId: string,
  identityPublicKey: string,
  signedPreKeyId: number,
  signedPreKeyPublic: string,
  signedPreKeySignature: string,
  registrationId: number,
  oneTimePreKeys: E2EEPreKey[]
): Promise<{ success: boolean; remainingPreKeys: number }> {
  const { data } = await api.post('/api/encryption/keys/replenish', {
    deviceId,
    identityPublicKey,
    signedPreKeyId,
    signedPreKeyPublic,
    signedPreKeySignature,
    registrationId,
    oneTimePreKeys,
  });
  return data;
}

/** Get remaining prekey count. */
export async function getPreKeyCount(): Promise<{ count: number; threshold: number }> {
  const { data } = await api.get('/api/encryption/prekey-count');
  return data;
}

/** Get safety number for identity verification with another user. */
export async function getSafetyNumber(userId: number): Promise<string | null> {
  try {
    const { data } = await api.get(`/api/encryption/safety-number/${userId}`);
    return data.safetyNumber;
  } catch (err: unknown) {
    const error = err as { response?: { status?: number } };
    if (error.response?.status === 404) return null;
    throw err;
  }
}

/** Deactivate E2EE for current user. */
export async function deactivateE2EE(): Promise<void> {
  await api.post('/api/encryption/deactivate');
}
