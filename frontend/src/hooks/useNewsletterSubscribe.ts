/**
 * useNewsletterSubscribe — shared client for the double-opt-in newsletter.
 * Posts to the live /api/newsletter/subscribe (Tier 1.1 backbone). Reused by the
 * homepage NewsletterSection and the site FooterNewsletter so there is one
 * subscribe path, not two. Honeypot-aware; never reveals list membership.
 */
import { useState, useCallback } from 'react';
import axios from 'axios';

// Same-origin (relative) in prod/staging/preview; only local dev hits :5000.
// Avoids the old bug where any non-sswanstudios host (Render preview) fell through
// to localhost and the form silently failed.
const API_BASE_URL =
  typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
    ? 'http://localhost:5000'
    : '';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Read non-PII acquisition signals (utm_* + cross-site referrer) so each subscriber
// records WHICH channel sent them (YouTube/TikTok/IG/search/referral). Same-origin
// referrers are dropped; nothing here identifies a person (rule 8 safe).
function readAttribution(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const out: Record<string, string> = {};
  try {
    const p = new URLSearchParams(window.location.search);
    const s = p.get('utm_source'); if (s) out.utmSource = s;
    const m = p.get('utm_medium'); if (m) out.utmMedium = m;
    const c = p.get('utm_campaign'); if (c) out.utmCampaign = c;
  } catch { /* ignore */ }
  try {
    const ref = document.referrer || '';
    if (ref && !ref.includes(window.location.host)) out.referrer = ref;
  } catch { /* ignore */ }
  return out;
}

export type NewsletterStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SubscribeArgs {
  email: string;
  firstName?: string;
  /** Honeypot: bots fill this; humans never see it. */
  website?: string;
}

export function useNewsletterSubscribe(source: string = 'website') {
  const [status, setStatus] = useState<NewsletterStatus>('idle');
  const [message, setMessage] = useState('');

  const subscribe = useCallback(
    async ({ email, firstName, website }: SubscribeArgs) => {
      // Honeypot tripped — silently "succeed" without sending anything.
      if (website) {
        setStatus('success');
        setMessage('Almost there — check your email to confirm your subscription.');
        return { ok: true };
      }
      const trimmed = (email || '').trim();
      if (!EMAIL_RE.test(trimmed)) {
        setStatus('error');
        setMessage('Please enter a valid email address.');
        return { ok: false };
      }

      setStatus('loading');
      setMessage('');
      try {
        const res = await axios.post(`${API_BASE_URL}/api/newsletter/subscribe`, {
          email: trimmed,
          firstName: firstName?.trim() || undefined,
          source,
          ...readAttribution(),
        });
        setStatus('success');
        setMessage(res?.data?.message || 'Almost there — check your email to confirm your subscription.');
        return { ok: true };
      } catch (err: any) {
        setStatus('error');
        setMessage(err?.response?.data?.message || 'Could not subscribe right now. Please try again.');
        return { ok: false };
      }
    },
    [source]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setMessage('');
  }, []);

  return { status, message, subscribe, reset };
}

export default useNewsletterSubscribe;
