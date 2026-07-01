export function normalizePageViewPath(path?: string | null): string | null {
  if (typeof path !== 'string') return null;
  const trimmed = path.trim();
  if (!trimmed || !trimmed.startsWith('/')) return null;
  return trimmed.split(/[?#]/)[0].slice(0, 200) || null;
}

export function shouldSkipPageViewPath(path?: string | null): boolean {
  const normalized = normalizePageViewPath(path);
  if (!normalized) return true;

  const lowerPath = normalized.toLowerCase();
  if (/^\/dashboard(?:\/|$)/.test(lowerPath)) return true;
  if (/^\/login(?:\/|$)/.test(lowerPath)) return true;
  if (/^\/auth\/(?:register|signup)(?:\/|$)/.test(lowerPath)) return false;
  if (/^\/(?:signup|register)(?:\/|$)/.test(lowerPath)) return false;
  if (/^\/auth(?:\/|$)/.test(lowerPath)) return true;

  return false;
}