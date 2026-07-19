/**
 * usePrismCapture — the one-beam-in fetch hook. POSTs email-only to the public `/api/leads/capture` (bind-only
 * backend), maps the OPAQUE response to a share code, and drives the `idle → beaming → refracted | error`
 * machine. Attribution (`?ref=` + UTM) is read once from the URL and forwarded. No auth header (public endpoint).
 *
 * Hardened after hostile review: a re-entrancy guard (a ref, not the async `state`) blocks a double-submit race
 * that could flip a shown success back to error; an AbortController + timeout unsticks a hung request (otherwise
 * the form stays `beaming` forever with no recovery); `reset` clears the share code; the CLEANED email is
 * exposed so downstream prefill matches what was actually captured.
 */
import { useCallback, useMemo, useRef, useState } from 'react';

export type PrismState = 'idle' | 'beaming' | 'refracted' | 'error';
export type PrismIntent = 'book' | 'trainer' | 'spectrum';
export type PrismError = 'invalid' | 'network' | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUEST_TIMEOUT_MS = 10000;

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
  error: PrismError;
  /** The lead's own share code from the response — used to build the referral link on the share ray. */
  shareCode: string | null;
  /** The CLEANED (trimmed + lowercased) email that was submitted — for downstream prefill parity. */
  submittedEmail: string;
  submit: (email: string, intent?: PrismIntent) => Promise<void>;
  reset: () => void;
  isValidEmail: (email: string) => boolean;
}

export function usePrismCapture(): PrismCaptureApi {
  const [state, setState] = useState<PrismState>('idle');
  const [error, setError] = useState<PrismError>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const inFlight = useRef(false); // synchronous re-entrancy guard (state is async — can't gate on it)
  const attribution = useMemo(readAttribution, []);

  const isValidEmail = useCallback((email: string) => EMAIL_RE.test(email.trim()), []);

  const submit = useCallback(
    async (email: string, intent?: PrismIntent) => {
      if (inFlight.current) return; // ignore a second submit while one is in flight (Enter-repeat / double click)
      const clean = email.trim().toLowerCase();
      if (!EMAIL_RE.test(clean)) {
        setError('invalid');
        setState('error');
        return;
      }
      inFlight.current = true;
      setSubmittedEmail(clean);
      setState('beaming');
      setError(null);

      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch('/api/leads/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          signal: controller.signal,
          body: JSON.stringify({ email: clean, intent, ref: attribution.ref, utm: attribution.utm }),
        });
        if (!res.ok) throw new Error(`capture ${res.status}`);
        const json = (await res.json().catch(() => null)) as { ok?: boolean; ref?: string | null } | null;
        if (!json?.ok) throw new Error('capture not ok');
        setShareCode(typeof json.ref === 'string' ? json.ref : null);
        setState('refracted');
      } catch {
        // timeout (abort), network failure, or non-2xx — all recoverable via Retry
        setError('network');
        setState('error');
      } finally {
        window.clearTimeout(timer);
        inFlight.current = false;
      }
    },
    [attribution],
  );

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setShareCode(null);
  }, []);

  return { state, error, shareCode, submittedEmail, submit, reset, isValidEmail };
}
