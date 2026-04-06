/**
 * ============================================================
 * BLUEPRINT: useE2EE Hook — E2EE State Management
 * ============================================================
 * Purpose:  React hook for managing E2EE lifecycle.
 *           Handles key generation, upload, status, and
 *           encrypt/decrypt operations.
 * Owner:    Phase 11 — E2EE Encryption
 * ============================================================
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  generateKeyBundle,
  encryptMessage,
  decryptMessage,
  hasLocalKeys,
  clearLocalKeys,
  getLocalIdentityPublicKey,
  getSignedPreKeyPrivate,
  getOrCreateDeviceId,
  getOrCreateRegistrationId,
  getOrCreateIdentityKey,
  generateSignedPreKey,
  generateOneTimePreKeys,
} from './e2eeCrypto';
import type { EncryptedPayload } from './e2eeCrypto';
import {
  getEncryptionStatus,
  uploadKeyBundle,
  fetchUserKeyBundle,
  getSafetyNumber,
  deactivateE2EE as apiDeactivateE2EE,
  replenishPreKeys,
  getPreKeyCount,
} from './e2eeApi';
import type { E2EEStatus } from './e2eeApi';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseE2EEReturn {
  /** Whether E2EE is enabled for this user */
  isEnabled: boolean;
  /** Whether the server supports encryption */
  serverEncryption: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Enable E2EE: generate keys + upload to server */
  enableE2EE: () => Promise<void>;
  /** Disable E2EE: deactivate on server + clear local keys */
  disableE2EE: () => Promise<void>;
  /** Encrypt a message for a recipient */
  encrypt: (plaintext: string, recipientUserId: number) => Promise<EncryptedPayload | null>;
  /** Decrypt a received message */
  decrypt: (payload: EncryptedPayload) => Promise<string | null>;
  /** Get safety number for identity verification */
  verifySafetyNumber: (otherUserId: number) => Promise<string | null>;
  /** Refresh status from server */
  refreshStatus: () => Promise<void>;
}

export function useE2EE(): UseE2EEReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [serverEncryption, setServerEncryption] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  // Check status on mount
  const refreshStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [status, localKeys] = await Promise.all([
        getEncryptionStatus().catch(() => null),
        hasLocalKeys(),
      ]);

      if (status) {
        setServerEncryption(status.serverEncryption);
        setIsEnabled(status.e2eeEnabled && localKeys);

        // Auto-replenish prekeys if running low
        if (status.e2eeEnabled && localKeys && status.preKeyCount < status.preKeyThreshold) {
          try {
            const deviceId = await getOrCreateDeviceId();
            const registrationId = await getOrCreateRegistrationId();
            const identity = await getOrCreateIdentityKey();
            const signedPreKey = await generateSignedPreKey(identity.privateKey);
            const { preKeys } = await generateOneTimePreKeys(20, status.preKeyCount);
            await replenishPreKeys(
              deviceId,
              identity.publicKey,
              signedPreKey.signedPreKeyId,
              signedPreKey.signedPreKeyPublic,
              signedPreKey.signedPreKeySignature,
              registrationId,
              preKeys
            );
          } catch {
            // Non-critical — will retry on next check
          }
        }
      }
    } catch {
      // Status check failed — non-critical
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      refreshStatus();
    }
  }, [refreshStatus]);

  // Enable E2EE
  const enableE2EE = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Generate full key bundle
      const bundle = await generateKeyBundle(20);

      // Upload to server
      await uploadKeyBundle(bundle);

      setIsEnabled(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to enable E2EE';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Disable E2EE
  const disableE2EE = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await apiDeactivateE2EE();
      await clearLocalKeys();

      setIsEnabled(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to disable E2EE';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Encrypt message
  const encrypt = useCallback(async (
    plaintext: string,
    recipientUserId: number
  ): Promise<EncryptedPayload | null> => {
    try {
      // Fetch recipient's key bundle
      const bundle = await fetchUserKeyBundle(recipientUserId);
      if (!bundle) return null; // Recipient doesn't have E2EE

      // Use their signed prekey for encryption
      return await encryptMessage(plaintext, bundle.signedPreKeyPublic);
    } catch (err) {
      console.error('[E2EE] Encryption failed:', err);
      return null;
    }
  }, []);

  // Decrypt message
  const decrypt = useCallback(async (
    payload: EncryptedPayload
  ): Promise<string | null> => {
    try {
      // Get our signed prekey private key for decryption
      const privateKey = await getSignedPreKeyPrivate();
      if (!privateKey) return null;

      return await decryptMessage(payload, privateKey);
    } catch (err) {
      console.error('[E2EE] Decryption failed:', err);
      return null;
    }
  }, []);

  // Safety number
  const verifySafetyNumber = useCallback(async (
    otherUserId: number
  ): Promise<string | null> => {
    return getSafetyNumber(otherUserId);
  }, []);

  return {
    isEnabled,
    serverEncryption,
    isLoading,
    error,
    enableE2EE,
    disableE2EE,
    encrypt,
    decrypt,
    verifySafetyNumber,
    refreshStatus,
  };
}

export default useE2EE;
