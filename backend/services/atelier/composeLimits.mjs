/**
 * composeLimits.mjs — constants, ceilings, pricing and keys for the Compose ladder.
 * ============================================================================
 *
 * Extracted from composeStills.mjs when the local lane and the taste source
 * arrived: the orchestrator was 294 lines against a 300 cap, and both seats of
 * the hostile panel called the breach before a line was written. Everything
 * here is DATA and pure helpers; nothing here spends or generates.
 *
 * ── THE FAIL-OPEN THIS TABLE REFUSES TO INHERIT ────────────────────────────
 * `spendGuard.checkRunAllowed` maps a `null` price to Infinity — unknown cost is
 * unaffordable, which is right. But the image catalogue carries NO price field,
 * so its cost arrives `undefined`, misses the `=== null` branch, falls through
 * `Number(undefined) || 0`, and lands on ZERO — the free-local branch. An
 * unpriced hosted model would bill without limit through a guard written to
 * prevent exactly that. So prices live here, MEASURED only, and a model absent
 * from the table is refused rather than assumed free.
 */

import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { DEFAULT_MODEL } from '../../../shared/providers/openrouterModels.mjs';

/** A 4-up grid is the judgement unit. More candidates is a batch job (S8), not a rung. */
export const MAX_STILLS = 4;

/** Same window the video route uses, so a double-click behaves identically in both lanes. */
export const DERIVED_KEY_BUCKET_MS = 60 * 1000;

/**
 * Brief ceiling. Unbounded text goes straight into a ComfyUI node string field
 * or a hosted prompt body; a 2 MB brief passing the "not empty" gate is a
 * self-DoS on the studio's only GPU. 2,000 chars is more than any brief the
 * compiler can use, and well under every provider's prompt cap.
 */
export const MAX_BRIEF_CHARS = 2000;

/**
 * USD per generated image on the HOSTED lane, MEASURED — never estimated.
 * `openai/gpt-5.4-image-2` at $0.0039 is the figure in openrouterImage.mjs's
 * own endpoint note (images endpoint, 2026-08-11). Adding a model here requires
 * a real measurement, not a vendor page.
 */
export const IMAGE_PRICES = Object.freeze({
  'openai/gpt-5.4-image-2': 0.0039,
});

/**
 * The image lane reads its OWN budget key. Reusing the video lane's would have
 * meant raising a *video* budget silently raised an *image* budget. The $0
 * default is deliberate: a lane that bills is denied until someone sets a real
 * number, and every refusal names the variable that lifts it.
 */
export const SPEND_ENV_KEY = 'SWAN_ATELIER_MAX_SPEND_USD_DAILY';
export const RUNS_ENV_KEY = 'SWAN_ATELIER_MAX_RUNS_DAILY';
export const DEFAULT_MAX_SPEND_USD_DAILY = 0;
export const DEFAULT_MAX_RUNS_DAILY = 50;

export class ComposeError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'ComposeError';
    this.code = code;
    Object.assign(this, extra);
  }
}

export function readComposeLimits(env = process.env) {
  const num = (raw, fallback) => {
    if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      throw new ComposeError('E_BAD_CAP',
        `${SPEND_ENV_KEY}/${RUNS_ENV_KEY} must be a non-negative number; got "${raw}".`);
    }
    return n;
  };
  const maxSpendUsdDaily = num(env[SPEND_ENV_KEY], DEFAULT_MAX_SPEND_USD_DAILY);
  return Object.freeze({
    maxRunsDaily: num(env[RUNS_ENV_KEY], DEFAULT_MAX_RUNS_DAILY),
    maxSpendUsdDaily,
    /** True when the HOSTED lane is off because nobody has set a budget. Local is unaffected. */
    disabled: maxSpendUsdDaily === 0,
    spendEnvKey: SPEND_ENV_KEY,
  });
}

/** Price a whole hosted batch. The batch is the decision unit, so the batch is what gets priced. */
export function estimateStills({ count = 1, model = DEFAULT_MODEL } = {}) {
  const n = clampCount(count).count;
  const unitUsd = IMAGE_PRICES[model];
  if (unitUsd === undefined) {
    throw new ComposeError('E_PRICE_UNKNOWN',
      `No measured price for "${model}". A model with no recorded cost is refused rather than `
      + 'billed as free. Measure one run and add it to IMAGE_PRICES.');
  }
  return { count: n, model, unitUsd, totalUsd: unitUsd * n };
}

export function clampCount(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return { count: 1, clampedFrom: Number.isFinite(n) ? raw : undefined };
  if (n > MAX_STILLS) return { count: MAX_STILLS, clampedFrom: raw };
  return { count: Math.floor(n) };
}

export const sha = (s) => createHash('sha256').update(s).digest('hex');

/**
 * Normalize operator text before it is hashed, compiled, or sent anywhere.
 * NFC so a composed and a decomposed spelling of the same brief hash the same
 * (a decomposed variant otherwise bypasses the replay bucket); control
 * characters and bidi overrides stripped because a node string field is not a
 * place for them.
 */
export function normalizeText(raw) {
  return String(raw ?? '')
    .normalize('NFC')
    // control chars, DEL, zero-width + bidi marks, and isolate/override controls
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .trim();
}

/**
 * A seed per still, derived rather than random, so a replayed batch is the same
 * batch. This is the ONE seed authority: the taste server receives it as input
 * and its returned seed is recorded, never substituted.
 */
export function seedFor(key, index) {
  return parseInt(sha(`${key}:${index}`).slice(0, 8), 16);
}

export function deriveKey({ brief, promptSource, lane, model, count, seed, workspaceId, userId, brandKit, lawProfile, cinematic, mode }, now) {
  const bucket = Math.floor(now / DERIVED_KEY_BUCKET_MS);
  // AN OWNERLESS REQUEST COALESCES WITH NOBODY. The owner is part of the hash, so two
  // ANONYMOUS callers making the identical request in the same bucket derived the identical
  // key and received each other's stills — the same confused deputy the client-key guard
  // closed, arriving by the derived path instead. A nonce makes an ownerless key unique to
  // its call: such a caller loses double-click coalescing, which is the correct trade,
  // because there is no identity to coalesce ON.
  const solo = userId === undefined || userId === null || userId === '' ? randomUUID() : null;
  return sha(JSON.stringify({
    u: userId ?? null, w: workspaceId ?? null, ps: promptSource ?? 'brief', ln: lane ?? 'auto',
    model, count, b: brief?.text ?? '', i: brief?.intent ?? '', a: brief?.aspect ?? '',
    f: brief?.facets ?? [], s: seed ?? null, bucket, solo,
    // EVERY FIELD THAT CHANGES THE OUTPUT BELONGS IN THE IDENTITY. These four did not,
    // and brandKit is the one that mattered: it was added a slice later and nobody came
    // back to the key, so the SAME brief under swanstudios and under universal derived
    // the SAME key — and the second request silently received the first one's
    // differently-branded images. A coalescing key that ignores an input is not an
    // identity, it is a collision waiting for someone to change a dropdown.
    bk: brandKit ?? null, lp: lawProfile ?? null, cn: cinematic ? 1 : 0, md: mode ?? null,
  })).slice(0, 40);
}
