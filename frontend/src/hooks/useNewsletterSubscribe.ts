/**
 * useNewsletterSubscribe — shared client for the double-opt-in newsletter.
 * Posts to the live /api/newsletter/subscribe (Tier 1.1 backbone). Reused by the
 * homepage NewsletterSection and the site FooterNewsletter so there is one
 * subscribe path, not two. Honeypot-aware; never reveals list membership.
 */
import { useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL =
  typeof window !== 'undefined' && window.location.origin.includes('sswanstudios.com')
    ? 'https://sswanstudios.com'
    : 'http://localhost:5000';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
