/**
 * ============================================================================
 * FILE: instrument.ts
 * PURPOSE: Client-side error reporting. Production is currently BLIND to
 *          browser crashes — a member whose workout logger throws sees a broken
 *          screen and nobody is told (SWA-225 EX-4).
 *
 * IMPORTED FIRST in main.jsx, above React, so the SDK's global handlers are
 * installed before any application code can throw.
 *
 * DSN-GATED AND INERT BY DEFAULT. With no VITE_SENTRY_DSN this module performs
 * zero network work and installs nothing — so it merges safely and activates
 * only when the env var reaches Render. There is no flag to remember.
 *
 * PRIVACY IS THE HARD PART, AND IT IS ENFORCED HERE (Rule 8: zero PII to
 * third parties). `sendDefaultPii: false` covers Sentry's own automatic
 * collection but NOT the payloads an app hands it, so `beforeSend` scrubs:
 *   - the whole `request` object (headers, cookies, query, body)
 *   - every breadcrumb's `data.url` QUERY STRING. This is the one people miss:
 *     password-reset and magic-link URLs carry their token in `?token=…`, and a
 *     breadcrumb of "user navigated to /reset?token=abc" ships a live credential
 *     to a third party. Paths are kept because they are how you find the bug.
 *   - `data.body` / `data.response` on breadcrumbs (fetch/XHR payloads)
 *   - email addresses and key-shaped strings inside messages and exception text
 *
 * RELEASE IS DELIBERATELY UNSET. The repo stamps no build id — `cache-marker.ts`
 * holds a hand-edited 2025 timestamp, not a commit — and inventing a stamping
 * step is a separate change with its own build-pipeline blast radius. Without it
 * Sentry groups by error signature rather than by deploy; that is a real
 * limitation and it is stated rather than papered over.
 * ============================================================================
 */
import type * as Sentry from '@sentry/react';

/** Matches an email anywhere in free text. */
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

/**
 * Key shapes worth redacting, mirroring the list in Rule 47's launcher policy:
 * Stripe secret/restricted keys, webhook signing secrets, Slack bot tokens,
 * Google API keys, and JWTs.
 */
const KEYS = /(sk_live_|sk_test_|rk_live_|whsec_|xoxb-|AIza)[\w-]+|eyJ[\w-]{10,}\.[\w-]+\.[\w-]+/g;

const scrubText = (value: unknown): unknown => (
  typeof value === 'string'
    ? value.replace(EMAIL, '<redacted-email>').replace(KEYS, '<redacted-key>')
    : value
);

/** Strip a URL's query string while keeping the path — the path is the signal. */
const stripQuery = (url: unknown): unknown => (
  typeof url === 'string' ? url.split('?')[0] : url
);

export function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  // Headers, cookies, query and body all live here. None of it is needed to
  // locate a frontend bug.
  delete event.request;

  if (event.message) event.message = scrubText(event.message) as string;

  for (const entry of event.exception?.values ?? []) {
    if (entry.value) entry.value = scrubText(entry.value) as string;
  }

  for (const crumb of event.breadcrumbs ?? []) {
    if (!crumb.data) continue;
    if ('url' in crumb.data) crumb.data.url = stripQuery(crumb.data.url) as string;
    delete crumb.data.body;
    delete crumb.data.response;
  }

  if (event.extra) {
    for (const key of Object.keys(event.extra)) {
      event.extra[key] = scrubText(event.extra[key]);
    }
  }

  return event;
}

const dsn = import.meta.env?.VITE_SENTRY_DSN;

/**
 * The SDK is loaded DYNAMICALLY, and only when a DSN exists.
 *
 * This is not a style preference. A static import puts the whole SDK in the entry
 * chunk that every visitor downloads on first paint - measured at +31 KB gzipped -
 * and it is NOT tree-shaken away when the DSN is unset, because the import itself
 * has side effects Rollup must preserve. Members would have paid that on every
 * cold load to run code that does nothing. Behind `import()` it becomes a separate
 * chunk that is simply never fetched until reporting is switched on.
 *
 * The promise is created at startup, so by the time anything crashes the SDK is
 * long since resolved and reporting does not race the failure.
 */
let sdk: Promise<typeof Sentry> | null = null;

if (dsn) {
  sdk = import('@sentry/react').then((mod) => {
    mod.init({
      dsn,
      // Errors only. Performance tracing multiplies event volume and cost for a
      // signal nobody has asked for yet; turn it on deliberately, later.
      tracesSampleRate: 0,
      sendDefaultPii: false,
      beforeSend: scrubEvent,
    });
    return mod;
  });
}

/**
 * The single reporting entry point for application code.
 *
 * Call sites depend on THIS, never on the vendor SDK, so the gate cannot be
 * forgotten at a new call site and no component drags the SDK back into the
 * entry chunk. A no-op when reporting is off.
 */
export function reportError(error: unknown): void {
  if (!sdk) return;
  void sdk.then((mod) => mod.captureException(error));
}

/** True when reporting is actually live. Exposed for tests and diagnostics. */
export const isErrorReportingEnabled = Boolean(dsn);
