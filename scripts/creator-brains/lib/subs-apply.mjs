#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/subs-apply.mjs
 * PURPOSE: Apply a subscription snapshot to the creator catalog — under the
 *          store lock, from a read taken inside it.
 * PART OF: Creator Brains — SS-PT acquisition engine (F01, Astra hostile r1)
 * ADDED: 2026-09-23
 * ============================================================================
 *
 * EXTRACTED FROM `subs.mjs` AT THE SEAM, NOT TRIMMED TO FIT (Rule 4). The commit
 * block grew a lock and the reasoning for it is longer than the code — the norm
 * in this neighbourhood, where `lock.mjs`'s own header explains a rename-vs-unlink
 * decision at length. When the parent hit 303 lines the choice was to extract a
 * coherent unit or line-golf comments. Rule 4 says extract, and Rule 4 is right
 * for a reason beyond the number: "a snapshot is applied to the catalog, and it
 * is applied under the store lock" is ONE idea with ONE ordering constraint.
 *
 * ── WHY THE THIRD WRITER NEEDED THE SAME LOCK AS THE OTHER TWO ──────────────
 *
 * `registry.json` had THREE unlocked read-modify-writes, and the fix for the
 * first two missed this one. Measured by census rather than by memory: exactly
 * two modules call `saveRegistry` — `registry.mjs` (three sites) and `subs.mjs`
 * (one). The defect that started this round was found by grepping for the
 * functions already known (`setEnabled`, `addCreator`, `touchCreator`) rather
 * than for the WRITE, so the one writer with no familiar function name was the
 * one that stayed open.
 *
 * It is also the widest window of the three. The snapshot is collected across
 * THREE network awaits (`ensureAccessToken`, `listSubscriptionsWithRefresh`, and
 * the refresh inside it), so this write is not racing a millisecond — it is
 * racing seconds. A locked `enable` or `add` committing during those awaits was
 * silently reverted by a snapshot taken before them.
 *
 * ── WHY THE AWAITS STAY OUTSIDE THE LOCK, AND THE READ DOES NOT ─────────────
 *
 * Same split as `addCreator`, for the same reason: the awaits touch no shared
 * state, so holding the store lock across a network round-trip would block the
 * CLI, the daily run and every console write for seconds at a time. The read
 * that FEEDS the write is what must be inside, and it must be a FRESH read —
 * reusing the caller's pre-flight snapshot would leave the lost update in place
 * while appearing to hold a lock.
 *
 * The refusal is returned as a VALUE (`{ok:false, reason, message}`) rather than
 * thrown, because the caller wraps it in its own `blocked(...)` envelope and the
 * two refusal paths must be indistinguishable to the CLI.
 *
 * F01 (Astra r1) moved this commit onto the engine's own lock, with the read
 * taken INSIDE it — see `commitSnapshot`. A snapshot collected before a
 * concurrent enable committed was silently reverting that enable.
 *
 * F03 (Astra r1) then moved the RELEASE off `withLock`. Its `finally` discarded
 * `release()`'s result, so the retryability the E4 repair added was unreachable
 * from here too; the release now goes through `releaseStore` and is retried.
 *
 * @module creator-brains/subs-apply
 */

import {
  readRegistry, registryOrDefault, isDamaged, saveRegistry, upsertCreator,
} from './store.mjs';
import { acquireLock } from './lock.mjs';
import { releaseStore } from './lock-release.mjs';
import { damagedRefusal, lockedRefusal } from './registry-write-guard.mjs';

/**
 * Apply a subscription snapshot to the registry.
 *
 * THE COMPLETENESS GATE: `snapshot.complete` must be true before any creator is
 * marked unsubscribed. A partial snapshot updates what it has and leaves
 * lifecycle alone.
 */
export function applySnapshot(reg, snapshot, { now = Date.now() } = {}) {
  const subs = Array.isArray(snapshot.rows) ? snapshot.rows : [];
  const seen = new Set();
  let added = 0;
  let refreshed = 0;

  for (const s of subs) {
    if (!s || !/^UC[A-Za-z0-9_-]{22}$/.test(String(s.channelId || ''))) continue;
    seen.add(s.channelId);
    const existing = reg.creators[s.channelId];
    const creator = upsertCreator(reg, {
      channelId: s.channelId,
      title: s.title || s.channelId,
      lifecycle: 'subscribed',
      lastSyncAt: new Date(now).toISOString(),
    }, { now });
    // Never auto-enable, and never resurrect a channel the owner disabled.
    if (!existing) creator.enabled = false;
    if (existing) refreshed += 1; else added += 1;
  }

  let markedUnsubscribed = 0;
  if (snapshot.complete === true) {
    for (const c of Object.values(reg.creators)) {
      if (c.lifecycle === 'subscribed' && !seen.has(c.channelId)) {
        c.lifecycle = 'unsubscribed'; // marked, NOT deleted
        markedUnsubscribed += 1;
      }
    }
  }

  return {
    added, refreshed, markedUnsubscribed, complete: snapshot.complete === true,
  };
}

/**
 * Take the store lock, re-read the catalog, apply the snapshot, save.
 *
 * Returns `{ok:true, applied}` or `{ok:false, reason, message}`. The reason
 * strings are the caller's to render; this module never invents a CLI envelope.
 *
 * A held lock REFUSES rather than queueing — `lock.mjs`'s own doctrine, and the
 * reason is the same one the other two writers give: a scheduled run waiting
 * behind a manual write is how a store gets two writers "safely".
 *
 * WHY THE LOCK IS TAKEN BY HAND RATHER THAN THROUGH `withLock`. Two reasons, and
 * neither is cosmetic. First, this function's refusal must be a VALUE, not a
 * throw, and `withLock` refuses by throwing. Second, `withLock`'s `finally` used
 * to discard `release()`'s result (F03), so the release is retried here through
 * `releaseStore` instead. The refusal prose is the SAME two sentences
 * `registry.mjs` uses, imported rather than re-typed — this function had grown
 * its own third copy of the locked-store sentence, and that is how two refusal
 * paths drift apart until a caller can tell them by their words.
 */
export async function commitSnapshot({ r, snapshot, now = Date.now() }) {
  const lock = acquireLock(r);
  if (!lock.ok) {
    return { ok: false, reason: 'registry_locked', message: lockedRefusal(lock) };
  }

  let out;
  try {
    // THE READ THAT FEEDS THE WRITE — taken under the lock, so no other writer
    // can commit between it and `saveRegistry` below.
    const read = readRegistry(r);
    if (isDamaged(read)) {
      out = { ok: false, reason: 'registry_unreadable', message: damagedRefusal(read) };
    } else {
      const reg = registryOrDefault(read);
      const applied = applySnapshot(reg, snapshot, { now });
      // Even a partial snapshot's ROWS are worth keeping; only lifecycle is gated.
      saveRegistry(reg, r);
      out = { ok: true, applied };
    }
  } finally {
    // The write above has ALREADY COMMITTED by this line, so a release failure is
    // cleanup, not a refusal — S1-H9 forbids reporting a completed write as
    // `{ok:false}`. Retried rather than discarded (F03): a release that gives up
    // strands the lock under a LIVE pid, which no later writer may reclaim, so the
    // store would be WEDGED rather than merely busy.
    releaseStore(lock);
  }
  return out;
}
