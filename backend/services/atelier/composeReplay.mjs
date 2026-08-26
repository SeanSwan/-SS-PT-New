/**
 * composeReplay.mjs — when a repeated request may be answered from the last one.
 *
 * Its own module for the same reason composeGpu is: "guards" had become a bag holding
 * refusals about the REQUEST, rules about the HARDWARE, and rules about REPEATS. Three
 * concerns share a word and nothing else.
 *
 * Every defect in the function below was found by a reviewer reading the orchestrator's
 * inline `store.has(key)` and asking what it does when the answer is stale, absent, or
 * carrying fields the caller was never meant to see.
 */

import { ComposeError } from './composeLimits.mjs';

/**
 * Answer from a prior identical request, or say there is nothing honest to answer with.
 *
 * Lives here with the other key rules rather than inline in the orchestrator, because every
 * defect this guard now carries was found by a reviewer reading it as a lone `store.has`.
 *
 * A REPLAY IS ONLY HONEST WHILE THE ROW IT POINTS AT EXISTS. The retained stub carries its
 * batch row's own expiry, so this refuses itself rather than answering a delayed retry with
 * a confident success payload and a statusUrl that 404s.
 *
 * THE CLOCK IS SAMPLED HERE, not frozen at request start. The orchestrator's `now` is fixed
 * because the derived key's time bucket must not move underneath it; comparing an absolute
 * deadline against that same frozen number serves a stub that died while the request queued.
 * Two quantities, and only one of them wants to be frozen.
 *
 * AND AN ABSENT `prior` FALLS THROUGH TO RUNNING THE WORK. `has` and `get` are not one
 * operation, and a terminal `.finally` can delete the key between them — spreading an absent
 * prior would hand the client `{ replayed: true }` with no fields at all, a 200 that says
 * nothing. The window is near zero for an in-memory store and is not zero for any other.
 *
 * DELIBERATELY NOT AN `async` FUNCTION, and this is load-bearing. A miss must return null
 * SYNCHRONOUSLY, so the orchestrator's claim (`store.set(key, pending)`) lands in the same
 * synchronous run as the check that preceded it. Marking this `async` makes every call
 * yield to the microtask queue — even one that found nothing — and two concurrent identical
 * requests then both miss and both render.
 *
 * THERE ARE TWO KINDS OF MISS AND THE FIRST FIX ONLY COVERED ONE. An ABSENT key was already
 * synchronous. An EXPIRED stub was not: its null came back from behind `await store.get`,
 * so two post-TTL retries of the same key both got their null from a continuation and both
 * claimed — a full duplicate render, not the hairline window. A reviewer found that the
 * invariant was documented for one path and broken on the other.
 *
 * So a SETTLED STUB IS STORED AS A PLAIN OBJECT and an IN-FLIGHT CLAIM as a promise. The
 * difference is the whole fix: a plain object can be judged right here, expiry and all,
 * without awaiting anything, so both misses are synchronous. Only a live claim needs the
 * await, and a live claim is never expired.
 *
 * @returns null (synchronously) when there is nothing honest to replay; a body; or — only
 *          when coalescing onto a live claim — a promise of one.
 */
export function replayIfFresh(store, key, clock = () => Date.now()) {
  if (!store.has(key)) return null;
  const held = store.get(key);
  if (held && typeof held.then === 'function') return resolveReplay(held, store, key, clock);
  return judge(held, store, key, clock);
}

async function resolveReplay(pending, store, key, clock) {
  // A STORED PROMISE THAT REJECTS MEANS "RUN THE WORK", NEVER "500 FOREVER". A failure path
  // that rejects the claim without also removing it would make this throw, and a throw
  // skips the delete — so every retry with that key would 500 permanently, with nothing
  // able to clear it. Being total is the whole job of a guard.
  let prior;
  try {
    prior = await pending;
  } catch {
    store.delete(key);
    return null;
  }
  return judge(prior, store, key, clock);
}

