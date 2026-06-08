/**
 * FILE: workoutPlanPdfUrl.ts
 * PURPOSE: Shared allowlist for authenticated SwanStudios workout-plan PDF proxy URLs.
 */

const PROTECTED_PLAN_PDF_PATH = /^\/api\/workout-plans\/[^/]+\/pdf\/content\.pdf$/;
const UrlParser = globalThis.URL;

export const normalizeProtectedPlanPdfUrl = (value: unknown): string | null => {
  const raw = typeof value === 'string' ? value : '';
  if (!raw.trim() || /[\r\n\t]/.test(raw)) return null;

  const url = raw.trim();
  if (!url.startsWith('/') || url.startsWith('//')) return null;
  if (!UrlParser) return null;

  try {
    const parsed = new UrlParser(url, 'https://swanstudios.local');
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return null;
    return PROTECTED_PLAN_PDF_PATH.test(parsed.pathname) ? parsed.pathname : null;
  } catch {
    return null;
  }
};
