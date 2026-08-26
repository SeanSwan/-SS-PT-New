/**
 * localBatchRunner.mjs — the background half of a local still batch.
 * ============================================================================
 * Extracted from composeStills when the async lane pushed it past the 300-line cap.
 * The orchestrator accepts and returns; this renders.
 *
 * Three invariants live here, each pinned by atelierAsyncStills.test.mjs:
 *   - every still is PERSISTED before it is pushed, so a poll never sees a still
 *     without its asset id;
 *   - the batch always reaches a terminal state — a crash is recorded as `failed`
 *     with its code, never left "running" forever;
 *   - the GPU reservation is released on every path, including the crash path.
 */

import * as batches from './batchStore.mjs';
import { BATCH_TTL_MS } from './batchStore.mjs';
import { sha, seedFor } from './composeLimits.mjs';
import { buildPrompts } from './composePrompts.mjs';
import { releaseWhenSettled } from './composeGpu.mjs';
import { brandKitView } from '../../../shared/brandKits/registry.mjs';
import * as local from './localStillLane.mjs';

/**
 * A batch may not run forever. The adapter bounds one render, but a hang anywhere else
 * (persist, a stalled socket) would leave the batch `running` and the GPU reserved with
 * no cancel endpoint — every later local request refused until the process is killed.
 * The watchdog makes the terminal state unconditional.
 */
export const BATCH_WATCHDOG_MS = 20 * 60 * 1000;

/**
 * TWO PROFILES, NOT ONE, AND THEY ARE NOT INTERCHANGEABLE.
 *
 *   The KIT's own laws judge the taste corpus, and no request parameter may move them:
 *   the corpus is Swan-rated, and an override that relaxed the laws guarding it would
 *   reopen the brand-scope leak. They now travel INSIDE `kit`, read by buildPrompts.
 *
 *   `lawProfile` is the MERGED profile, after an explicit caller override has won. It is
 *   what the COMPILER drops, because relaxing the compiler is a legitimate ask.
 *
 * They once arrived as a single parameter, so this lane judged taste correctly and then
 * dropped the wrong laws in the compiler — the eighth defect of the shape this review
 * kept finding, and the first where the two halves of a pair were one variable rather
 * than two files. A `judgeProfile` parameter was the first fix; it then sat here UNUSED
 * for a round after buildPrompts made it redundant, and a reviewer caught the dead
 * channel — along with the commit message that had claimed it was already gone.
 */
