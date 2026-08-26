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

export async function runLocalBatch({ batch, req, brief, count, key, promptSource, lawProfile, kit, model, reservation, deps }) {
  const { renderStill, withGpu, env, tasteDeps, compiler, persist, watchdogMs = BATCH_WATCHDOG_MS } = deps;
  let timer = null;
  const watchdog = new Promise((_, rej) => {
    timer = setTimeout(() => rej(Object.assign(new Error(`The batch did not finish within ${Math.round(watchdogMs / 60000)} minutes and was abandoned; the GPU is free again.`), { code: 'E_BATCH_TIMEOUT' })), watchdogMs);
    if (typeof timer.unref === 'function') timer.unref();
  });
  try {
    batches.markRunning(batch);
    let prompts;
    if (promptSource === 'taste') {
      const t = await promptsFromTaste({ count, aspect: brief.aspect || req.aspect, seed: seedFor(key, 0), cinematic: !!req.cinematic, mode: req.mode, lawProfile }, { env, ...tasteDeps });
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
    await Promise.race([watchdog, withGpu(async () => {
      for (let i = 0; i < prompts.length; i += 1) {
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
    }, reservation)]);
    const persisted = batch.stills.filter((s) => s.persist?.ok).length;
    batches.finishBatch(batch, { persistence: req.persist === false
      ? { ok: false, code: 'E_PERSIST_SKIPPED', persisted: 0 }
      : { ok: persisted === batch.stills.length, persisted, total: batch.stills.length } });
  } catch (err) {
    reservation?.release();
    batches.finishBatch(batch, { error: err });
  } finally {
    if (timer) clearTimeout(timer);
  }
}