/**
 * Decide about one stored value. Synchronous, so the settled path can stay synchronous.
 *
 * A REPLAY IS ONLY HONEST WHILE THE ROW IT POINTS AT EXISTS. The stub carries its batch
 * row's own expiry, so this refuses itself rather than answering a delayed retry with a
 * confident success payload and a statusUrl that 404s.
 *
 * THE CLOCK IS SAMPLED HERE, not frozen at request start. The orchestrator's `now` is fixed
 * because the derived key's time bucket must not move underneath it; comparing an absolute
 * deadline against that same frozen number serves a stub that died while the request queued.
 *
 * AND AN ABSENT VALUE FALLS THROUGH TO RUNNING THE WORK — spreading one would hand the
 * client `{ replayed: true }` with no fields at all, a 200 that says nothing.
 */
function judge(prior, store, key, clock) {
  const expired = prior?.replayExpiresAt > 0 && prior.replayExpiresAt <= clock();
  if (prior && !expired) {
    // `replayExpiresAt` is bookkeeping for this guard, not something a caller can act on.
    // Shipping it would make an internal deadline part of the contract by accident.
    const { replayExpiresAt, ...body } = prior;
    return { ...body, replayed: true };
  }
  store.delete(key);
  return null;
}

/**
 * Take ownership of a key, or report that someone else already has it.
 *
 * THERE IS A THIRD KIND OF MISS AND IT CANNOT BE MADE SYNCHRONOUS. An absent key and an
 * expired stub are both decided where they are found. A REJECTED claim is not: its null
 * comes back from `resolveReplay`'s catch, behind an await. Two retries that both await the
 * same rejected claim both resume in a continuation, and an unconditional `store.set` there
 * means the second overwrites the first — two renders, two bites of the run cap, and on a
 * future paid async lane two charges.
 *
 * So the claim is a get-or-set: one synchronous operation, first resumer wins, and anyone
 * who arrives second is told to coalesce rather than silently taking the key away.
 *
 * This is the same shape as the reservation's own `if (inFlight === token)` — the identity
 * check that makes a stale release harmless. A blind write is what both were missing.
 *
 * @returns true when this caller now owns the key.
 */
export function claimIfAbsent(store, key, pending) {
  if (store.has(key)) return false;
  store.set(key, pending);
  return true;
}

/**
 * Become the owner of a key, or return the answer whoever already owns it will produce.
 *
 * EVERY WRITE IS CONDITIONAL, not just the first. The previous version guarded the entry
 * with `claimIfAbsent` and then, having failed to coalesce, wrote the tail BLINDLY — so
 * with k retries waiting on one rejected claim, all k resumed in the same microtask drain,
 * all k found nothing to coalesce onto, and all k claimed: k owners, k batch rows, k GPU
 * renders, k run-cap debits, and k different batchIds handed out for one idempotent key.
 * A reviewer noted the docstring already claimed this exact outcome was fixed. It described
 * the entry and the tail contradicted it — the fourteenth time in this review a rule held
 * on one path and not on its sibling, this time two paths of one function.
 *
 * The loop is what makes "first resumer wins" true: the winner's claim is present, so every
 * later attempt finds it and coalesces onto a LIVE promise rather than racing it. Bounded,
 * because refusing loudly is the right failure here — a request that cannot establish
 * ownership must not render, and a caller that renders twice has already lost the argument.
 */
export async function claimOrCoalesce(store, key, clock, attempts = 3) {
  let settle = null;
  const pending = new Promise((res, rej) => { settle = { res, rej }; });
  pending.catch(() => {});

  for (let n = 0; n < attempts; n += 1) {
    if (claimIfAbsent(store, key, pending)) return { settle };

    // Someone owns it. Coalesce onto theirs rather than racing it.
    const theirs = replayIfFresh(store, key, clock);
    if (theirs) {
      const body = await theirs;
      if (body) return { replay: { ...body, replayed: true } };
    }
    // Theirs resolved to nothing usable — it rejected, or expired as we looked. Round the
    // loop and try to claim the now-empty key, conditionally, like every other write here.
  }

  throw new ComposeError('E_REPLAY_CONTENTION',
    `Could not establish ownership of this request after ${attempts} attempts. Retry in a moment; nothing was spent.`);
}
