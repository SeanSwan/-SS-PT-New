/**
 * Location Controller — Gym Operations Spine (S0)
 * ===============================================
 *
 * Purpose:
 * CRUD for physical facilities. Reads are available to any authenticated user (the class schedule
 * and check-in surfaces need to name a site); mutations are admin-only.
 *
 * Blueprint: docs/ai-workflow/AI-HANDOFF/GYM-OPS-SPINE-BUILD-BLUEPRINT-V2-2026-07-28.md §S0
 * Linear: SWA-74
 *
 * WHY slug is derived, not accepted from the client:
 * It is a stable public identifier. Letting callers set it invites collisions and unsanitized
 * values in URLs. Derived from `name`, with an explicit override permitted for admins only.
 *
 * WHY timezone is validated:
 * An invalid IANA zone does not fail loudly at write time — it fails much later, when a class
 * occurrence is materialized and Intl throws or silently falls back to UTC, shifting every class
 * at that site. Validating here keeps the failure at the point of the mistake.
 */

import Location from '../models/Location.mjs';
import { parseWallClock } from '../utils/zonedTime.mjs';
import logger from '../utils/logger.mjs';

/** Upper bound on the free-form metadata blob, in serialized bytes. */
const METADATA_MAX_BYTES = 16_384;

/** True when `zone` is a timezone Intl actually recognizes. */
function isValidTimeZone(zone) {
  if (typeof zone !== 'string' || !zone.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate the writable fields shared by create and update.
 * Returns an array of human-readable problems; empty means valid.
 */
function validatePayload(body, { requireName }) {
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

  for (const field of ['opensAt', 'closesAt']) {
    const value = body[field];
    // null is meaningful: it clears the restriction. Only reject malformed non-null values.
    if (value !== undefined && value !== null && parseWallClock(value) === null) {
      problems.push(`${field} must be 'HH:mm' (24-hour) or null`);
    }
  }

  if (body.country !== undefined && body.country !== null) {
    if (typeof body.country !== 'string' || body.country.trim().length !== 2) {
      problems.push('country must be a 2-letter code');
    }
  }

  // metadata is a free-form JSONB escape hatch. Unbounded, it is a storage/DoS vector even from an
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
 * Parse a path `:id` into a positive integer, or null.
 *
 * WHY THIS EXISTS: `id` is a SERIAL primary key. Handing Postgres a non-numeric value raises
 * `invalid input syntax for type integer`, which the generic catch below turns into a 500 — so
 * `GET /api/locations/abc` reported a server failure for what is plainly a client error, and
 * polluted error monitoring with noise that looks like the backend is broken. Validate first and
 * treat an unparseable id as "no such resource".
 */
function parseId(raw) {
  const value = String(raw ?? '').trim();
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Derive the slug to persist, or return a problem.
 *
 * SHARED BY create AND update ON PURPOSE. These two paths previously derived slugs independently,
 * and they drifted: create rejected an empty result while update happily persisted `''` when given
 * something like "---" (the raw value is truthy, the slugified value is not). An empty slug breaks
 * the public identifier and the partial unique index silently. One helper, one rule.
 *
 * @returns {{slug?: string, problem?: string}} slug omitted when the caller supplied nothing.
 */
function resolveSlug({ explicitSlug, name, required }) {
  const source = typeof explicitSlug === 'string' && explicitSlug.trim() ? explicitSlug : (required ? name : null);
  if (source === null || source === undefined) return {};          // update with no slug change

  const slug = Location.slugify(source);
  if (!slug) {
    return { problem: 'Could not derive a usable slug; provide an explicit alphanumeric slug' };
  }
  return { slug };
}

/**
 * Whitelist of client-writable fields. Anything not listed here is ignored, not trusted.
 * Tolerates a missing body: a request with no JSON payload (or the wrong content-type) arrives as
 * undefined, and indexing it would throw a TypeError that surfaces as an opaque 500.
 */
function pickWritable(body = {}) {
  const source = body || {};
  const allowed = [
    'name', 'addressLine1', 'addressLine2', 'city', 'region', 'postalCode',
    'country', 'phone', 'timezone', 'opensAt', 'closesAt', 'isActive', 'metadata',
  ];
  const out = {};
  for (const key of allowed) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

/** GET /api/locations — active sites by default; ?includeInactive=true for admins' management view. */
export const listLocations = async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
    const where = includeInactive ? {} : { isActive: true };
    const locations = await Location.findAll({ where, order: [['name', 'ASC']] });
    return res.status(200).json({ success: true, locations });
  } catch (error) {
    logger.error('Failed to list locations', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to list locations' });
  }
};

/**
 * GET /api/locations/slug/:slug
 *
 * The slug is the stable public identifier — it is what the unique index protects and what a
 * member-facing URL would carry. Without this it was write-only: derivable and enforced, but not
 * resolvable, so every consumer would have to list all locations and filter client-side.
 *
 * Registered BEFORE /:id in the router so 'slug' is never swallowed as an id.
 */
export const getLocationBySlug = async (req, res) => {
  try {
    const location = await Location.findOne({ where: { slug: String(req.params.slug || '').toLowerCase() } });
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }
    return res.status(200).json({ success: true, location });
  } catch (error) {
    logger.error('Failed to fetch location by slug', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch location' });
  }
};

/** GET /api/locations/:id */
export const getLocationById = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }
    const location = await Location.findByPk(id);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }
    return res.status(200).json({ success: true, location });
  } catch (error) {
    logger.error('Failed to fetch location', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch location' });
  }
};

/** POST /api/locations — admin only. */
export const createLocation = async (req, res) => {
  try {
    // Normalize once. A request with no JSON body arrives as undefined, and every later
    // dereference would throw a TypeError that surfaces as an opaque 500.
    const body = req.body || {};

    const problems = validatePayload(body, { requireName: true });
    if (problems.length) {
      return res.status(400).json({ success: false, message: 'Invalid location', problems });
    }

    const payload = pickWritable(body);
    const { slug, problem } = resolveSlug({ explicitSlug: body.slug, name: payload.name, required: true });
    if (problem) {
      return res.status(400).json({ success: false, message: problem });
    }
    payload.slug = slug;

    const location = await Location.create(payload);
    return res.status(201).json({ success: true, location });
  } catch (error) {
    // The partial unique index is the authority on slug collisions, not a pre-check — a pre-check
    // would race two concurrent creates.
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A location with that slug already exists' });
    }
    logger.error('Failed to create location', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to create location' });
  }
};

/** PUT /api/locations/:id — admin only. */
export const updateLocation = async (req, res) => {
  try {
    const body = req.body || {};

    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }
    const location = await Location.findByPk(id);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    const problems = validatePayload(body, { requireName: false });
    if (problems.length) {
      return res.status(400).json({ success: false, message: 'Invalid location', problems });
    }

    const payload = pickWritable(body);
    // Slug only moves when explicitly asked. Renaming a site must not silently break URLs or any
    // external reference already using the old slug. Same helper as create — an unusable slug is
    // a 400 here too, never a persisted empty string.
    const { slug, problem } = resolveSlug({ explicitSlug: body.slug, name: payload.name, required: false });
    if (problem) {
      return res.status(400).json({ success: false, message: problem });
    }
    if (slug !== undefined) payload.slug = slug;

    await location.update(payload);
    return res.status(200).json({ success: true, location });
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'A location with that slug already exists' });
    }
    logger.error('Failed to update location', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to update location' });
  }
};

/**
 * DELETE /api/locations/:id — admin only. SOFT delete (model is paranoid).
 * Sessions referencing this location keep their row; the FK is ON DELETE SET NULL, and a soft
 * delete does not fire it at all, so operational history stays intact either way.
 */
export const deleteLocation = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }
    const location = await Location.findByPk(id);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }
    await location.destroy();
    return res.status(200).json({ success: true, message: 'Location deleted' });
  } catch (error) {
    logger.error('Failed to delete location', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to delete location' });
  }
};

export default {
  listLocations,
  getLocationBySlug,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
};
