/**
 * Atelier Compose — budget keys and the HTTP contract.
 * ============================================================================
 *
 * WHAT THESE TESTS EXIST TO PREVENT
 *
 * 1. THE LANE SHIPPING DEAD AND SILENT. `SWAN_ATELIER_MAX_SPEND_USD_DAILY`
 *    defaults to $0, so a fresh install refuses every request. That is the
 *    correct posture and a terrible surprise, so the refusal must NAME the key
 *    that lifts it and `/limits` must report `enabled:false` rather than
 *    leaving a UI to infer "switched off" from a zero it renders as "$0.00".
 *
 * 2. TWO LANES SHARING ONE BUDGET. The image lane must not read
 *    `SWAN_VIDEO_MAX_SPEND_USD_DAILY`: raising a video budget would silently
 *    raise an image one, and nobody setting it would expect that.
 *
 * 3. AN UNMAPPED ERROR CODE FALLING THROUGH TO A WRONG STATUS. Every code the
 *    service can throw must have a deliberate status; a 402 rendered as a 400
 *    tells a caller to fix their request when they need to raise a cap.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  composeStills, readComposeLimits, ComposeError,
  SPEND_ENV_KEY, RUNS_ENV_KEY, DEFAULT_MAX_SPEND_USD_DAILY,
} from '../../services/atelier/composeStills.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROUTE_SRC = readFileSync(join(HERE, '../../routes/atelierComposeRoutes.mjs'), 'utf8');
const SERVICE_SRC = readFileSync(join(HERE, '../../services/atelier/composeStills.mjs'), 'utf8');

const BRIEF = { text: 'a glacier calving into black water at dawn', intent: 'hero', aspect: '16:9' };
const MODEL = 'openai/gpt-5.4-image-2';
const okVerifier = () => ({ ok: true, model: MODEL, problems: [] });
const noGen = () => { throw new Error('generator must not be reached'); };

describe('budget keys', () => {
  it('defaults to a $0 ceiling and reports itself disabled', () => {
    const l = readComposeLimits({});
    expect(l.maxSpendUsdDaily).toBe(DEFAULT_MAX_SPEND_USD_DAILY);
    expect(l.maxSpendUsdDaily).toBe(0);
    expect(l.disabled).toBe(true);
  });

  it('reads its OWN key and ignores the video lane budget', () => {
    const l = readComposeLimits({ SWAN_VIDEO_MAX_SPEND_USD_DAILY: '999' });
    expect(l.maxSpendUsdDaily).toBe(0);
    expect(l.disabled).toBe(true);

    const own = readComposeLimits({ [SPEND_ENV_KEY]: '5' });
    expect(own.maxSpendUsdDaily).toBe(5);
    expect(own.disabled).toBe(false);
  });

  it('never reads a SWAN_VIDEO_ variable anywhere in the image lane', () => {
    expect(SERVICE_SRC).not.toMatch(/env\.SWAN_VIDEO_/);
    expect(ROUTE_SRC).not.toMatch(/spendGuard/);
  });

  it('refuses a malformed cap instead of coercing it to zero or NaN', () => {
    expect(() => readComposeLimits({ [SPEND_ENV_KEY]: 'lots' }))
      .toThrow(expect.objectContaining({ code: 'E_BAD_CAP' }));
    expect(() => readComposeLimits({ [RUNS_ENV_KEY]: '-4' }))
      .toThrow(expect.objectContaining({ code: 'E_BAD_CAP' }));
  });

  it('treats an empty-string variable as unset rather than as zero-by-accident', () => {
    expect(readComposeLimits({ [SPEND_ENV_KEY]: '   ' }).maxSpendUsdDaily).toBe(0);
  });
});

describe('the switched-off refusal is actionable', () => {
  const disabled = { limits: readComposeLimits({}), usage: { runs: 0, spendUsd: 0 }, verifier: okVerifier, generator: noGen };

  it('names the environment variable that enables the lane', async () => {
    const err = await composeStills({ brief: BRIEF, model: MODEL, count: 4 }, disabled)
      .catch((e) => e);
    expect(err).toBeInstanceOf(ComposeError);
    expect(err.code).toBe('E_SPEND_CEILING');
    expect(err.message).toContain(SPEND_ENV_KEY);
  });

  it('says "switched off", not "you overspent", when nothing has been spent', async () => {
    const err = await composeStills({ brief: BRIEF, model: MODEL, count: 4 }, disabled)
      .catch((e) => e);
    expect(err.message).toMatch(/switched off/i);
    // The misleading shape: implying a charge occurred or a budget was consumed.
    expect(err.message).not.toMatch(/today's spend is/i);
    expect(err.message).toMatch(/Nothing was spent/);
  });

  it('generates once a real budget is set', async () => {
    const calls = [];
    const out = await composeStills({ brief: BRIEF, model: MODEL, count: 2 }, {
      limits: readComposeLimits({ [SPEND_ENV_KEY]: '5' }),
      usage: { runs: 0, spendUsd: 0 },
      verifier: okVerifier,
      generator: async (c, o) => { calls.push(o); return { images: ['b64'], seedUsed: null, usage: {} }; },
      store: new Map(),
    });
    expect(out.stills).toHaveLength(2);
    expect(calls).toHaveLength(2);
  });
});

describe('HTTP contract', () => {
  /**
   * Read the STATUS map out of the route source rather than importing the
   * router — importing it pulls the auth middleware and the whole model layer,
   * which needs a database this suite has no business requiring.
   */
  const mapped = new Set([...ROUTE_SRC.matchAll(/^\s{2}(E_[A-Z_]+):\s*\d{3},$/gm)].map((m) => m[1]));
  const thrown = new Set([...SERVICE_SRC.matchAll(/new ComposeError\('(E_[A-Z_]+)'/g)].map((m) => m[1]));

  it('maps every error code the service can throw to a deliberate status', () => {
    const unmapped = [...thrown].filter((c) => !mapped.has(c));
    expect(unmapped).toEqual([]);
  });

  it('maps a spend ceiling to 402 and a cap to 429, not both to 400', () => {
    expect(ROUTE_SRC).toMatch(/E_SPEND_CEILING:\s*402/);
    expect(ROUTE_SRC).toMatch(/E_RUN_CAP:\s*429/);
  });

  it('returns 207 for a partial grid so a short grid is not read as a whole one', () => {
    expect(ROUTE_SRC).toMatch(/out\.partial \? 207 : 200/);
  });

  it('honours an Idempotency-Key header, matching the video lane', () => {
    expect(ROUTE_SRC).toMatch(/req\.get\('Idempotency-Key'\)/);
  });

  it('gates every route behind protect + adminOnly', () => {
    const routes = [...ROUTE_SRC.matchAll(/router\.(get|post|put|delete)\((.*)$/gm)].map((m) => m[0]);
    expect(routes.length).toBeGreaterThan(0);
    for (const r of routes) expect(r).toMatch(/protect, adminOnly/);
  });

  /** The Motion rung is deliberately absent until an asset store exists to bind to. */
  it('ships no Motion endpoint that would re-prompt from text instead of binding a still', () => {
    expect(ROUTE_SRC).not.toMatch(/router\.(post|get)\('\/(motion|animate)'/);
  });
});
