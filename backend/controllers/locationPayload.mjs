/**
 * ============================================================================
 * FILE: locationPayload.mjs
 * PURPOSE: Pure request-payload logic for the Location controller — validation,
 *          field whitelisting, normalization, slug and id parsing.
 * ADDED: 2026-07-28 (SWA-74, gym-ops spine S0)
 * ============================================================================
 *
 * WHY THIS FILE EXISTS: locationController.mjs crossed the 300-line cap (CLAUDE.md rule 4) once the
 * hostile-review hardening landed. Everything here is pure — no DB, no req/res — so it splits out
 * cleanly and can be unit-tested without mocking a model.
 *
 * These helpers are deliberately SHARED between the create and update paths. Two independent
 * implementations of "the same" rule is exactly how the empty-slug defect got in: create rejected
 * an unusable slug, update silently persisted ''. One rule, one place.
 */

import { parseWallClock } from '../utils/zonedTime.mjs';

/** Upper bound on the free-form metadata blob, in serialized bytes. */
export const METADATA_MAX_BYTES = 16_384;

/** Fields a client may write. Anything absent from this list is ignored, never trusted. */
const WRITABLE_FIELDS = [
  'name', 'addressLine1', 'addressLine2', 'city', 'region', 'postalCode',
  'country', 'phone', 'timezone', 'opensAt', 'closesAt', 'isActive', 'metadata',
];

/** Address-ish free-text fields that should be trimmed, with blanks collapsed to null. */
const TRIMMED_TEXT_FIELDS = ['addressLine1', 'addressLine2', 'city', 'region', 'postalCode', 'phone'];

/** True when `zone` is a timezone Intl actually recognizes. */
export function isValidTimeZone(zone) {
  if (typeof zone !== 'string' || !zone.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse a path `:id` into a positive integer, or null.
 *
 * WHY: `id` is a SERIAL primary key. Handing Postgres a non-numeric value raises
 * `invalid input syntax for type integer`, which a generic catch turns into a 500 — so
 * `GET /api/locations/abc` reported a server failure for a plain client error, and let anyone
 * flood the error channel. Validate first; an unparseable id means "no such resource".
 */
export function parseId(raw) {
  const value = String(raw ?? '').trim();
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Canonicalize values on the way in, so what is stored matches what was validated.
 *
 * Validation ran against `name.trim()` while the raw value was persisted — "  Downtown Gym  " kept
 * its whitespace and disagreed with its own slug. Timezone is canonicalized because Intl accepts
 * case variants: 'america/los_angeles' validates, but storing it verbatim means two rows for one
 * zone compare unequal as strings.
 */
export function normalizeWritable(payload) {
  const out = { ...payload };
  if (typeof out.name === 'string') out.name = out.name.trim();
  if (typeof out.country === 'string') out.country = out.country.trim().toUpperCase();
  for (const field of TRIMMED_TEXT_FIELDS) {
    if (typeof out[field] === 'string') out[field] = out[field].trim() || null;
  }
  if (typeof out.timezone === 'string') {
    try {
      out.timezone = new Intl.DateTimeFormat('en-US', { timeZone: out.timezone })
        .resolvedOptions().timeZone;
    } catch {
      /* validatePayload already rejected it; do not mask the error here */
    }
  }
  return out;
}

/** Whitelist then normalize. Tolerates a missing body (no JSON payload arrives as undefined). */
export function pickWritable(body = {}) {
  const source = body || {};
  const out = {};
  for (const key of WRITABLE_FIELDS) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return normalizeWritable(out);
}

/**
 * Validate writable fields. Returns human-readable problems; empty means valid.
 *
 * `existing` is the current row on update, so pair-rules validate the POST-WRITE state rather than
 * the patch in isolation.
 */
export function validatePayload(body, { requireName, existing = {} }) {
  const problems = [];

  if (requireName || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      problems.push('name is required');
    } else if (body.name.trim().length > 150) {
      problems.push('name must be 150 characters or fewer');
    }
  }

  if (body.timezone !== undefined && !isValidTimeZone(body.timezone)) {
    problems.push('timezone must be a valid IANA zone, e.g. America/Los_Angeles');
  }

  // Hours are a PAIR — one side alone is a half-defined window the door-access slice would have to
  // invent a meaning for. Both null is fine ("no hours restriction"). Check the EFFECTIVE state:
  // an absent field means "will be null" on create but "leave as-is" on update.
  const effectiveOpens = body.opensAt !== undefined ? body.opensAt : (existing.opensAt ?? null);
  const effectiveCloses = body.closesAt !== undefined ? body.closesAt : (existing.closesAt ?? null);
  if (Boolean(effectiveOpens) !== Boolean(effectiveCloses)) {
    problems.push('opensAt and closesAt must be set together, or both null');
  }

  for (const field of ['opensAt', 'closesAt']) {
    const value = body[field];
    // null is meaningful — it clears the restriction. Only reject malformed non-null values.
    if (value !== undefined && value !== null && parseWallClock(value) === null) {
      problems.push(`${field} must be 'HH:mm' (24-hour) or null`);
    }
  }

  if (body.country !== undefined && body.country !== null) {
    if (typeof body.country !== 'string' || body.country.trim().length !== 2) {
      problems.push('country must be a 2-letter code');
    }
  }

  // metadata is a free-form JSONB escape hatch. Unbounded it is a storage/DoS vector even from an
  // admin account, and an oversized row degrades every list query that selects it.
  if (body.metadata !== undefined && body.metadata !== null) {
    if (typeof body.metadata !== 'object' || Array.isArray(body.metadata)) {
      problems.push('metadata must be a JSON object');
    } else {
      let serialized;
      try {
        serialized = JSON.stringify(body.metadata);
      } catch {
        problems.push('metadata must be JSON-serializable'); // circular refs
      }
      if (serialized && serialized.length > METADATA_MAX_BYTES) {
        problems.push(`metadata must be under ${METADATA_MAX_BYTES} bytes`);
      }
    }
  }

  return problems;
}

/**
 * Derive the slug to persist, or return a problem.
 *
 * SHARED BY create AND update ON PURPOSE. They previously derived slugs independently and drifted:
 * create rejected an empty result while update happily persisted '' when given something like
 * "---" (raw value truthy, slugified value not). An empty slug breaks the public identifier and
 * slips past the partial unique index.
 *
 * @returns {{slug?: string, problem?: string}} slug omitted when the caller supplied nothing.
 */
export function resolveSlug({ explicitSlug, name, required, slugify }) {
  const source = typeof explicitSlug === 'string' && explicitSlug.trim()
    ? explicitSlug
    : (required ? name : null);
  if (source === null || source === undefined) return {};        // update with no slug change

  const slug = slugify(source);
  if (!slug) {
    return { problem: 'Could not derive a usable slug; provide an explicit alphanumeric slug' };
  }
  return { slug };
}
