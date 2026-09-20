/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/creators.mjs
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
 * @module creator-brains-console/lib/creators
 */

import {
  readState, readRegistry, isDamaged, describeRead, stateOrDefault,
} from '../../../scripts/creator-brains/lib/store.mjs';
import { listCreatorsSafe, setEnabled, addCreator } from '../../../scripts/creator-brains/lib/registry.mjs';
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
 * POST /api/creators — add, or re-add without disturbing consent.
 *
 * THE FIRST SENTENCE HERE USED TO CLAIM MORE THAN THE CODE DID (A1-12). It read
 * "add, arriving DISABLED exactly as the CLI does". That holds only for a
 * creator the registry has never seen. `upsertCreator` deliberately preserves an
 * existing creator's `enabled` flag — the engine's own comment on `addCreator`:
 * "re-adding must never silently change whether we are allowed to fetch it" — so
 * a re-add of an ENABLED creator answers `enabled: true`. The code was right and
 * the sentence was wrong, which is worse than either: a wrong claim in a
 * security-adjacent docstring is how the next reader concludes a guard exists.
 * The rule is now stated as it is — new creators start disabled, existing
 * creators keep whatever the operator decided.
 *
 * The counts were genuinely wrong. They were hardcoded `0`, so re-adding a
 * creator that has fetched videos answered "0 videos" — a guard value presented
 * as a measurement, the same defect S1 fixed for `documents` in status.mjs and
 * for `setCreatorEnabled`'s row. `safeCounts` gives a measured count or `null`.
 *
 * `addCreator` reports a refusal as `{ ok:false, reason }` rather than throwing;
 * that reason is surfaced verbatim as a 422 so the console says what the CLI
 * would have said. Enabling stays a separate, deliberate act (tier T2) — a
 * console that auto-enabled a new creator would start fetching transcripts the
 * operator had not agreed to yet.
 *
 * WHY `deps` IS PASSED THROUGH. `addCreator` resolves a ref to a channel id by
 * running yt-dlp (`defaultResolveCreator` → `execFileSync`). Without a seam the
 * console's add path cannot be tested at all, and it was not: T-B3 asserts
 * `[201, 422].includes(status)`, which passes whether the row is right or wrong.
 * A1-12's correction — "test re-add of an enabled creator with fetched videos" —
 * was therefore unwritable. `deps` is the engine's own parameter, surfaced
 * unchanged; production callers omit it and get the real resolver.
 */
export async function addCreatorRow(ref, { r, deps = {} } = {}) {
  const value = validateRef(ref);
  const res = await addCreator({ ref: value, r, deps });
  if (!res.ok) throw new ApiError(CODE.REFUSED, res.reason);
  const c = res.creator;

  // The registry write has already committed by this line. Everything below must
  // be incapable of throwing (S1-H9) — `safeCounts` answers `null`, never a throw.
  const counts = safeCounts(r, c.channelId);
  return {
    channelId: c.channelId,
    title: c.title || c.channelId,
    enabled: c.enabled === true,
    videos: counts ? counts.videos : null,
    fetched: counts ? counts.fetched : null,
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
