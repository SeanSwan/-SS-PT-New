#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/registry.mjs
 * PURPOSE: The creator catalog — store a resolved creator DISABLED, behind
 *          strict reads, and under the store lock.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR05)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13 | SPLIT 2026-09-23 (F04)
 * ============================================================================
 *
 * WHAT MOVED, AND WHY. The half of the add path that turns a ref into a channel
 * identity now lives in `registry-resolve.mjs`, because the console runs it on a
 * worker thread it TERMINATES on a deadline and a thread that can be killed must
 * own nothing that needs cleaning up. What stays here is the half that owns the
 * store: the lock, the fresh read, the mutation and the write.
 *
 * WHAT THE REVIEW FOUND (HR05):
 *   An unreadable registry was treated as an EMPTY one. A run then reported
 *   `ok: true`, and `add` happily wrote a fresh catalog over the damaged file,
 *   discarding every owner enable/disable choice, label and discovery
 *   bookkeeping. The catalog is AUTHORITATIVE OWNER STATE, not a cache: it is
 *   the record of which creators the owner deliberately turned on.
 *
 *   Every read now goes through `schema.mjs`, and every write refuses when the
 *   read was damaged. Creating a catalog that does not exist yet is still a
 *   valid first run — that is `absent`, which is a different status from
 *   `corrupt`.
 *
 * @module creator-brains/registry
 */

import {
  readRegistry, registryOrDefault, isDamaged, describeRead, saveRegistry, upsertCreator,
} from './store.mjs';
import { isChannelId, resolveCreatorRef } from './registry-resolve.mjs';
import { damagedRefusal, lockedRefusal } from './registry-write-guard.mjs';
import { nowIso } from './paths.mjs';
import { acquireLock } from './lock.mjs';

export class RegistryError extends Error {}

/**
 * Commit an ALREADY-RESOLVED creator to the catalog, under the store lock.
 *
 * Returns `{ok:true, creator, reason:null}` — carrying `releaseFailed:true` when
 * the cleanup could not free the store — or `{ok:false, reason}`, with
 * `locked:true` when another writer owns it. Synchronous and network-free by
 * construction: there is no await inside the critical section, so nothing can
 * interleave with the read-modify-write.
 *
 * ── WHY THE INPUT IS VALIDATED AGAIN (F04) ──────────────────────────────────
 *
 * The console's production path calls this with a `resolved` object that arrived
 * over a THREAD BOUNDARY as serialised data. `resolveCreatorRef` already checked
 * it, but that check ran on a different thread against a value that was then
 * re-materialised — so the shape is re-established here rather than trusted. The
 * worker's own header makes the same point about `deps`: a seam that is harmless
 * in-process becomes an execution path once it crosses a thread boundary.
 *
 * ── WHY THE RESOLVE IS OUTSIDE AND THE READ IS INSIDE ───────────────────────
 *
 * This path used to be an UNLOCKED READ-MODIFY-WRITE of `registry.json`, and the
 * S1-H12 remedy made that a lost update: moving the resolve onto a worker thread
 * gave it genuine parallelism against `setEnabled` on the main thread, so one
 * snapshot could overwrite the other's committed enable. Measured reproduction:
 * `packages/creator-brains-console/test/creator-add.registry-race.test.mjs`.
 *
 * The fix is the engine's own cross-process lock, and WHERE it goes is the whole
 * design. Holding it across the 180 s yt-dlp subprocess would block the CLI, the
 * daily run and every console write for three minutes — converting a data-loss
 * bug into an availability one. So the split is by KIND of work: resolution is
 * outside (`registry-resolve.mjs`), and only the read, the mutation and the write
 * are inside. The read inside the lock must be a FRESH read; reusing the
 * pre-flight snapshot would leave the lost update in place while appearing to
 * hold a lock.
 *
 * A held lock REFUSES rather than queues, matching `lock.mjs`'s own doctrine: a
 * scheduled run waiting behind a manual one is how a store gets two writers
 * "safely". The refusal is reported as `{ok:false, locked:true}` — never a throw
 * — because every existing caller already handles the `{ok:false, reason}` shape.
 *
 * WHY THIS DOES NOT USE `withLock`. This function is SYNCHRONOUS by design — the
 * console commits on the MAIN thread (F04), where an await inside the critical
 * section would let another writer interleave — and `withLock` is async, so the
 * lock is taken and given back by hand. `setEnabled` does the same for the same
 * reason.
 */
export function commitResolvedCreator({ r, ref, resolved, name = null, now }) {
  if (!resolved || !isChannelId(resolved.channelId)) {
    return { ok: false, reason: `'${ref}' did not resolve to a YouTube channel id` };
  }

  const lock = acquireLock(r);
  if (!lock.ok) return { ok: false, reason: lockedRefusal(lock), locked: true };

  let out;
  try {
    // THE READ THAT FEEDS THE WRITE. Taken under the lock, so no other writer
    // can commit between it and `saveRegistry` below.
    const read = readRegistry(r);
    if (isDamaged(read)) {
      out = { ok: false, reason: damagedRefusal(read) };
    } else {
      const reg = registryOrDefault(read);
      const creator = upsertCreator(reg, {
        channelId: resolved.channelId,
        title: name || resolved.title || resolved.channelId,
        handle: /^@/.test(String(ref).trim()) ? String(ref).trim() : null,
        url: `https://www.youtube.com/channel/${resolved.channelId}/videos`,
      }, { now: now ? now() : Date.now() });
      saveRegistry(reg, r);
      out = { ok: true, creator, reason: null };
    }
  } finally {
    // ⚠ This boolean is DISCARDED ON PURPOSE. Do not "fix" it here.
    //
    // `release()` can fail, and the failure is not benign: a transient unlink
    // failure (on Windows, another reader holding the file open) leaves the lock
    // on disk carrying a **live** pid, and `acquireLock` refuses to reclaim a
    // lock whose owner is alive — so the store wedges until a human deletes the
    // file. That is F03, and it is real.
    //
    // The remedy is a bounded 4× retry of `release()`. It is NOT here because at
    // this commit it would be INERT: `lock.mjs`'s `release()` latches `released`
    // BEFORE its single unlink attempt and carries no transient-retry policy, so
    // calls 2-4 would return false without touching the file. The retry
    // therefore ships with the slice that makes `release()` retryable. Until
    // then a failed unlink can still strand the store, and it is not fixable
    // from this file.
    lock.release();
  }
  return out;
}

