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
import { promptsFromBrief, promptsFromTaste, LAW_PROFILES } from './promptSources.mjs';
import { applyBrandKit, brandKitView } from '../../../shared/brandKits/registry.mjs';
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
 *   judgeProfile — the KIT's own laws. What the taste corpus is judged by, and no request
 *                  parameter may move it: the corpus is Swan-rated, and an override that
 *                  relaxed the laws guarding it would reopen the brand-scope leak.
 *   lawProfile   — the MERGED profile, after an explicit caller override has won. What the
 *                  COMPILER drops, because relaxing the compiler is a legitimate thing to
 *                  ask for.
 *
 * They arrived as a single parameter, so this lane judged taste correctly and then dropped
 * the wrong laws in the compiler — the eighth defect of the same shape, and the first one
 * where the two halves of a pair were the same variable rather than two files.
 */
export async function runLocalBatch({ batch, req, brief, count, key, promptSource, lawProfile, judgeProfile, kit, model, reservation, deps }) {
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
    let prompts;
    if (promptSource === 'taste') {
      const t = await promptsFromTaste({ count, aspect: brief.aspect || req.aspect, seed: seedFor(key, 0), cinematic: !!req.cinematic, mode: req.mode, lawProfile: judgeProfile }, { env, ...tasteDeps });
      prompts = t.prompts;
    } else {
      // THE BRAND KIT AND THE LAW DROP, which this branch did not apply at all.
      //
      // The synchronous path has applied both since the brand-kit slice. This one — the
      // LOCAL lane, which is the default, which is the 5090, which is where essentially
      // every render actually happens — passed the raw brief straight through. So a
      // non-Swan brand rendered with none of its own language AND was judged by every
      // SwanStudios law, which is precisely the defect that slice was written to fix,
      // still live on the only lane that matters. Seventh time in this review that a fix
      // landed on one half of a pair, and the most expensive.
      prompts = promptsFromBrief({
        ...brief,
        aspect: brief.aspect || req.aspect,
        text: applyBrandKit(brief.text, kit),
        slotOverrides: {
          ...(kit?.negativeSlot ? { negative: kit.negativeSlot } : {}),
          ...(brief.slotOverrides || {}),
        },
        lawProfileDrop: LAW_PROFILES[lawProfile] || [],
      }, { provider: local.STILL_PROVIDER, promptStyle: 'sentence' }, count, compiler).prompts;
    }
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
    if (inFlight) {
      // Release after the loop SETTLES — or after a bounded grace, whichever comes first.
      //
      // Neither extreme is correct, and the tests caught the second one immediately.
      // Releasing the instant the watchdog fires hands the card to a new batch while an
      // in-flight render still owns it. Waiting unconditionally for the loop means a
      // genuinely HUNG render holds the card forever, which is the exact failure the
      // watchdog was added to end. So: prefer the truth (wait for real work), but never
      // wedge — a render that has not finished within the grace is not going to.
      const grace = Math.min(30_000, Math.max(250, watchdogMs));
      let released = false;
      const release = () => { if (!released) { released = true; reservation?.release(); } };
      const graceTimer = setTimeout(release, grace);
      if (typeof graceTimer.unref === 'function') graceTimer.unref();
      inFlight.catch(() => {}).finally(() => { clearTimeout(graceTimer); release(); });
    } else {
      reservation?.release();
    }
  } finally {
    if (timer) clearTimeout(timer);
  }
}
