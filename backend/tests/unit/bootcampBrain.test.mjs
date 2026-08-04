/**
 * SWA-105 Slice 4 — the brain seam: heuristic judgment, LLM validation,
 * instrumented fallback, the Open Gym assumption channel, and the judgment
 * regression suite (Kimi R5: a brain that cannot beat the identity baseline
 * is decorative).
 */
import { describe, expect, it } from 'vitest';

import {
  heuristicBrain, validateBrainOrdering, orderPoolWithBrain, judgmentMetrics,
} from '../../services/bootcamp/bootcampBrain.mjs';

const mv = (pattern) => ({ primaryRegion: 'lower', regions: ['lower'], pattern, joints: [], impact: 'low' });
const ex = (key, pattern, extra = {}) => ({ key, coreMovement: mv(pattern), ...extra });

/** A pool deliberately ordered WORST-case: same pattern clumped, recents first. */
const CLUMPED = [
  ex('squat_a', 'squat'), ex('squat_b', 'squat'), ex('squat_c', 'squat'),
  ex('hinge_a', 'hinge'), ex('hinge_b', 'hinge'),
  ex('lunge_a', 'lunge'), ex('lunge_b', 'lunge'),
];

describe('judgment regression suite (Kimi R5)', () => {
  it('the heuristic brain beats the identity baseline on fatigue sequencing', () => {
    const brain = judgmentMetrics(heuristicBrain({ pool: CLUMPED }), { window: 7 });
    const identity = judgmentMetrics(CLUMPED, { window: 7 });
    expect(identity.sameAdjacent).toBeGreaterThanOrEqual(4); // the clump is real
    expect(brain.sameAdjacent).toBeLessThan(identity.sameAdjacent);
  });

  it('the heuristic brain pushes recently-taught exercises out of the head', () => {
    const recentKeys = new Set(['squat_a', 'hinge_a']);
    const brain = judgmentMetrics(heuristicBrain({ pool: CLUMPED, recentKeys }), { recentKeys, window: 3 });
    const identity = judgmentMetrics(CLUMPED, { recentKeys, window: 3 });
    expect(brain.recentInHead).toBeLessThanOrEqual(identity.recentInHead);
    expect(brain.recentInHead).toBe(0);
  });

  it('enforces "recently-taught, never first" even when ALL scores are bad (Opus §2.8)', () => {
    // Every exercise recent except one; that one must lead regardless of pattern.
    const pool = [
      ex('recent_a', 'squat'), ex('recent_b', 'squat'), ex('fresh_c', 'squat'),
    ];
    const recentKeys = new Set(['recent_a', 'recent_b']);
    const ordered = heuristicBrain({ pool, recentKeys });
    expect(recentKeys.has(ordered[0].key)).toBe(false);
    expect(ordered[0].key).toBe('fresh_c');
  });

  it('leaves the head alone when it is already fresh', () => {
    const pool = [ex('fresh_a', 'squat'), ex('recent_b', 'hinge')];
    const ordered = heuristicBrain({ pool, recentKeys: new Set(['recent_b']) });
    expect(ordered[0].key).toBe('fresh_a');
  });

  it('when EVERYTHING is recent, does not loop or throw (no fresh to promote)', () => {
    const pool = [ex('r1', 'squat'), ex('r2', 'hinge')];
    const ordered = heuristicBrain({ pool, recentKeys: new Set(['r1', 'r2']) });
    expect(ordered).toHaveLength(2);
  });

  it('is deterministic — same input, same order', () => {
    const a = heuristicBrain({ pool: CLUMPED }).map((e) => e.key);
    const b = heuristicBrain({ pool: CLUMPED }).map((e) => e.key);
    expect(a).toEqual(b);
  });
});

describe('Layer 3 over brain output — the brain can never introduce', () => {
  const pool = CLUMPED.slice(0, 3);

  it('accepts a permutation', () => {
    const ordered = validateBrainOrdering(['squat_c', 'squat_a', 'squat_b'], pool);
    expect(ordered.map((e) => e.key)).toEqual(['squat_c', 'squat_a', 'squat_b']);
  });

  it('a subset keeps the unmentioned tail — nothing is lost', () => {
    const ordered = validateBrainOrdering(['squat_b'], pool);
    expect(ordered.map((e) => e.key)).toEqual(['squat_b', 'squat_a', 'squat_c']);
  });

  it('an invented key rejects the WHOLE ordering — no repair of hallucinations', () => {
    expect(validateBrainOrdering(['squat_a', 'bicep_blaster_9000'], pool)).toBeNull();
  });

  it('duplicates and empties reject', () => {
    expect(validateBrainOrdering(['squat_a', 'squat_a'], pool)).toBeNull();
    expect(validateBrainOrdering([], pool)).toBeNull();
  });
});

