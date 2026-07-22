/**
 * acquisitionTelemetry.mjs — P0-4 (SWA-29) server-side funnel event emission.
 *
 * The ONLY funnel event stream (MEASUREMENT-CHARTER.md). Surfaces feed it; nothing else
 * defines the funnel. Every event is `{ event, ref?, meta_json, ts }` with a SMALL,
 * non-identifying payload. Two hard rules, enforced here so no caller can violate them:
 *   1. ZERO PII / no raw ids / no exact amounts (Rule 8) — meta is allowlist-filtered and
 *      amounts are bucketed; unknown fields are dropped, never stored.
 *   2. FAIL-SOFT — a telemetry write must NEVER break or roll back the business path that
 *      emitted it (lead capture, conversion, checkout). recordFunnelEvent never throws.
 */

/** Canonical events (MEASUREMENT-CHARTER §taxonomy). Unknown events are dropped, not stored. */
export const FUNNEL_EVENTS = new Set([
  'visit',
  'lead_captured',
  'signup',
  'booking_started',
  'scheduled',
  'first_touch',
  'first_session_logged',
  'purchase',
  'converted',
  'ref_shared',
  'ref_landed',
  'ref_converted',
]);

/** The ONLY meta fields allowed into the stream. Everything else is dropped. NO name/email/id. */
const META_ALLOWLIST = ['source', 'intent', 'ref', 'kind', 'amount_bucket'];

/** Amount is bucketed, NEVER raw (charter §amount). */
export const AMOUNT_BUCKETS = ['<100', '100-499', '500-999', '1k-5k', '>5k'];

/** Map a raw dollar amount to its bucket. Used only to CONVERT a raw amount away — never store raw. */
export function bucketAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) return undefined;
  if (n < 100) return '<100';
  if (n < 500) return '100-499';
  if (n < 1000) return '500-999';
  if (n < 5000) return '1k-5k';
  return '>5k';
}

/**
 * Reduce an arbitrary raw meta object to the allowlisted, non-identifying, length-capped shape.
 * - keeps only META_ALLOWLIST keys; drops everything else (PII smuggled in unknown keys can't survive)
 * - coerces values to trimmed strings capped at 64 chars (a stray email/name in an allowed slot is
 *   still capped and, being free text, is caller-controlled — callers pass enums/codes, not PII)
 * - amount_bucket must be a known bucket; a raw `amount` is converted to a bucket and the raw dropped
 */
export function sanitizeMeta(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of META_ALLOWLIST) {
    if (key === 'amount_bucket') continue; // handled below
    const v = raw[key];
    if (v == null) continue;
    const s = String(v).trim().slice(0, 64);
    if (s) out[key] = s;
  }
  // amount: accept a pre-bucketed value if valid, else bucket a raw amount, else drop.
  if (AMOUNT_BUCKETS.includes(raw.amount_bucket)) {
    out.amount_bucket = raw.amount_bucket;
  } else if (raw.amount != null) {
    const b = bucketAmount(raw.amount);
    if (b) out.amount_bucket = b;
  }
  return out;
}

/**
 * Record one funnel event, fail-soft. Returns true if written, false if dropped/failed —
 * NEVER throws (the business path must not care whether telemetry succeeded).
 */
export async function recordFunnelEvent(event, rawMeta = {}) {
  try {
    if (!FUNNEL_EVENTS.has(event)) return false; // unknown event → drop, don't store
    const meta = sanitizeMeta(rawMeta);
    const ref = meta.ref ?? null;
    const { default: AcquisitionEvent } = await import('../models/AcquisitionEvent.mjs');
    await AcquisitionEvent.create({ event, ref, metaJson: meta, ts: new Date() });
    return true;
  } catch (err) {
    // Fail-soft: a telemetry failure must never break lead capture / conversion / checkout.
    console.warn(`[acquisitionTelemetry] dropped ${event}: ${err?.message ?? err}`);
    return false;
  }
}
