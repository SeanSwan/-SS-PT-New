let fallbackCounter = 0;

const toHex = (byte: number) => byte.toString(16).padStart(2, '0');

const normalizePrefix = (prefix: string) => prefix.trim() || 'coach-message';

export const createCoachMessageId = (prefix: string): string => {
  const safePrefix = normalizePrefix(prefix);
  const cryptoRef = globalThis.crypto;

  if (typeof cryptoRef?.randomUUID === 'function') {
    return `${safePrefix}-${cryptoRef.randomUUID()}`;
  }

  if (typeof cryptoRef?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    cryptoRef.getRandomValues(bytes);
    return `${safePrefix}-${Array.from(bytes, toHex).join('')}`;
  }

  fallbackCounter = fallbackCounter >= Number.MAX_SAFE_INTEGER ? 1 : fallbackCounter + 1;
  return `${safePrefix}-${Date.now()}-${fallbackCounter.toString(36)}`;
};
