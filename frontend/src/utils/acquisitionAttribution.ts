/**
 * Acquisition attribution — read non-PII marketing signals (utm_* + a cross-site
 * referrer) from the browser so each captured lead records WHICH channel sent them
 * (YouTube/TikTok/IG/search/referral). Same-origin referrers are dropped; nothing
 * here identifies a person (rule 8 safe). Shared by the newsletter, contact, and
 * signup capture paths so there is one attribution reader, not three.
 */
export interface AcquisitionParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
}

export function readAcquisitionParams(): AcquisitionParams {
  if (typeof window === 'undefined') return {};
  const out: AcquisitionParams = {};
  try {
    const p = new URLSearchParams(window.location.search);
    const s = p.get('utm_source'); if (s) out.utmSource = s;
    const m = p.get('utm_medium'); if (m) out.utmMedium = m;
    const c = p.get('utm_campaign'); if (c) out.utmCampaign = c;
  } catch { /* ignore malformed query */ }
  try {
    const ref = document.referrer || '';
    if (ref && !ref.includes(window.location.host)) out.referrer = ref;
  } catch { /* ignore */ }
  return out;
}

export default readAcquisitionParams;
