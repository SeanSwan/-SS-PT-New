/**
 * usePaymentIdempotency Hook
 * ==========================
 * Generates and manages a UUID v4 idempotency token for payment recovery.
 * Token is regenerated on each new payment attempt (reset()).
 * Uses crypto.getRandomValues for secure randomness.
 */

import { useState, useCallback } from 'react';

export function generateUUID(): string {
  // Use crypto.getRandomValues for secure UUID v4
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version (4) and variant (RFC 4122)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return (
    hex.slice(0, 8) + '-' +
    hex.slice(8, 12) + '-' +
    hex.slice(12, 16) + '-' +
    hex.slice(16, 20) + '-' +
    hex.slice(20)
  );
}

export function usePaymentIdempotency() {
  const [token, setToken] = useState<string>(generateUUID);

  /** Generate a fresh token (call after successful payment or on form reset) */
  const reset = useCallback(() => {
    setToken(generateUUID());
  }, []);

  return { token, reset };
}
