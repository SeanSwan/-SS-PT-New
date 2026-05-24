/**
 * Order Number Utilities
 * ======================
 *
 * Purpose:
 * - Generate human-readable SwanStudios order numbers for checkout routes.
 * - Use cryptographic entropy so payment references are not predictable.
 */

import { randomBytes } from 'node:crypto';

export function generateSwanOrderNumber(now = new Date()) {
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const entropy = randomBytes(4).readUInt32BE(0).toString(36).toUpperCase().padStart(7, '0').slice(-6);

  return `SS-${datePart}-${entropy}`;
}

export function generateRecoveryOrderNumber(now = new Date()) {
  const timestamp = now.getTime().toString(36).toUpperCase();
  const entropy = randomBytes(4).readUInt32BE(0).toString(36).toUpperCase().padStart(7, '0').slice(-6);

  return `REC-${timestamp}-${entropy}`;
}
