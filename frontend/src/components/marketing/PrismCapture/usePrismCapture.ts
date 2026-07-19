/**
 * usePrismCapture — the one-beam-in fetch hook. POSTs email-only to the public `/api/leads/capture` (bind-only
 * backend), maps the OPAQUE 201 to a share code, and drives the `idle → beaming → refracted | error` machine.
 * Attribution (`?ref=` + UTM) is read once from the URL and forwarded so a referred visit is attributed and the
 * returned code seeds the share ray. No auth header (the endpoint is public). Client-side email check mirrors
 * the server's so we fail fast without a round trip.
 */
import { useCallback, useMemo, useState } from 'react';

export type PrismState = 'idle' | 'beaming' | 'refracted' | 'error';
export type PrismIntent = 'book' | 'trainer' | 'spectrum';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Attribution {
  ref: string | null;
  utm: { source?: string; medium?: string; campaign?: string };
}

/** Read `?ref=` + UTM once from the URL. Sanitized client-side; the server re-sanitizes (never trust the client). */
function readAttribution(): Attribution {
  try {
    const p = new URLSearchParams(window.location.search);
    const clean = (v: string | null) => (v ? v.replace(/[^a-z0-9]/gi, '').slice(0, 32) : undefined);
    const cap = (v: string | null) => (v ? v.slice(0, 120) : undefined);
    return {
      ref: clean(p.get('ref')) || null,
      utm: { source: cap(p.get('utm_source')), medium: cap(p.get('utm_medium')), campaign: cap(p.get('utm_campaign')) },
    };
  } catch {
    return { ref: null, utm: {} };
  }
}

export interface PrismCaptureApi {
  state: PrismState;
  error: string | null;
  /** The lead's own share code from the 201 — used to build the referral link on the share ray. */
  shareCode: string | null;
  submit: (email: string, intent?: PrismIntent) => Promise<void>;
  reset: () => void;
  isValidEmail: (email: string) => boolean;
}

export function usePrismCapture(): PrismCaptureApi {
  const [state, setState] = useState<PrismState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const attribution = useMemo(readAttribution, []);

  const isValidEmail = useCallback((email: string) => EMAIL_RE.test(email.trim()), []);

  const submit = useCallback(
    async (email: string, intent?: PrismIntent) => {
      const clean = email.trim().toLowerCase();
      if (!EMAIL_RE.test(clean)) {
        setError('invalid');
        setState('error');
        return;
      }
      setState('beaming');
      setError(null);
      try {
        const res = await fetch('/api/leads/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ email: clean, intent, ref: attribution.ref, utm: attribution.utm }),
        });
        if (!res.ok) throw new Error(`capture ${res.status}`);
        const json = (await res.json().catch(() => null)) as { ok?: boolean; ref?: string | null } | null;
        if (!json?.ok) throw new Error('capture not ok');
        setShareCode(typeof json.ref === 'string' ? json.ref : null);
        setState('refracted');
      } catch {
        setError('network');
        setState('error');
      }
    },
    [attribution],
  );

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
  }, []);

  return { state, error, shareCode, submit, reset, isValidEmail };
}
