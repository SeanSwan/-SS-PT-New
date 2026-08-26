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
import { sha, seedFor } from './composeLimits.mjs';
import { buildPrompts } from './composePrompts.mjs';
import { releaseWhenSettled } from './composeGuards.mjs';
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
    releaseWhenSettled(reservation, inFlight, watchdogMs);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
