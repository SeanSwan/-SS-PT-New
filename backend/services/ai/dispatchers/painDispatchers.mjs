/**
 * ============================================================================
 * FILE: dispatchers/painDispatchers.mjs
 * PURPOSE: Dispatcher handlers for pain-domain AI commands
 * OWNER: Claude Sonnet 4.6 | CREATED: 2026-04-10
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Implements pain-domain command handlers.
 * Extracted from commandDispatcher.mjs to keep that file under 300 lines.
 *
 * COMMANDS:
 *   H01: view_active_pain    — flat scalar summary of a client's active pain entries
 *   H02: add_pain_entry      — confirmed write via painWriteService (validated)
 *   H03: resolve_pain_entry  (v11) — exact-or-error bodyRegion resolution, sets isActive=false
 *   H04: update_pain_entry   (v11) — exact-or-error bodyRegion resolution, updates painLevel/notes
 *
 * RESOLUTION CONTRACT (H03/H04):
 *   0 active rows for bodyRegion → honest not-found error
 *   2+ active rows              → honest ambiguity error (no silent row selection)
 *   1 active row                → proceed
 */

import { getClientPainEntry } from '../../../models/index.mjs';
import { createPainEntry } from '../painWriteService.mjs';
import { resolvePainEntry, updatePainEntryByRegion } from '../painFollowUpService.mjs';

/**
 * view_active_pain
 * Returns a flat card-friendly summary of all active pain entries.
 * No row limit — count is always truthful.
 *
 * @returns {{ count, highestPainLevel, mostRecentRegion, regions }}
 */
export async function viewActivePain(params, ctx) {
  const ClientPainEntry = getClientPainEntry();
  const clientId = params.clientId ?? ctx.resolvedClient?.id;

  const rows = await ClientPainEntry.findAll({
    where:      { userId: clientId, isActive: true },
    attributes: ['bodyRegion', 'painLevel'],
    order:      [['painLevel', 'DESC'], ['createdAt', 'DESC']],
  });

  const count = rows.length;
  if (count === 0) {
    return { count: 0, highestPainLevel: null, mostRecentRegion: null, regions: null };
  }

  const highest = Math.max(...rows.map(r => r.painLevel || 0));
  const mostRecentRegion = rows[0]?.bodyRegion ?? null;
  // Deduplicate regions for readable display (highest-level first due to ORDER BY)
  const regions = [...new Set(rows.map(r => r.bodyRegion))].join(', ');

  return { count, highestPainLevel: highest, mostRecentRegion, regions };
}

/**
 * add_pain_entry
 * Confirmed write — validation preserved via painWriteService.
 * Throws on invalid bodyRegion or painLevel; dispatcher catches and returns user-facing error.
 *
 * @returns {{ entryId, userId, bodyRegion, painLevel, isActive }}
 */
export async function addPainEntry(params, ctx) {
  const clientId = params.clientId ?? ctx.resolvedClient?.id;
  return createPainEntry(
    { bodyRegion: params.bodyRegion, painLevel: params.painLevel, notes: params.notes },
    { clientId, trainerId: ctx.user.id },
  );
}

// ── H03: resolve_pain_entry ───────────────────────────────────────────────────

/**
 * Resolve a client's active pain entry, identified by bodyRegion.
 * Exact-or-error: 0 matches → not-found error; 2+ → ambiguity error.
 *
 * @returns {{ entryId, userId, bodyRegion, isActive, resolvedAt }}
 */
export async function dispatchResolvePainEntry(params, ctx) {
  const clientId = params.clientId ?? ctx.resolvedClient?.id;
  return resolvePainEntry(
    { bodyRegion: params.bodyRegion },
    { clientId, trainerId: ctx.user.id },
  );
}

// ── H04: update_pain_entry ────────────────────────────────────────────────────

/**
 * Update a client's active pain entry, identified by bodyRegion.
 * Exact-or-error resolution. Requires at least one of: painLevel or notes.
 *
 * @returns {{ entryId, userId, bodyRegion, painLevel, isActive }}
 */
export async function dispatchUpdatePainEntry(params, ctx) {
  const clientId = params.clientId ?? ctx.resolvedClient?.id;
  return updatePainEntryByRegion(
    { bodyRegion: params.bodyRegion, painLevel: params.painLevel, notes: params.notes },
    { clientId, trainerId: ctx.user.id },
  );
}
