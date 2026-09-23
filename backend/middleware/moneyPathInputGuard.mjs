/**
 * Money-path input boundary (H-14 slice, hostile review fixing pass)
 * ===================================================================
 * H-14 measured 616 mutating route registrations against 9 declarative
 * validation call sites. The honest caveat in that finding still stands:
 * several money-path handlers DO validate their own semantics inline
 * (v2PaymentRoutes checks cartId, cartRoutes checks quantity, verify-session
 * uses validateCheckoutSessionId). What no handler had was a BOUNDARY.
 *
 * This middleware is that boundary, deliberately scoped so it cannot change
 * any response the app produces today for valid input:
 *
 *   - it never rewrites req.body (no schema coercion, no key stripping), so
 *     every existing handler — and its existing 400s — behaves identically
 *   - it rejects only shapes no legitimate client can produce:
 *       * a non-object body (array / string / number)
 *       * prototype-pollution keys
 *       * any single string field over the cap
 *       * a body over the serialized-size cap
 *
 * That is the difference between "the handler happened to check" and "an
 * oversized or malformed payload cannot reach the money path at all".
 */

const MAX_FIELD_LENGTH = 4000;      // longest legitimate field is a URL/referrer
const MAX_BODY_BYTES = 64 * 1024;   // 64 KB — checkout bodies are tiny
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function findViolation(value, path, depth = 0) {
  if (depth > 6) return { reason: 'nesting_too_deep', path };
  if (typeof value === 'string') {
    if (value.length > MAX_FIELD_LENGTH) return { reason: 'field_too_long', path };
    return null;
  }
  if (value === null || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    if (value.length > 200) return { reason: 'array_too_long', path };
    for (let i = 0; i < value.length; i += 1) {
      const hit = findViolation(value[i], `${path}[${i}]`, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) return { reason: 'forbidden_key', path: `${path}.${key}` };
    const hit = findViolation(value[key], `${path}.${key}`, depth + 1);
    if (hit) return hit;
  }
  return null;
}

/**
 * Express middleware factory.
 * @param {string} endpointName - included in the rejection payload for triage
 */
export function moneyPathInputGuard(endpointName) {
  return (req, res, next) => {
    const body = req.body;

    if (body === undefined || body === null) return next(); // handler decides

    if (typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body',
        error: { code: 'INVALID_BODY', endpoint: endpointName },
      });
    }

    let serialized;
    try {
      serialized = JSON.stringify(body);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body',
        error: { code: 'INVALID_BODY', endpoint: endpointName },
      });
    }

    if (serialized.length > MAX_BODY_BYTES) {
      return res.status(413).json({
        success: false,
        message: 'Request body too large',
        error: { code: 'BODY_TOO_LARGE', endpoint: endpointName },
      });
    }

    const violation = findViolation(body, 'body');
    if (violation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body',
        error: { code: 'INVALID_BODY', endpoint: endpointName, ...violation },
      });
    }

    return next();
  };
}

export default moneyPathInputGuard;