/**
 * Add (or refresh) a creator — resolve, then commit.
 *
 * Returns `{ok:true, creator}` or `{ok:false, reason}`. A creator already in the
 * registry keeps its `enabled` flag: re-adding must never silently change whether
 * we are allowed to fetch it.
 *
 * This composition is the CLI's entry point. The console does NOT use it for the
 * production path: it runs the resolve half on a worker it will terminate on a
 * 60 s deadline, then calls `commitResolvedCreator` on a thread it never
 * terminates (F04 — see `creator-add.mjs`).
 */
export async function addCreator({ ref, r, deps = {}, now, name = null }) {
  const resolved = resolveCreatorRef({ ref, r, deps });
  if (!resolved.ok) return resolved;
  return commitResolvedCreator({ r, ref, resolved: resolved.resolved, name, now });
}

/** List creators. THROWS on a damaged registry rather than reporting none. */
export function listCreators(r) {
  const read = readRegistry(r);
  if (isDamaged(read)) {
    const err = new RegistryError(
      `registry.json is ${describeRead(read)} — refusing to treat a damaged catalog as empty`,
    );
    err.read = read;
    throw err;
  }
  const reg = registryOrDefault(read);
  return Object.values(reg.creators).sort((a, b) => String(a.title).localeCompare(String(b.title)));
}

/** Safe variant for status surfaces: returns `{ok, creators, read}`. */
export function listCreatorsSafe(r) {
  const read = readRegistry(r);
  if (isDamaged(read)) return { ok: false, creators: [], read };
  return { ok: true, creators: listCreators(r), read };
}

export function getCreator(r, channelId) {
  const read = readRegistry(r);
  if (isDamaged(read)) return null;
  return registryOrDefault(read).creators[channelId] || null;
}

/**
 * Flip the enable flag. The ONLY way a creator starts being fetched.
 *
 * ── WHY THIS STAYS SYNCHRONOUS, AND WHY IT TAKES THE SYNC LOCK ──────────────
 *
 * This is the OTHER half of the S1-H12 lost update: `addCreator` runs on a
 * worker thread, this runs on the main thread, and both were unlocked
 * read-modify-writes of one `registry.json`. The fix is the same lock — but this
 * function CANNOT become async to get it, because all three of its callers use
 * the returned creator synchronously:
 *
 *     commands.mjs:78  (CLI enable/disable)   const c = setEnabled(r, id, …)
 *     launch.mjs:148   (the launcher menu)    const c = setEnabled(r, …)
 *     creators.mjs:188 (the console PATCH)    c = setEnabled(r, id, …)
 *
 * `withLock` is async and would force all three to change; `acquireLock` is the
 * same mutex with a synchronous handle, so the contract is preserved and the
 * guarantee is identical. The release is in a `finally`, so a refusal thrown
 * from the middle of the critical section still frees the store.
 *
 * A held lock REFUSES (`err.locked = true`) instead of queueing — see
 * `lockedRefusal`. It is attached as data rather than as a new error class
 * because that is this file's existing idiom for "this refusal is a different
 * kind of refusal" (`listCreators` sets `err.read`).
 */
export function setEnabled(r, channelId, enabled, { now } = {}) {
  const lock = acquireLock(r);
  if (!lock.ok) {
    const err = new RegistryError(lockedRefusal(lock));
    err.locked = true;
    throw err;
  }
  try {
    const read = readRegistry(r);
    if (isDamaged(read)) {
      throw new RegistryError(`registry.json is ${describeRead(read)} — refusing to write over the creator catalog`);
    }
    const reg = registryOrDefault(read);
    const c = reg.creators[channelId];
    if (!c) throw new RegistryError(`no creator '${channelId}' in the registry`);
    c.enabled = !!enabled;
    c.enabledAt = enabled ? nowIso(now) : null;
    saveRegistry(reg, r);
    return c;
  } finally {
    // Discarded, exactly as in `commitResolvedCreator` above — F03's retry is
    // held back with the E1/E4 slice, and the note there explains why it would
    // be inert against this commit's `lock.mjs`.
    lock.release();
  }
}

/** Persist discovery bookkeeping (high-water mark) back onto the creator row. */
export function touchCreator(r, channelId, patch) {
  const read = readRegistry(r);
  if (isDamaged(read)) return null;
  const reg = registryOrDefault(read);
  const c = reg.creators[channelId];
  if (!c) return null;
  Object.assign(c, patch);
  saveRegistry(reg, r);
  return c;
}
