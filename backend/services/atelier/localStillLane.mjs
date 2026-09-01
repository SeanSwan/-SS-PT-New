/**
 * localStillLane.mjs — stills on the 5090, at $0, through the existing ComfyUI adapter.
 * ============================================================================
 *
 * Sean's directive: "we are using my 5090 … so it could be free." This lane is
 * the inversion — local is the default, hosted is the opt-in fallback.
 *
 * ── WHAT IS PROVEN AND WHAT IS NOT (tri-state honesty) ─────────────────────
 * `comfyui/wan-2.2` is Apache 2.0, commercial-safe, and PROBED on this box for
 * VIDEO: 832x480x49f in 26.73s, 25,385 MiB peak. Wan's `length` input accepts
 * 1 (min=1, step=4), so a single-frame still is VALID — but no still has ever
 * been rendered and both senior seats of the panel predict a video-latent
 * decoder makes mediocre stills. So this lane ships `claimed`. It refuses to run
 * until an operator has run the probe and set SWAN_ATELIER_LOCAL_STILLS=probed,
 * and `/limits` reports the lane as non-advertisable until then. The code path
 * exists so the probe can use it; the product does not claim it.
 *
 * ── ONE GPU, ONE RENDER ────────────────────────────────────────────────────
 * Two concurrent Wan renders exceed the card (25.4 GB peak each on a 32 GB
 * card). Two controls, both fail-closed:
 *   admission  — read LIVE `vram_free` from ComfyUI's /system_stats, refuse
 *                below a threshold. Liveness is not capacity: a server that
 *                answers with 2 GB free will still OOM.
 *   single-flight — one batch at a time in this process. A second batch is
 *                REFUSED with a retry hint, not queued: a queue hides GPU-hours
 *                behind a request that times out, and the client retries into
 *                a doubled queue.
 *
 * ── THE STILL GRAPH IS OPERATOR-SUPPLIED ───────────────────────────────────
 * Same law as every graph in this lane: it depends on which nodes exist under
 * which names. The operator exports an API-format graph ending in SaveImage,
 * binds the prompt / seed / length node ids, and this lane overlays them onto
 * the adapter's per-provider env so `comfyuiLocal.generate` runs unchanged.
 */

import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync } from 'node:fs';
import * as comfy from '../../../shared/providers/video/comfyuiLocal.mjs';
import { resolve as resolveProvider, ProviderError } from '../../../shared/providers/video/registry.mjs';
import { IMAGE_EXT } from '../../../shared/providers/video/comfyuiGraph.mjs';
import { ComposeError } from './composeLimits.mjs';

export const STILL_PROVIDER = 'comfyui/wan-2.2';
export const PROBE_ENV_KEY = 'SWAN_ATELIER_LOCAL_STILLS';
export const MIN_FREE_VRAM_ENV_KEY = 'SWAN_ATELIER_LOCAL_MIN_FREE_VRAM_MB';
/** Wan's probed video peak plus headroom. A still should need less; until measured, assume it does not. */
export const DEFAULT_MIN_FREE_VRAM_MB = 26000;
export const STILL_ENV = Object.freeze({
  workflow: 'SWAN_ATELIER_STILL_WORKFLOW',
  prompt: 'SWAN_ATELIER_STILL_NODE_PROMPT',
  seed: 'SWAN_ATELIER_STILL_NODE_SEED',
  length: 'SWAN_ATELIER_STILL_NODE_LENGTH',
});
const STILL_TIMEOUT_MS = 5 * 60 * 1000;

export function probeStatus(env = process.env) {
  const v = String(env[PROBE_ENV_KEY] || '').trim().toLowerCase();
  return v === 'probed' ? 'probed' : 'claimed';
}

/**
 * Translate the still lane's own env keys onto the adapter's per-provider
 * keys, so a video graph and a still graph for the same model coexist.
 */
export function overlayEnv(env = process.env) {
  const sfx = comfy.envSuffix(STILL_PROVIDER);
  const out = { ...env };
  if (env[STILL_ENV.workflow]) out[`SWAN_COMFYUI_WORKFLOW_${sfx}`] = env[STILL_ENV.workflow];
  if (env[STILL_ENV.prompt]) out[`SWAN_COMFYUI_NODE_PROMPT_${sfx}`] = env[STILL_ENV.prompt];
  if (env[STILL_ENV.seed]) out[`SWAN_COMFYUI_NODE_SEED_${sfx}`] = env[STILL_ENV.seed];
  if (env[STILL_ENV.length]) out[`SWAN_COMFYUI_NODE_DURATION_${sfx}`] = env[STILL_ENV.length];
  // A still graph has no init image; never inherit the video lane's binding.
  delete out[`SWAN_COMFYUI_NODE_IMAGE_${sfx}`];
  return out;
}

