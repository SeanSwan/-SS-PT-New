/**
 * Atelier Compose — the Still rung.
 * ============================================================================
 *
 * WHAT THESE TESTS EXIST TO PREVENT
 *
 * 1. SPENDING BEFORE A REFUSAL. Every gate here runs before the generator is
 *    reachable, so each refusal test asserts the generator was called ZERO
 *    times. A gate that refuses *after* the API call has already billed is not
 *    a gate; it is a receipt.
 *
 * 2. AN UNPRICED MODEL READING AS FREE. `shared/providers/openrouterModels.mjs`
 *    carries no price field at all, and `spendGuard.checkRunAllowed` only maps
 *    `null` to "unknown, therefore infinite". An `undefined` price falls through
 *    `Number(undefined) || 0` and arrives as **zero**, which is the free-local
 *    path — so an unpriced hosted model would bypass the ceiling entirely.
 *    This suite pins the fail-closed reading.
 *
 * 3. A PARTIAL BATCH REPORTED AS A WHOLE ONE. Four stills are four independent
 *    billed calls. If one fails, the caller must be told which and why, not
 *    handed three images and a success flag — the Still rung's whole job is to
 *    let a human judge candidates, and a silently short grid reads as "the model
 *    only made three good ones".
 *
 * 4. A DOUBLE-CLICKED GENERATE BILLING TWICE. The video lane derives an
 *    idempotency key for exactly this reason; the image lane bills per call and
 *    has none.
 *
 * These assert against the module's real exports. Deleting the implementation
 * fails every one.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  composeStills, estimateStills, ComposeError, MAX_STILLS, IMAGE_PRICES,
} from '../../services/atelier/composeStills.mjs';

const BRIEF = { text: 'a glacier calving into black water at dawn', intent: 'hero', aspect: '16:9' };
const MODEL = 'openai/gpt-5.4-image-2';

/** A generator stub that records every call and never touches the network. */
function stubGenerator(impl) {
  const calls = [];
  const fn = async (compiled, opts) => {
    calls.push({ compiled, opts });
    if (impl) return impl(calls.length, compiled, opts);
    return { images: [`b64-image-${calls.length}`], seedUsed: opts?.seed ?? null, usage: {} };
  };
  fn.calls = calls;
  return fn;
}

function deps(over = {}) {
  // These suites exercise the HOSTED lane, which spends. The service now fails CLOSED when
  // no spend gate is wired — a permissive default made the money gate droppable by
  // accident — so the gate is injected EXPLICITLY here. Writing it out is the point: a
  // test that spends should have to say so.
  return {
    commit: () => ({ allowed: true }),
    generator: stubGenerator(),
    verifier: () => ({ ok: true, model: MODEL, problems: [] }),
    store: new Map(),
    limits: { maxRunsDaily: 50, maxSpendUsdDaily: 5 },
    usage: { runs: 0, spendUsd: 0 },
    ...over,
  };
}

const base = (over = {}) => ({
  // `brandKit` rides with `workspaceId` because naming a workspace without naming a brand
  // is now refused — defaulting there would reinstate the bug brand kits exist to fix.
  brief: BRIEF, model: MODEL, count: 4, userId: 1, workspaceId: 'ws-1', brandKit: 'swanstudios', ...over,
});

describe('composeStills — gates run before any spend', () => {
  it('refuses an empty brief without calling the generator', async () => {
    const d = deps();
    await expect(composeStills(base({ brief: { text: '   ' } }), d))
      .rejects.toMatchObject({ code: 'E_EMPTY_BRIEF' });
    expect(d.generator.calls).toHaveLength(0);
  });

  it('refuses an unconfigured provider without calling the generator', async () => {
    const d = deps({ verifier: () => ({ ok: false, model: MODEL, problems: ['OPENROUTER_API_KEY not found'] }) });
    await expect(composeStills(base(), d)).rejects.toMatchObject({ code: 'E_PROVIDER_UNCONFIGURED' });
    expect(d.generator.calls).toHaveLength(0);
  });

  /**
   * THE FAIL-OPEN THIS SUITE WAS WRITTEN FOR. An unpriced model must deny, not
   * bill. If this test passes while `IMAGE_PRICES` has no entry for the model,
   * the ceiling is decorative.
   */
  it('refuses a model with no recorded price rather than treating it as free', async () => {
    const d = deps();
    await expect(composeStills(base({ model: 'vendor/never-priced-model' }), d))
      .rejects.toMatchObject({ code: 'E_PRICE_UNKNOWN' });
    expect(d.generator.calls).toHaveLength(0);
  });

  it('refuses when the batch would breach the daily spend ceiling', async () => {
    const d = deps({ limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0.001 } });
    await expect(composeStills(base(), d)).rejects.toMatchObject({ code: 'E_SPEND_CEILING' });
    expect(d.generator.calls).toHaveLength(0);
  });

  it('prices the whole batch, not one image, before deciding', () => {
    const est = estimateStills({ count: 4, model: MODEL });
    expect(est.unitUsd).toBe(IMAGE_PRICES[MODEL]);
    expect(est.totalUsd).toBeCloseTo(IMAGE_PRICES[MODEL] * 4, 10);
    expect(est.count).toBe(4);
  });

  it('estimateOnly returns the price and generates nothing', async () => {
    const d = deps();
    const out = await composeStills(base({ estimateOnly: true }), d);
    expect(out.estimateOnly).toBe(true);
    expect(out.cost.totalUsd).toBeCloseTo(IMAGE_PRICES[MODEL] * 4, 10);
    expect(out.stills).toHaveLength(0);
    expect(d.generator.calls).toHaveLength(0);
  });
});

