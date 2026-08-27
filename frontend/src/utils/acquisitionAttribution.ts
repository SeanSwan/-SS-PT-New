/**
 * acquisitionAttribution.ts — read WHICH channel (and WHO) sent this visitor.
 * utm_* + cross-site referrer are read per-request (non-PII). A referral code (`?ref=`) from a
 * shared milestone link is persisted FIRST-TOUCH for 30 days so a signup days later still credits
 * the friend who shared. The code is an opaque server-signed token — verified server-side, never
 * trusted here. Rule 8: nothing personal leaves the browser.
 */
export interface AcquisitionParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  /** Signed referral code from a shared link; server verifies (HMAC) and attributes the lead. */
  ref?: string;
}

export const REFERRAL_STORAGE_KEY = 'swan.ref';
export const REFERRAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REF_SHAPE = /^\d{1,12}\.[A-Za-z0-9_-]{16}$/;

/** Persist a URL `ref` first-touch; return the effective (fresh) code or undefined. */
export function rememberReferral(urlRef: string | null, now = Date.now()): string | undefined {
  let stored: { code?: string; at?: number } | null = null;
  try { stored = JSON.parse(localStorage.getItem(REFERRAL_STORAGE_KEY) || 'null'); } catch { stored = null; }
  const fresh = !!(stored?.code && REF_SHAPE.test(stored.code) && typeof stored.at === 'number' && now - stored.at < REFERRAL_TTL_MS);
  if (fresh) return stored!.code;                         // first touch wins; never overwrite a live one
  if (urlRef && REF_SHAPE.test(urlRef)) {
    try { localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify({ code: urlRef, at: now })); } catch { /* storage blocked */ }
    return urlRef;
  }
  if (stored) { try { localStorage.removeItem(REFERRAL_STORAGE_KEY); } catch { /* ignore */ } }
  return undefined;
}

/**
 * Capture `?ref=` AT LANDING. Must run on app boot: a visitor who lands on `/?ref=<code>` and
 * then navigates in-app to signup no longer has the query param by submit time, so without this
 * the code is never stored and the referral is lost. Safe to call repeatedly (first touch wins).
 */
export function captureReferralOnLanding(): void {
  if (typeof window === 'undefined') return;
  try {
    rememberReferral(new URLSearchParams(window.location.search).get('ref'));
  } catch { /* malformed URL or storage blocked - attribution is best-effort, never fatal */ }
}

export function readAcquisitionParams(): AcquisitionParams {
  if (typeof window === 'undefined') return {};
  const out: AcquisitionParams = {};
  let urlRef: string | null = null;
  try {
    const p = new URLSearchParams(window.location.search);
    const s = p.get('utm_source'); if (s) out.utmSource = s;
    const m = p.get('utm_medium'); if (m) out.utmMedium = m;
    const c = p.get('utm_campaign'); if (c) out.utmCampaign = c;
    urlRef = p.get('ref');
  } catch { /* ignore malformed query */ }
  try {
    const ref = document.referrer || '';
    if (ref && !ref.includes(window.location.host)) out.referrer = ref;
  } catch { /* ignore */ }
  try { const code = rememberReferral(urlRef); if (code) out.ref = code; } catch { /* ignore */ }
  return out;
}

export default readAcquisitionParams;
