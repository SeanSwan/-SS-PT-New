/**
 * ============================================================================
 * FILE: scripts/creator-brains/console/lib/creators.mjs
 * PURPOSE: The creator roster and the bounded writes that change it.
 * PART OF: Creator Brains Console (blueprint 05 §1, §2)
 * SLICE: S0
 * ============================================================================
 *
 * THE ONE RULE IN THIS FILE. Every mutation goes through the engine's own
 * tested functions — `addCreator`, `setEnabled`. The bridge adds validation and
 * tier labels; it NEVER adds a write path of its own. `registry.json` is written
 * by `setEnabled` and by nothing else, so the CLI and the console cannot
 * produce two different registries.
 *
 * WHY THIS MATTERS MORE THAN IT LOOKS. A registry write is a lost-update
 * hazard: two writers, one file, no transaction. The single-instance pid guard
 * in server.mjs keeps two console windows from racing; delegating the write to
 * the engine keeps the console from racing the CLI.
 *
 * THE ROSTER'S COUNTS ARE DUPLICATED, ON PURPOSE AND WITH A REASON.
 * `videos`/`fetched` per creator are computed by filtering `state.videos` on
 * `channelId`, which is the same computation `launch.mjs renderCreators` does.
 * The alternative is an engine function that does not currently exist, and S0's
 * no-go boundary forbids adding one. So the console and the terminal menu agree
 * today by construction (same inputs, same rule), and would drift only if the
 * engine's state shape changed — which the engine's own suite would catch first.
 * Recorded as a known duplication rather than presented as delegation.
 *
 * @module creator-brains/console/lib/creators
 */

import {
  readState, readRegistry, isDamaged, describeRead, stateOrDefault,
} from '../../lib/store.mjs';
import { listCreatorsSafe, setEnabled, addCreator } from '../../lib/registry.mjs';
import { ApiError, CODE, validateRef, validateChannelId } from './errors.mjs';

/** GET /api/creators — the console's roster, counts included. */
export function creatorRows(r) {
  const regRead = readRegistry(r);
  if (isDamaged(regRead)) {
    throw new ApiError(CODE.STORE_DAMAGED, describeRead(regRead), { file: 'registry.json' });
  }
  const catalog = listCreatorsSafe(r);
  if (!catalog.ok) {
    throw new ApiError(CODE.STORE_DAMAGED, describeRead(catalog.read), { file: 'registry.json' });
  }
  const stateRead = readState(r);
  if (isDamaged(stateRead)) {
    throw new ApiError(CODE.STORE_DAMAGED, describeRead(stateRead), { file: 'state.json' });
  }
  const all = Object.values(stateOrDefault(stateRead).videos || {});

  return catalog.creators.map((c) => {
    const videos = all.filter((v) => v.channelId === c.channelId);
    return {
      channelId: c.channelId,
      title: c.title || c.channelId,
      enabled: c.enabled === true,
      videos: videos.length,
      fetched: videos.filter((v) => v.state === 'fetched').length,
    };
  });
}

/**
 * POST /api/creators — add, arriving DISABLED exactly as the CLI does.
 *
 * `addCreator` reports a refusal as `{ ok:false, reason }` rather than throwing;
 * that reason is surfaced verbatim as a 422 so the console says what the CLI
 * would have said. Enabling stays a separate, deliberate act (tier T2) — a
 * console that auto-enabled a new creator would start fetching transcripts the
 * operator had not agreed to yet.
 */
export async function addCreatorRow(ref, { r }) {
  const value = validateRef(ref);
  const res = await addCreator({ ref: value, r });
  if (!res.ok) throw new ApiError(CODE.REFUSED, res.reason);
  const c = res.creator;
  return {
    channelId: c.channelId,
    title: c.title || c.channelId,
    enabled: c.enabled === true,
    videos: 0,
    fetched: 0,
  };
}

/**
 * Counts for ONE creator, or `null` when they cannot be taken.
 *
 * THIS FUNCTION IS ALLOWED TO GIVE UP; IT IS NOT ALLOWED TO THROW (S1-H9). It
 * runs only after `setEnabled` has already persisted the registry, so a throw
 * here would report a completed write as a refusal — see `setCreatorEnabled`.
 *
 * WHY `null` AND NOT `0`. A count that could not be taken is ABSENT, not zero.
 * Reporting `0` renders "0 videos" for a creator that has videos — a guard value
 * presented as a measurement, which is precisely the defect the S1 round fixed
 * for `documents` in status.mjs:148. `null` forces the reader to decide.
 */
function safeCounts(r, channelId) {
  try {
    const read = readState(r);
    if (isDamaged(read)) return null;
    const videos = Object.values(stateOrDefault(read).videos || {})
      .filter((v) => v.channelId === channelId);
    return { videos: videos.length, fetched: videos.filter((v) => v.state === 'fetched').length };
  } catch {
    return null; // the store moved under us mid-write; the write still stands
  }
}

/** PATCH /api/creators/:channelId — enable/disable via the engine's own setter. */
export function setCreatorEnabled(channelId, enabled, { r }) {
  const catalog = listCreatorsSafe(r);
  if (!catalog.ok) {
    throw new ApiError(CODE.STORE_DAMAGED, describeRead(catalog.read), { file: 'registry.json' });
  }
  const id = validateChannelId(channelId, catalog.creators);

  let c;
  try {
    c = setEnabled(r, id, enabled === true);
  } catch (e) {
    throw new ApiError(CODE.REFUSED, e.message);
  }

  // THE WRITE HAS ALREADY COMMITTED AT THIS LINE (S1-H9). Every statement below
  // must be incapable of throwing: an error raised here would answer 409 for a
  // mutation that is already on disk, so "refused" would stop meaning "nothing
  // changed" — the one property a write client must be able to rely on.
  //
  // The original code re-read the roster through `creatorRows` to guarantee the
  // response row matched the roster's shape. `creatorRows` is a ROSTER READ and
  // legitimately refuses 409 on a damaged `state.json`, so a state fault turned
  // a successful toggle into a 409 — after the fact, with the registry already
  // written. Measured: 409 returned, `enabled`/`enabledAt` persisted.
  const counts = safeCounts(r, c.channelId);
  return {
    channelId: c.channelId,
    title: c.title || c.channelId,
    enabled: c.enabled === true,
    videos: counts ? counts.videos : null,
    fetched: counts ? counts.fetched : null,
  };
}
