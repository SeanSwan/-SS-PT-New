// backend/services/print/prodigiClient.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Slice 3c — thin Prodigi Print API v4.0 REST client.
// Docs: https://www.prodigi.com/print-api/docs/reference/  (Orders: POST /Orders)
// Never logs the API key or response bodies (may carry recipient PII).
// ─────────────────────────────────────────────────────────────────────────────
import logger from '../../utils/logger.mjs';
import { prodigiBaseUrl, prodigiApiKey } from './prodigiConfig.mjs';

const REQUEST_TIMEOUT_MS = 20000;

async function prodigiFetch(path, { method = 'GET', body, idempotencyKey } = {}) {
  const apiKey = prodigiApiKey();
  if (!apiKey) return { ok: false, status: 0, error: 'PRODIGI_API_KEY not configured' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers = { 'X-API-Key': apiKey, 'Content-Type': 'application/json' };
    // Prodigi honours Idempotency-Key on order create → a duplicate submit never
    // creates a second physical order (belt; the DB CAS is the suspenders).
    if (idempotencyKey) headers['Idempotency-Key'] = String(idempotencyKey);

    const res = await fetch(`${prodigiBaseUrl()}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    let json = null;
    try { json = await res.json(); } catch { /* non-JSON / empty body */ }

    if (!res.ok) {
      // Log status only — never the response body (may include recipient PII).
      logger.error('[Prodigi] %s %s → HTTP %d', method, path, res.status);
      return { ok: false, status: res.status, error: `Prodigi HTTP ${res.status}`, body: json };
    }
    return { ok: true, status: res.status, body: json };
  } catch (err) {
    const aborted = err?.name === 'AbortError';
    logger.error('[Prodigi] %s %s failed: %s', method, path, aborted ? 'timeout' : err.message);
    return { ok: false, status: 0, error: aborted ? 'Prodigi request timed out' : 'Prodigi request failed' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Create a Prodigi order.
 * @param {Object} payload - Prodigi Orders body ({ shippingMethod, recipient, items }).
 * @param {Object} [opts]
 * @param {string} [opts.idempotencyKey] - de-dupe key so a retry never double-orders.
 * @returns {Promise<{ok:boolean, status:number, providerOrderId?:string, error?:string, body?:any}>}
 */
export async function createProdigiOrder(payload, { idempotencyKey } = {}) {
  const r = await prodigiFetch('/Orders', { method: 'POST', body: payload, idempotencyKey });
  if (!r.ok) return r;
  const providerOrderId = r.body?.order?.id ? String(r.body.order.id) : null;
  if (!providerOrderId) return { ok: false, status: r.status, error: 'Prodigi response missing order id' };
  return { ok: true, status: r.status, providerOrderId, body: r.body };
}

/** Fetch a Prodigi order (used by the retry/status reconcile path). */
export async function getProdigiOrder(providerOrderId) {
  return prodigiFetch(`/Orders/${encodeURIComponent(providerOrderId)}`);
}