describe('composeStills — batch honesty', () => {
  it('returns one still per requested image, each carrying its own seed and model', async () => {
    const d = deps();
    const out = await composeStills(base({ count: 3, seed: 100 }), d);
    expect(out.stills).toHaveLength(3);
    expect(out.failures).toHaveLength(0);
    expect(d.generator.calls).toHaveLength(3);
    // Distinct seeds — a 4-up of identical seeds is one candidate rendered thrice.
    const seeds = out.stills.map((s) => s.seed);
    expect(new Set(seeds).size).toBe(3);
    for (const s of out.stills) {
      expect(s.model).toBe(MODEL);
      expect(s.promptHash).toMatch(/^[0-9a-f]{12}$/);
    }
  });

  it('reports a partial batch as partial — three stills AND the failure', async () => {
    const d = deps({
      generator: stubGenerator((n) => {
        if (n === 2) throw Object.assign(new Error('provider said no'), { code: 'E_PROVIDER_SAFETY_REJECT' });
        return { images: [`b64-${n}`], seedUsed: null, usage: {} };
      }),
    });
    const out = await composeStills(base({ count: 4 }), d);
    expect(out.stills).toHaveLength(3);
    expect(out.failures).toHaveLength(1);
    expect(out.failures[0]).toMatchObject({ code: 'E_PROVIDER_SAFETY_REJECT' });
    expect(out.partial).toBe(true);
  });

  it('bills only for the images that actually came back', async () => {
    const d = deps({
      generator: stubGenerator((n) => {
        if (n === 2) throw new Error('nope');
        return { images: [`b64-${n}`], seedUsed: null, usage: {} };
      }),
    });
    const out = await composeStills(base({ count: 4 }), d);
    expect(out.cost.chargedUsd).toBeCloseTo(IMAGE_PRICES[MODEL] * 3, 10);
    expect(out.cost.totalUsd).toBeCloseTo(IMAGE_PRICES[MODEL] * 4, 10);
  });

  it('fails the whole call when every image fails, rather than returning an empty success', async () => {
    const d = deps({ generator: stubGenerator(() => { throw new Error('all down'); }) });
    await expect(composeStills(base({ count: 2 }), d)).rejects.toMatchObject({ code: 'E_ALL_FAILED' });
  });
});

describe('composeStills — idempotency and clamping', () => {
  it('replays a repeated idempotency key without generating again', async () => {
    const d = deps();
    const req = base({ count: 2, idempotencyKey: 'fixed-key' });
    const first = await composeStills(req, d);
    const second = await composeStills(req, d);
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.stills).toHaveLength(2);
    expect(d.generator.calls).toHaveLength(2); // NOT 4
  });

  it('derives a key from the request when none is supplied, so a double-click replays', async () => {
    const d = deps();
    await composeStills(base({ count: 1 }), d);
    await composeStills(base({ count: 1 }), d);
    expect(d.generator.calls).toHaveLength(1);
  });

  it('a different brief is a different request and does generate', async () => {
    const d = deps();
    await composeStills(base({ count: 1 }), d);
    await composeStills(base({ count: 1, brief: { ...BRIEF, text: 'something else entirely' } }), d);
    expect(d.generator.calls).toHaveLength(2);
  });

  it('clamps count into 1..MAX_STILLS rather than accepting an unbounded batch', async () => {
    const d = deps();
    const out = await composeStills(base({ count: 999 }), d);
    expect(out.stills).toHaveLength(MAX_STILLS);
    expect(out.clampedFrom).toBe(999);
  });

  it('treats a zero or negative count as one still, not as zero work', async () => {
    const d = deps();
    const out = await composeStills(base({ count: 0 }), d);
    expect(out.stills).toHaveLength(1);
  });
});

describe('ComposeError', () => {
  it('carries a machine-readable code so a route can map it to a status', () => {
    const e = new ComposeError('E_EMPTY_BRIEF', 'no text');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('E_EMPTY_BRIEF');
  });
});
