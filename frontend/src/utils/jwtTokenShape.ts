export const decodeJwtHeader = (value: string): Record<string, unknown> | null => {
  const [encodedHeader] = value.split('.');
  if (!encodedHeader) return null;

  try {
    const normalized = encodedHeader.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(atob(padded));
    return decoded && typeof decoded === 'object' ? decoded : null;
  } catch {
    return null;
  }
};

export const isUnsignedJwtToken = (value?: string | null) => {
  if (!value) return false;
  const header = decodeJwtHeader(value);
  return String(header?.alg || '').toLowerCase() === 'none';
};