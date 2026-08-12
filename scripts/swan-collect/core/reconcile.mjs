/**
 * reconcile.mjs — how a SET of items changes between syncs.
 * ============================================================================
 * Split from item.mjs at a real seam: item.mjs answers "what IS one record"
 * (normalize, validate, cap); this file answers "what CHANGED since last time"
 * (added / updated / retracted). Dependency runs one way, reconcile -> item.
 *
 * This is the highest-consequence logic in swan-collect. A false retraction
 * removes evidence a newsroom is holding, which is why the scope seal below
 * throws rather than degrades.
 *
 * @module swan-collect/core/reconcile
 */

import { CollectError, toIsoOrNull, itemKey } from './item.mjs';

/**
 * Reconcile a freshly-fetched batch against what was previously stored.
 *
 * This implements the retraction rule: an item we stored but did NOT see in a
 * complete re-fetch is marked `retractedAt` rather than deleted or left looking
 * current. A newsroom that keeps serving a deleted post as live is both an
 * ethical failure and the likeliest route to a real defamation claim.
 *
 * `windowComplete` is the safety catch. Retraction is only inferred when the
 * caller states the fetch covered the same window as the stored set — otherwise
 * a paging failure or a rate-limited partial page would mass-retract real items.
 * Default false: the dangerous behaviour must be opted into explicitly.
 */
export function reconcile(previous, fetched, { at, windowComplete = false } = {}) {
  const stamp = toIsoOrNull(at);
  if (!stamp) throw new CollectError('reconcile requires a valid `at` timestamp');

  const seen = new Map(fetched.map((i) => [itemKey(i), i]));
  const prior = new Map((previous || []).map((i) => [itemKey(i), i]));

  // SCOPE SEAL. Retraction may only ever apply within ONE (sourceKey, entityRef)
  // cell. Kimi K3 finding H2 (confirmed empirically 2026-08-11): with a
  // heterogeneous `previous`, an HONEST windowComplete=true from a complete
  // Bluesky sync retracted every YouTube item for the entity — 2 of 3 items
  // wrongly marked withdrawn. That is the denial-of-truth attack executed with
  // correct flags and truthful data; the failure mode is scope confusion, not a
  // lying caller. The invariant therefore lives HERE, not in a caller contract,
  // because the caller is the thing most likely to get it wrong.
  if (windowComplete) {
    const scopes = new Set([...prior.values()].map((i) => `${i.sourceKey}\u0000${i.entityRef ?? ''}`));
    if (scopes.size > 1) {
      throw new CollectError(
        `reconcile: windowComplete requires 'previous' scoped to a single source+entity; got ${scopes.size} scopes. ` +
        'Filter the prior set by (sourceKey, entityRef) before reconciling.',
      );
    }
  }

  const added = [];
  const updated = [];
  const retracted = [];

  for (const [key, item] of seen) {
    const before = prior.get(key);
    if (!before) { added.push(item); continue; }
    // Preserve first-seen provenance; only advance the liveness stamp.
    // Kimi K3 finding L4 (confirmed): a plain `{...before, ...item}` lets a
    // transient source glitch overwrite good values with null. Fields the source
    // may legitimately drop are merged non-null so a degraded fetch cannot erase
    // evidence a newsroom already holds.
    updated.push({
      ...before,
      ...item,
      title: item.title ?? before.title,
      text: item.text ?? before.text,
      canonicalUrl: item.canonicalUrl ?? before.canonicalUrl,
      publishedAt: item.publishedAt ?? before.publishedAt,
      metrics: item.metrics ?? before.metrics,
      fetchedAt: before.fetchedAt,
      lastSeenAt: stamp,
      retractedAt: null,
    });
  }

  // Every prior item NOT seen in this fetch must land in exactly one bucket.
  //
  // Kimi K3 packet-7 H1 (CONFIRMED empirically 2026-08-12): the old shape
  // returned only added/updated/retracted, so an unseen item during an
  // INCOMPLETE window fell into no list at all — and because the runner writes
  // `[...added, ...updated, ...retracted]` as a full-cell replace, it was
  // silently deleted. Reproduction: feed [A,B] then [B,C] left the cell holding
  // only B,C. Item A vanished with no `retractedAt` and no receipt line.
  //
  // RSS always reports windowComplete:false by design, so this fired on ORDINARY
  // operation for the highest-volume source. The store was a mirror of the last
  // fetch window, not an accumulating evidence base — the exact opposite of the
  // retraction doctrine it was built to serve.
  const kept = [];
  for (const [key, item] of prior) {
    if (seen.has(key)) continue;
    if (item.retractedAt) { kept.push(item); continue; } // already withdrawn — carry it, don't re-stamp
    if (windowComplete) retracted.push({ ...item, retractedAt: stamp });
    else kept.push(item); // merely outside this window — PRESERVE, never drop
  }

  return { added, updated, retracted, kept, windowComplete };
}