export async function runLocalBatch({ batch, req, brief, count, key, promptSource, lawProfile, kit, model, reservation, deps }) {
  const { renderStill, withGpu, env, tasteDeps, compiler, persist, watchdogMs = BATCH_WATCHDOG_MS } = deps;
  let timer = null;
  // Observed by the render loop, so an ABANDONED batch stops touching the GPU. A promise
  // race ends the WAIT, never the WORK — and the work is what owns the hardware.
  const aborted = { now: false };
  /** The render loop, once started — so a timeout can wait for it before freeing the GPU. */
  let inFlight = null;
  const watchdog = new Promise((_, rej) => {
    timer = setTimeout(() => { aborted.now = true; rej(Object.assign(new Error(`The batch did not finish within ${Math.round(watchdogMs / 60000)} minutes and was abandoned; the GPU is free again.`), { code: 'E_BATCH_TIMEOUT' })); }, watchdogMs);
    if (typeof timer.unref === 'function') timer.unref();
  });
  try {
    batches.markRunning(batch);
    // BOTH LANES CALL THE SAME BUILDER. This branch used to be a second copy of the
    // sync one, and keeping two copies in step is a discipline rather than a property:
    // the copies drifted three separate times in this review — the taste judging profile,
    // then the brand kit and law drop entirely, then the `compiled` provenance. Diffing
    // them was the previous mitigation; calling one function is the fix. `judgeProfile`
    // rides inside the kit, which is where it always belonged.
    const built = await buildPrompts({
      promptSource, brief, req, kit, lawProfile, count, key,
      lane: 'local', model, compiler, env, tasteDeps,
    });
    const prompts = built.prompts;
    // Taste metadata now reaches the async result too — and async is where taste RUNS,
    // because taste is local-only, so this was the only lane whose metadata mattered.
    if (built.tasteMeta && Object.keys(built.tasteMeta).length) batches.setTasteMeta(batch, built.tasteMeta);

    const work = withGpu(async () => {
      for (let i = 0; i < prompts.length; i += 1) {
        // The race did not cancel this loop; only this check does. Without it the catch
        // releases the reservation, a NEW batch is admitted, and two batches render on
        // one card while single-flight believes it is guarding them.
        if (aborted.now) break;
        const p = prompts[i];
        if (!p.ok) { batches.pushFailure(batch, { index: i, code: p.code, message: p.message }); continue; }
        const seed = Number.isInteger(req.seed) ? req.seed + i : seedFor(key, i);
        try {
          const r = await renderStill({ promptText: p.text, seed, outDir: req.outDir }, { env });
          const still = { index: i, lane: 'local', promptHash: sha(p.text).slice(0, 12), ...r, seed, promptText: p.text, model: r.provider };
          // Persist THIS still now, so the poll that sees it also sees its asset id.
          if (req.persist !== false) await persist({ stills: [still], lane: 'local', userId: req.userId, workspaceId: req.workspaceId, brandKit: brandKitView(kit), model, env });
          batches.pushStill(batch, still);
        } catch (e) {
          batches.pushFailure(batch, { index: i, code: e?.code || 'E_LOCAL_RENDER', message: e?.message || String(e) });
        }
      }
    }, reservation);
    // The card is held until the WORK stops, not until the WAIT stops.
    //
    // The previous fix put an abort check between frames, which is necessary and was not
    // sufficient: a frame already inside `await renderStill` runs to completion, so
    // releasing the reservation the moment the watchdog fired handed the GPU to a new
    // batch while the old one was still mid-render. Both seats said so in the same round.
    //
    // So a timeout marks the loop aborted, finishes the batch, and then releases only once
    // the loop has actually settled — the caller is told immediately, and the hardware
    // stays reserved until it is genuinely free.
    inFlight = work;
    await Promise.race([watchdog, work]);
    const persisted = batch.stills.filter((s) => s.persist?.ok).length;
    batches.finishBatch(batch, { persistence: req.persist === false
      ? { ok: false, code: 'E_PERSIST_SKIPPED', persisted: 0 }
      : { ok: persisted === batch.stills.length, persisted, total: batch.stills.length } });
  } catch (err) {
    aborted.now = true;
    batches.finishBatch(batch, { error: err });
    releaseWhenSettled(reservation, inFlight, deps.releaseGraceMs);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Start a local batch and answer at once.
 *
 * Extracted from composeStills at the 300-line cap, and it belongs here: this is the
 * function that starts the runner below it, and the two disagree-by-drift only if they
 * live apart. Everything money-related has already happened — the caller has committed
 * the cost before calling this, and nothing in here may refuse.
 */
export function startLocalBatch({ req, brief, count, key, promptSource, lawProfile, kit, cost, lane,
                                  admission, clampedFrom, reservation, batches, store, settle,
                                  brandKitView, slimForReplay, rememberKey, settledKeys,
                                  renderStill, withGpu, env, tasteDeps, compiler, persist,
                                  watchdogMs, releaseGraceMs }) {
  // The collaborators arrive ALREADY RESOLVED, rather than being re-destructured from a
  // raw deps bag here. composeStills applies the defaults (`renderStill = local.renderStill`,
  // `env = process.env`, and so on); resolving them a second time in this function made
  // every unset one `undefined` and failed nine tests the moment it was extracted. Two
  // places deciding one fact is the exact drift this file keeps warning about — so there
  // is one place, and it is the caller.
    // Expire any stub whose batch row has just aged out, so the two cannot drift apart. This
  // is the same prune the store runs for itself; taking its report is what keeps a retained
  // client key from outliving the batch it points at and answering forever with a dead URL.
  for (const goneKey of (batches.prune?.() || [])) store.delete(goneKey);
  const batch = batches.createBatch({ userId: req.userId, lane, count, key, promptSource, model: cost.model });
    const accepted = { accepted: true, batchId: batch.id, lane, promptSource, status: 'queued', count, cost: { ...cost, chargedUsd: 0 }, brandKit: brandKitView(kit),
      key, admission, statusUrl: `/api/atelier/compose/stills/${batch.id}`, replayed: false,
      // The synchronous path reports this and the async path did not, so a client whose
      // count was silently reduced had no way to know on the lane that reduces it most.
      ...(clampedFrom === undefined ? {} : { clampedFrom }) };
    settle.res(accepted);
    runLocalBatch({ batch, req, brief, count, key, promptSource,
      // The KIT's profile, not the merged one — the same correction the synchronous path
      // received two rounds ago and this one did not. Sixth time a fix has landed on one
      // half of a pair in this review; the async lane is where taste actually RUNS, so
      // fixing only the sync half fixed the path taste almost never takes.
      lawProfile, kit, model: cost.model, reservation,
      // The kit travels as ONE parameter, not as a parameter AND a deps field. Two
      // channels for one fact is how the sync and async halves drifted apart in the first
      // place: whichever one a later change updates, the other keeps its old value and
      // nothing disagrees loudly enough to notice.
      deps: { renderStill, withGpu, env, tasteDeps, compiler, persist, ...(watchdogMs ? { watchdogMs } : {}),
        ...(releaseGraceMs ? { releaseGraceMs } : {}) } })
      // WHICH key it is, and HOW THE BATCH ENDED, decide what happens here. For one round
      // only the first of those was consulted, and both panel seats found the same lie.
      //
      // A DERIVED key is dropped: it carries a time bucket, so a later identical request
      // derives a different key anyway, and holding this one could only return a stale
      // batch to someone whose next request would not have matched it regardless.
      //
      // A FAILED batch drops its key too, client-supplied or not. Nothing was delivered,
      // so there is nothing for a retry to collect — and retaining here would hand the
      // client a stub reading `accepted: true, status: 'queued'` for work that is already
      // dead, which does not just mislead: it makes the failure PERMANENT, because every
      // retry replays the same corpse instead of rendering.
      //
      // A SUCCEEDED batch with a CLIENT key is retained, for the reason the hosted path
      // retains its own: the client said "this is the same request". Evicting it means a
      // client whose connection dropped before the 202 arrived retries and gets a SECOND
      // batch — a second GPU run and a second bite of the run cap, from the one mechanism
      // whose whole purpose is to promise that cannot happen.
      //
      // And what is retained is built from the batch's OWN terminal snapshot, not from the
      // `accepted` stub. The stub says `status: 'queued'` and always will; replaying it
      // after the work finished reports a live-sounding state that is simply false, and a
      // client branching on `status === 'queued'` re-enqueues against a finished batch.
      // The statusUrl being authoritative does not license the field beside it to lie.
      .finally(() => {
        // WRAPPED, because the `.catch` below sits AFTER this and would eat anything thrown
        // here — leaving the store holding the long-resolved 202 promise, so every future
        // replay answers `status: 'queued'` for finished work. That is the exact corpse
        // round T killed, surviving on the success path. And release errors got telemetry
        // last round while cleanup errors did not, which is itself the pair class.
        let retained = false;
        try {
          const snap = batches.getBatch(batch.id, req.userId);
          // NOTHING DELIVERED → DROP THE KEY. A failed batch has produced no frames, so a
          // retry has nothing to collect, and retaining would make the failure permanent.
          // A derived key drops too: it carries a time bucket, so a later request keys
          // differently regardless.
          if (!req.idempotencyKey || !snap || snap.status === 'failed') { store.delete(key); return; }
          // SOMETHING DELIVERED → RETAIN. That includes `partial`, and the principle is
          // worth stating because both seats asked: the key is retained whenever frames
          // exist to collect, since re-running the same key would charge a second time for
          // work already done. A client who wants the missing frames uses a NEW key — which
          // is what an idempotency key means, and the numbers below let them see the gap.
          store.set(key, Promise.resolve(slimForReplay({
            ...accepted,
            accepted: false,
            status: snap.status,
            // FROM THE SNAPSHOT, not from the 202 stub. Spreading `accepted` alone replayed
            // an 8-of-10 partial as `count: 10` — the request's number, not the outcome's.
            count: snap.stills.length,
            requested: accepted.count,
            failed: snap.failures.length,
            // The replay is only honest while the row it points at still exists. Rows expire
            // an hour after they finish; the stub used to live until something evicted it,
            // so a delayed retry got a confident success payload and a statusUrl that 404s.
            // Carrying the row's own deadline means the replay path can refuse itself — no
            // second clock to keep in step, and no eviction timing to get right.
            replayExpiresAt: (snap.finishedAt || Date.now()) + BATCH_TTL_MS,
          })));
          retained = true;
          // AFTER the retention write, and outside its safety. If the bookkeeping throws,
          // the stub is already correctly in the store and deleting it would reopen the
          // double-charge window this whole branch exists to close — a partial batch that
          // delivered and billed 3 of 5 frames would be re-rendered and billed again. An
          // unregistered key is a bounded memory cost; a deleted one is a second charge.
          rememberKey(store, key, settledKeys, { clientKeyed: true, carriesBytes: false });
        } catch (err) {
          // ONLY IF THE STUB NEVER LANDED. The old catch deleted unconditionally, which was
          // right for a failed `store.set` (the stale 202 promise would answer 'queued'
          // forever) and exactly wrong for anything failing after it. The two cases have
          // opposite money semantics and were sharing one handler.
          if (!retained) store.delete(key);
          console.error(`[atelier] replay stub cleanup FAILED (stub ${retained ? 'RETAINED' : 'dropped so a retry can run'}):`, err?.message || err);
        }
      })
      .catch(() => { /* recorded on the batch; never an unhandled rejection */ });
    return accepted;
}
