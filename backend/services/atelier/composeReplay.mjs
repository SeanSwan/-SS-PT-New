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
  // COERCED, because the orchestrator holds a frozen `now` NUMBER beside this function's
  // `clock` FUNCTION and the two are one careless argument apart. Passing the number would
  // throw at `clock()` and 500 every request through this path.
  if (typeof clock !== 'function') { const t = Number(clock) || Date.now(); clock = () => t; }
  if (!store.has(key)) return null;
  const held = store.get(key);
  if (held && typeof held.then === 'function') return resolveReplay(held, store, key, clock);
  return judge(held, held, store, key, clock, false);
}

async function resolveReplay(pending, store, key, clock) {
  // A STORED PROMISE THAT REJECTS MEANS "RUN THE WORK", NEVER "500 FOREVER". A failure path
  // that rejects the claim without also removing it would make this throw, and a throw
  // skips the drop below — so every retry with that key would 500 permanently, with nothing
  // able to clear it. Being total is the whole job of a guard.
  let prior;
  try {
    prior = await pending;
  } catch {
    dropIfStillOurs(store, key, pending);
    return null;
  }
  // `true` because THIS path knows it came from a claim. It used to be inferred from the
  // token's shape — and a promise keeps its `then` after it settles, so a resolved claim
  // still sitting in the store was judged "live" forever and skipped the expiry rule
  // entirely. The caller knows which path it is on; inferring it was the whole defect.
  return judge(prior, pending, store, key, clock, true);
}

/**
 * Remove a key ONLY if it still holds the thing we are reasoning about.
 *
 * Every synchronous write in this module is conditional; the two that sit behind an `await`
 * were not, and that is the whole defect. Between suspending on a claim and resuming, the
 * claim can fail, be removed by its own owner, and be REPLACED by a new owner who is
 * already rendering. A blind `store.delete(key)` in that continuation evicts a live claim
 * belonging to someone else — and the evicting request then claims the empty key itself, so
 * two callers own one idempotency key and two batches render against it.
 *
 * This is the same identity check as the reservation's `if (inFlight === token)`, which is
 * what makes a stale release harmless. A stale delete needs exactly the same protection and
 * for exactly the same reason.
 */
function dropIfStillOurs(store, key, token) {
  if (store.get(key) === token) store.delete(key);
}

/**
 * Decide about one stored value. Synchronous, so the settled path can stay synchronous.
 *
 * `token` is what the STORE held, used as the identity for a conditional delete.
 * `fromClaim` says whether this value came from awaiting a live claim — passed by the
 * caller that knows, never inferred from the token's shape. A promise keeps its `then`
 * after it settles, so shape-inference judged a resolved claim "live" forever and skipped
 * the expiry rule on it entirely.
 *
 * A REPLAY IS ONLY HONEST WHILE THE ROW IT POINTS AT EXISTS, so a retained stub must carry
 * its row's deadline and a MISSING deadline counts as EXPIRED. Failing open here would make
 * any stub written without the field immortal — a delayed retry handed a confident 200 and
 * a statusUrl whose row aged out long ago, which is the dishonesty this module exists to
 * prevent. A guard whose job is not trusting writers cannot trust writers.
 *
 * A LIVE CLAIM is exempt, and must be: it resolves to the 202 stub, which has no deadline
 * because it has not finished. That is what coalescing awaits. The token is what tells the
 * two apart, which is why it is passed rather than inferred.
 *
 * THE CLOCK IS SAMPLED HERE, not frozen at request start. The orchestrator's `now` is fixed
 * because the derived key's time bucket must not move underneath it; comparing an absolute
 * deadline against that same frozen number serves a stub that died while the request queued.
 *
 * AND AN ABSENT VALUE FALLS THROUGH TO RUNNING THE WORK — spreading one would hand the
 * client `{ replayed: true }` with no fields at all, a 200 that says nothing.
 */
function judge(prior, token, store, key, clock, fromClaim) {
  if (!prior) { dropIfStillOurs(store, key, token); return null; }
  // A DEADLINE IS ENFORCED WHENEVER ONE EXISTS. Its ABSENCE is forgivable only on a live
  // claim, whose 202 stub has no deadline because the batch has not finished — that is what
  // coalescing waits on. Everything else without one is a writer's omission, and treating an
  // omission as immortality is how a delayed retry gets a confident 200 for a row that aged
  // out. `fromClaim` gates only the absence, never the enforcement: a claim that SETTLED and
  // stayed in the store is not live any more, and exempting it by provenance would be the
  // same mistake as exempting it by shape, one step further back.
  const deadline = Number(prior.replayExpiresAt);
  if (deadline > 0) {
    if (deadline <= clock()) { dropIfStillOurs(store, key, token); return null; }
  } else if (!fromClaim) {
    dropIfStillOurs(store, key, token); return null;
  }
  // `replayExpiresAt` is bookkeeping for this guard, not something a caller can act on.
  // Shipping it would make an internal deadline part of the contract by accident.
  const { replayExpiresAt, ...body } = prior;
  return { ...body, replayed: true };
}

/**
 * Take ownership of a key, or report that someone else already has it.
 *
 * A blind `store.set` is only safe while every miss is decided synchronously — and the
 * rejection-miss cannot be. Two retries awaiting the same rejected claim both resume in a
 * continuation, and an unconditional write there means the second silently takes the key
 * from the first: two renders, two bites of the run cap, two charges on a paid async lane.
 *
 * Same shape as the reservation's own `if (inFlight === token)`. A blind write is what both
 * were missing, and the same is true of a blind delete — see dropIfStillOurs.
 *
 * @returns true when this caller now owns the key.
 */
/**
 * The deadline a stub carries when it is deliberately immortal.
 *
 * The async lane's stub points at a batch row that expires, so it expires with it. The
 * HOSTED lane's stub points at nothing — the response IS the only handle, and re-running
 * charges money — so it is meant to live until it is evicted for room. That is a decision,
 * and it has to be written down as one: a guard that treats a MISSING deadline as immortal
 * makes every future writer's omission immortal too. Declaring it is what lets absence
 * mean "someone forgot", which is the only way fail-closed can work.
 */
// NOT Infinity. Any store that ever round-trips through JSON turns Infinity into null,
// `Number(null)` is 0, and a fail-closed guard reads 0 as expired — so a store reload would
// silently convert the hosted lane's deliberate immortality into a re-render, on the one
// lane where re-running charges money. A large finite number survives the trip.
export const REPLAY_NEVER_EXPIRES = Number.MAX_SAFE_INTEGER;

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
  const tick = typeof clock === 'function' ? clock : () => Number(clock) || Date.now();
  let settle = null;
  const pending = new Promise((res, rej) => { settle = { res, rej }; });
  pending.catch(() => {});

  for (let n = 0; n < attempts; n += 1) {
    if (claimIfAbsent(store, key, pending)) return { settle };

    // Someone owns it. Coalesce onto theirs rather than racing it.
    const theirs = replayIfFresh(store, key, tick);
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
