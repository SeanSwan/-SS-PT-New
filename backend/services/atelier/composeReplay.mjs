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
 * SYNCHRONOUSLY. Marking it `async` makes every call yield to the microtask queue — even
 * one that found nothing — and the orchestrator's claim (`store.set(key, pending)`) then no
 * longer follows the `has` check without an await between them, so two concurrent identical
 * requests both miss and both run. That is precisely the race a reviewer proposed against
 * the inline version and which was disproved by source; extracting the guard reintroduced
 * it, because the synchronicity was load-bearing and nowhere written down. The coalescing
 * test caught it in one run. So: miss returns null with no await; a hit returns a promise.
 *
 * @returns null (synchronously) when there is nothing to replay, else a promise of the
 *          replay body — which may itself resolve to null if what was stored has expired.
 */
export function replayIfFresh(store, key, clock = () => Date.now()) {
  if (!store.has(key)) return null;
  return resolveReplay(store, key, clock);
}

async function resolveReplay(store, key, clock) {
  // A STORED PROMISE THAT REJECTS MEANS "RUN THE WORK", NEVER "500 FOREVER". The claim
  // writes a pending promise under the key and settles it with the outcome; a failure
  // path that rejects it without also removing it would make `await` throw here, and a
  // throw skips the delete below — so every retry with that key would 500 permanently,
  // with nothing able to clear it. Being total is the whole job of a guard.
  let prior;
  try {
    prior = await store.get(key);
  } catch {
    store.delete(key);
    return null;
  }
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
