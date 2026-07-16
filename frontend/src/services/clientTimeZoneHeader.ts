/**
 * ============================================================================
 * FILE: clientTimeZoneHeader.ts
 * PURPOSE: Validate the browser IANA timezone attached to authenticated calls.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * The backend remains authoritative for actor-versus-client precedence. This
 * helper only prevents empty, malformed, or oversized values leaving the app.
 */
export const getBrowserTimeZoneHeader = (
  value = Intl.DateTimeFormat().resolvedOptions().timeZone,
): string | null => {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > 64) return null;

  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: candidate })
      .resolvedOptions()
      .timeZone;
  } catch {
    return null;
  }
};