describe('instrumented fallback — every failure has a name', () => {
  const basePool = CLUMPED.slice(0, 4);
  const run = (overrides) => orderPoolWithBrain({
    pool: basePool, dayTypeId: 'lower_body', env: { SWAN_BOOTCAMP_BRAIN: 'llm' }, ...overrides,
  });

  it('flag off -> heuristic, no fallback reason (nothing failed)', async () => {
    const r = await orderPoolWithBrain({ pool: basePool, dayTypeId: 'lower_body', env: {} });
    expect(r.brainUsed).toBe('heuristic');
    expect(r.fallbackReason).toBeNull();
  });

  it('flag on with no provider -> no_provider', async () => {
    const r = await run({ completionFn: null });
    expect(r).toMatchObject({ brainUsed: 'heuristic', fallbackReason: 'no_provider' });
  });

  it('garbage reply -> unparseable_reply', async () => {
    const r = await run({ completionFn: async () => 'sure! here are my thoughts...' });
    expect(r.fallbackReason).toBe('unparseable_reply');
  });

  it('hallucinated keys -> invalid_ordering', async () => {
    const r = await run({ completionFn: async () => '{"orderedKeys": ["made_up"]}' });
    expect(r.fallbackReason).toBe('invalid_ordering');
  });

  it('a hung provider -> timeout, and the class still generates', async () => {
    const r = await run({
      completionFn: () => new Promise(() => {}),
      env: { SWAN_BOOTCAMP_BRAIN: 'llm', SWAN_BOOTCAMP_BRAIN_TIMEOUT_MS: '50' },
    });
    expect(r.fallbackReason).toBe('timeout');
    expect(r.pool).toHaveLength(basePool.length);
  });

  it('a valid reply (in OPAQUE TOKENS) is used and attributed', async () => {
    // basePool = [squat_a, squat_b, squat_c, hinge_a] -> ex_0..ex_3.
    // The model speaks tokens; hinge_a is ex_3.
    const r = await run({
      completionFn: async () => '{"orderedKeys": ["ex_3", "ex_0", "ex_1", "ex_2"]}',
    });
    expect(r.brainUsed).toBe('llm');
    expect(r.pool[0].key).toBe('hinge_a');
    expect(r.fallbackReason).toBeNull();
  });

  // ── Kimi F2: keys never reach the LLM raw; tokens map back ──────────────
  it('the prompt sent to the model contains NO raw exercise key — only tokens', async () => {
    let seenPrompt = '';
    await run({ completionFn: async (prompt) => { seenPrompt = prompt; return '{"orderedKeys":["ex_0"]}'; } });
    // A trainer-authored key (PII/injection risk) must not appear on the wire.
    expect(seenPrompt).not.toContain('squat_a');
    expect(seenPrompt).toContain('ex_0');
  });

  it('a reply echoing a RAW key (not a token) is rejected — injection cannot select', async () => {
    const r = await run({ completionFn: async () => '{"orderedKeys": ["squat_a"]}' });
    expect(r.fallbackReason).toBe('invalid_ordering'); // raw key is not a known token
  });

  // ── Kimi F4: oversized reply + timeout clamp ───────────────────────────
  it('an oversized reply is dropped before parse (memory-event guard)', async () => {
    const huge = `{"orderedKeys":["ex_0"],"pad":"${'x'.repeat(70_000)}"}`;
    const r = await run({ completionFn: async () => huge });
    expect(r.fallbackReason).toBe('oversized_reply');
  });

  it('the timeout is clamped to a sane band — a too-small env value still waits the 1s floor', async () => {
    // 50ms would let a flaky-slow provider get cut off mid-flight; the floor
    // holds it to 1s. (The 30s ceiling is the same Math clamp; not timed here
    // because it collides with vitest's own 30s test budget.)
    const start = Date.now();
    const r = await run({
      completionFn: () => new Promise(() => {}),
      env: { SWAN_BOOTCAMP_BRAIN: 'llm', SWAN_BOOTCAMP_BRAIN_TIMEOUT_MS: '50' },
    });
    expect(r.fallbackReason).toBe('timeout');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(950); // clamped UP to the 1s floor, not 50ms
    expect(elapsed).toBeLessThan(3_000);
  });
});

describe('the Open Gym assumption channel (Kimi R4)', () => {
  it('open_gym carries sanitized assumptions through', async () => {
    const r = await orderPoolWithBrain({
      pool: CLUMPED.slice(0, 2), dayTypeId: 'cardio', mode: 'open_gym',
      env: { SWAN_BOOTCAMP_BRAIN: 'llm' },
      completionFn: async () => JSON.stringify({
        orderedKeys: ['ex_0', 'ex_1'],
        assumptions: ['Assumed dumbbells available', '', 42, 'x'.repeat(500), 'Assumed floor space'],
      }),
    });
    expect(r.declaredAssumptions).toEqual(['Assumed dumbbells available', 'Assumed floor space']);
  });

  it('strict mode NEVER carries assumptions — there is nothing to assume', async () => {
    const r = await orderPoolWithBrain({
      pool: CLUMPED.slice(0, 2), dayTypeId: 'cardio', mode: 'strict',
      env: { SWAN_BOOTCAMP_BRAIN: 'llm' },
      completionFn: async () => '{"orderedKeys": ["ex_0"], "assumptions": ["should be ignored"]}',
    });
    expect(r.declaredAssumptions).toEqual([]);
  });
});