/** Cheap, no GPU: is the lane configured, enabled, licensed, and probed? */
export function verifyLocalStills(env = process.env) {
  const problems = [];
  if (probeStatus(env) !== 'probed') {
    problems.push(`still lane is CLAIMED, not probed — run the probe, then set ${PROBE_ENV_KEY}=probed`);
  }
  if (!env[STILL_ENV.workflow]) problems.push(`${STILL_ENV.workflow} is unset (path to the API-format still graph)`);
  if (!env[STILL_ENV.prompt]) problems.push(`${STILL_ENV.prompt} is unset (node id that receives the prompt)`);
  try {
    resolveProvider(STILL_PROVIDER, { commercial: true });
  } catch (err) {
    if (err instanceof ProviderError) problems.push(err.message); else throw err;
  }
  return { ok: problems.length === 0, provider: STILL_PROVIDER, problems, status: probeStatus(env) };
}

/** Live capacity read. Liveness is not capacity. */
export async function admission(deps = {}) {
  const { fetchImpl = fetch, env = process.env } = deps;
  const host = String(env.SWAN_COMFYUI_URL || 'http://127.0.0.1:8188').replace(/\/$/, '');
  const minFree = Number(env[MIN_FREE_VRAM_ENV_KEY]) || DEFAULT_MIN_FREE_VRAM_MB;
  let stats;
  try {
    const res = await fetchImpl(`${host}/system_stats`, { method: 'GET', signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    stats = await res.json();
  } catch (err) {
    throw new ComposeError('E_COMFY_UNREACHABLE',
      `ComfyUI did not answer at ${host}: ${err?.message || err}. Start it, or request the hosted lane.`);
  }
  const dev = stats?.devices?.[0];
  const freeMb = Number.isFinite(Number(dev?.vram_free)) ? Math.floor(Number(dev.vram_free) / (1024 * 1024)) : null;
  if (freeMb === null) {
    throw new ComposeError('E_COMFY_UNREACHABLE', 'ComfyUI answered but reported no VRAM figure; refusing to guess capacity.');
  }
  if (freeMb < minFree) {
    throw new ComposeError('E_VRAM_BUSY',
      `The GPU has ${freeMb} MiB free; this lane needs ${minFree} MiB. Something else is using it. `
      + `Wait, free it, or lower ${MIN_FREE_VRAM_ENV_KEY} once a still has been measured lower.`,
      { retryAfterSec: 30, freeMb, neededMb: minFree });
  }
  return { host, freeMb, neededMb: minFree };
}

let inFlight = null;
/** Test hook. Production never calls this. */
export function _resetSingleFlight() { inFlight = null; }

/**
 * RESERVE the GPU before anything else looks at it. The single-flight slot is taken
 * here — at lane choice, BEFORE the VRAM read — so two concurrent requests cannot both
 * read "26 GB free" and both dispatch. Check-then-act across two requests is the race
 * three panel seats named; reserving first closes it. The reservation is released by
 * the batch that holds it (or by `release()` if the request refuses before rendering).
 */
export function reserveGpu() {
  if (inFlight) {
    throw new ComposeError('E_LOCAL_BUSY',
      'A local batch is already rendering on the GPU. Wait for it or request the hosted lane.',
      { retryAfterSec: 30 });
  }
  const token = { released: false };
  inFlight = token;
  return { token, release: () => { if (inFlight === token) inFlight = null; token.released = true; } };
}

/**
 * Run a whole batch on the GPU, sequentially, under the reservation. If no reservation
 * was taken (direct callers, tests), take one now.
 */
export async function withGpu(batchFn, reservation = null) {
  const r = reservation || reserveGpu();
  try { return await batchFn(); } finally { r.release(); }
}

/**
 * One still through the existing adapter. Returns the unified image shape.
 */
export async function renderStill({ promptText, seed, outDir }, deps = {}) {
  const { env = process.env, fetchImpl = fetch, generate = comfy.generate, sleep } = deps;
  const dir = outDir || join(tmpdir(), 'swan-atelier-stills');
  mkdirSync(dir, { recursive: true });
  const outPath = join(dir, `still-${Date.now()}-${seed}.png`);
  let out;
  try {
    out = await generate(
      { prompt: promptText, duration: 1 }, // duration binds to Wan's `length`; 1 frame = a still
      { env: overlayEnv(env), providerId: STILL_PROVIDER, outPath, seed, fetchImpl,
        outputMatch: IMAGE_EXT, timeoutMs: STILL_TIMEOUT_MS, ...(sleep ? { sleep } : {}) },
    );
  } catch (err) {
    throw new ComposeError(err.code || 'E_LOCAL_RENDER', err.message);
  }
  const ext = (out.outPath.match(/\.[^.]+$/) || ['.png'])[0].toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return {
    image: { kind: 'path', path: out.outPath, mime },
    sha256: out.sha256,
    bytes: out.bytes,
    provider: STILL_PROVIDER,
    attribution: out.attribution || null,
  };
}
