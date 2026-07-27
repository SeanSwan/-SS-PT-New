/**
 * acquisition.ts — P0-4 (SWA-29) client funnel beacon (MEASUREMENT-CHARTER §transport).
 *
 * Fires the client half of the funnel (visit / booking_started / referral) at the public
 * backend beacon `POST /api/telemetry/funnel`. Best-effort by design: it must NEVER throw,
 * block, or delay the UI — a dropped beacon is invisible and acceptable. Relative URL
 * (same convention as usePrismCapture's `/api/leads/capture`): in prod the SPA is served
 * from the same origin that proxies `/api`.
 *
 * The backend enforces a client-event allowlist + zero-PII sanitizer; this mirror is a
 * courtesy guard so we don't send junk, NOT the security boundary (that lives server-side).
 */
const ENDPOINT = '/api/telemetry/funnel';

/** Events a client may legitimately emit (mirror of the server CLIENT_FUNNEL_EVENTS). */
export type ClientFunnelEvent = 'visit' | 'booking_started' | 'ref_shared' | 'ref_landed';
const CLIENT_EVENTS: ReadonlySet<ClientFunnelEvent> = new Set([
  'visit',
  'booking_started',
  'ref_shared',
  'ref_landed',
]);

export interface FunnelMeta {
  source?: string;
  ref?: string;
}

/** Fire one funnel event, best-effort. Never throws. */
export function trackFunnel(event: ClientFunnelEvent, meta: FunnelMeta = {}): void {
  try {
    if (typeof window === 'undefined' || !CLIENT_EVENTS.has(event)) return;
    const { ref, ...rest } = meta;
    const body = JSON.stringify({ event, ...(ref != null ? { ref } : {}), meta: rest });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      // sendBeacon survives page unload and never blocks; Blob type → express.json parses it.
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
      return;
    }
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {});
  } catch {
    /* best-effort — a beacon must never surface an error to the UI */
  }
}

/**
 * Fire once per page load: a `visit`, plus `ref_landed` when the URL carries `?ref=CODE`
 * (referral attribution — the landing half of the ref funnel). Pathname is the only meta,
 * capped, and is not PII.
 */
export function trackVisit(): void {
  try {
    if (typeof window === 'undefined') return;
    trackFunnel('visit', { source: window.location.pathname.slice(0, 64) });
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) trackFunnel('ref_landed', { ref: ref.slice(0, 64) });
  } catch {
    /* best-effort */
  }
}
