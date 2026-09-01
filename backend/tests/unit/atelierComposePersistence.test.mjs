/**
 * Atelier Compose — persistence rides on the batch and never hides a still.
 * ============================================================================
 * Split from atelierComposeLanes.test.mjs when that file crossed the 300-line cap.
 * The persister is injected; these pin how its verdict and per-still results
 * propagate through composeStills — not how persistence itself works (see
 * atelierPersistStills.test.mjs for that).
 */

import { describe, it, expect } from 'vitest';
import { composeStills } from '../../services/atelier/composeStills.mjs';

const BRIEF = { text: 'a glacier calving into black water at dawn', intent: 'hero', aspect: '16:9' };
const MODEL = 'openai/gpt-5.4-image-2';
const okHosted = () => ({ ok: true, model: MODEL, problems: [] });

describe('persistence rides on the batch and never hides a still', () => {
  const hostedDeps = (persist) => ({
    env: {}, verifier: okHosted, store: new Map(), limits: { maxRunsDaily: 50, maxSpendUsdDaily: 5, disabled: false },
    commit: () => ({ allowed: true }),   // hosted lane spends; the gate is now explicit
    generator: async () => ({ images: ['b64'], usage: {} }), persist,
  });

  it('attaches assetId per still and a batch verdict when the persister succeeds', async () => {
    const out = await composeStills({ brief: BRIEF, lane: 'hosted', count: 2 }, hostedDeps(async ({ stills }) => {
      stills.forEach((s, i) => Object.assign(s, { assetId: `a${i}`, r2Key: `k${i}`, sha256: 'h', persist: { ok: true, created: true } }));
      return { ok: true, persisted: stills.length, total: stills.length };
    }));
    expect(out.persistence).toMatchObject({ ok: true, persisted: 2 });
    expect(out.stills.map((s) => s.assetId)).toEqual(['a0', 'a1']);
  });

  it('a persister that refuses (storage unconfigured) leaves the stills, marks each, and says why once', async () => {
    const out = await composeStills({ brief: BRIEF, lane: 'hosted', count: 2 }, hostedDeps(async ({ stills }) => {
      stills.forEach((s) => Object.assign(s, { assetId: null, persist: { ok: false, code: 'E_STORAGE_UNCONFIGURED', message: 'no R2' } }));
      return { ok: false, persisted: 0, total: stills.length, code: 'E_STORAGE_UNCONFIGURED', message: 'no R2' };
    }));
    expect(out.stills).toHaveLength(2);
    expect(out.persistence.code).toBe('E_STORAGE_UNCONFIGURED');
    expect(out.stills.every((s) => s.assetId === null && s.persist.ok === false)).toBe(true);
    expect(out.partial).toBe(false); // persistence is not a render failure
  });

  it('persist:false skips persistence explicitly and says so', async () => {
    let called = 0;
    const out = await composeStills({ brief: BRIEF, lane: 'hosted', count: 1, persist: false }, hostedDeps(async () => { called += 1; }));
    expect(called).toBe(0);
    expect(out.persistence.code).toBe('E_PERSIST_SKIPPED');
  });
});
