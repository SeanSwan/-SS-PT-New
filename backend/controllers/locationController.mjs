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
import Session from '../models/Session.mjs';
import logger from '../utils/logger.mjs';
import {
  parseId,
  pickWritable,
  validatePayload,
  resolveSlug,
} from './locationPayload.mjs';

/** GET /api/locations — active sites by default; ?includeInactive=true for admins' management view. */
export const listLocations = async (req, res) => {
  try {
    // Optional chaining, matching deleteLocation's `req.query?.force` below: a caller with no
    // query object at all (a direct invocation, or a test) otherwise threw inside the try and
    // surfaced as a 500 on a request that should simply list everything. Caught by this
    // controller's own test, which was failing before this fix.
    const includeInactive = String(req.query?.includeInactive || '').toLowerCase() === 'true';
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
    const { slug, problem } = resolveSlug({
      explicitSlug: body.slug, name: payload.name, required: true, slugify: Location.slugify,
    });
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

    // Pass the current row so pair-rules (hours) validate the post-update state, not just the patch.
    const problems = validatePayload(body, { requireName: false, existing: location });
    if (problems.length) {
      return res.status(400).json({ success: false, message: 'Invalid location', problems });
    }

    const payload = pickWritable(body);
    // Slug only moves when explicitly asked. Renaming a site must not silently break URLs or any
    // external reference already using the old slug. Same helper as create — an unusable slug is
    // a 400 here too, never a persisted empty string.
    const { slug, problem } = resolveSlug({
      explicitSlug: body.slug, name: payload.name, required: false, slugify: Location.slugify,
    });
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
 *
 * GUARDED, because a soft delete is quietly destructive here. Sessions keep their `locationId`, and
 * `ON DELETE SET NULL` does NOT fire on a paranoid delete — so every session at that site is left
 * pointing at a row that no longer resolves. Nothing errors; the schedule just stops being able to
 * say where anything happened. An admin retiring a site has no way to know how much history they
 * are about to detach.
 *
 * So: report the attached-session count and refuse, unless the caller passes ?force=true. Deleting
 * an unused location stays a one-step operation; deleting a used one becomes deliberate.
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

    const force = String(req.query?.force || '').toLowerCase() === 'true';
    let attachedSessions = 0;
    try {
      attachedSessions = await Session.count({ where: { locationId: id } });
    } catch (countError) {
      // Never let the safety check itself become the failure mode — but do not silently pretend
      // the location is unused either. Fail closed: refuse the delete and say why.
      logger.error('Could not count sessions before location delete', { error: countError.message });
      return res.status(503).json({
        success: false,
        message: 'Could not verify whether this location is in use; delete not attempted',
      });
    }

    if (attachedSessions > 0 && !force) {
      return res.status(409).json({
        success: false,
        message: `This location is referenced by ${attachedSessions} session(s). `
          + 'Those sessions will keep a reference that no longer resolves. '
          + 'Re-send with ?force=true to proceed, or set isActive=false to retire it without detaching history.',
        attachedSessions,
      });
    }

    await location.destroy();
    logger.info('Location soft-deleted', { locationId: id, attachedSessions, force });
    return res.status(200).json({ success: true, message: 'Location deleted', attachedSessions });
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
