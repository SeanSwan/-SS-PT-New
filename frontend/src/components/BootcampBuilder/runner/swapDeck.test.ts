/**
 * SWA-105 Slice 7 — the SwapDeck. Frozen-snapshot candidates, ladder rungs,
 * confessing chips, structural outs, and the station-scoped apply.
 */
import { describe, expect, it } from 'vitest';

import { buildSwapDeck, applySwap, type SwapCandidate } from './swapDeck';
// @ts-expect-error shared core ships untyped .mjs
import { ALL_FIXTURES } from '../../../../../shared/bootcamp-core/fixtures.mjs';
// @ts-expect-error shared core ships untyped .mjs
import { validateClassPlan } from '../../../../../shared/bootcamp-core/classPlan.mjs';

const mv = (primaryRegion: string, pattern: string | null, joints: string[] = []) => ({
  primaryRegion, regions: [primaryRegion], pattern, joints, impact: 'low',
});

const cand = (exerciseRef: string, over: Partial<SwapCandidate> = {}): SwapCandidate => ({
  exerciseRef,
  displayName: exerciseRef.replace(/^ex_/, '').replace(/_/g, ' '),
  movement: mv('lower', 'squat'),
  equipmentRefs: [],
  ...over,
});

// fullBody fixture: swap target = Goblet Squat (station 0, squat pattern);
// snapshot has kettlebell x2 + dumbbell x8 in the room, severe knee band = 1.
const plan = () => ALL_FIXTURES.fullBodyStationClass();
const SLOT = 'goblet_squat';

describe('buildSwapDeck — the frozen snapshot is the law', () => {
  it('ranks a strict same-pattern, in-room candidate at R0 with honest chips', () => {
    const deck = buildSwapDeck({
      plan: plan(),
      slotId: SLOT,
      pool: [cand('ex_box_squat', { equipmentRefs: ['eq_dumbbell'], setupSec: 5 })],
    });
    expect(deck.rows[0].rung).toBe('R0');
    const chips = deck.rows[0].chips.map((c) => c.chip);
    expect(chips).toContain('same_pattern');
    expect(chips).toHaveLength(2); // never more — two is the cap
  });

  it('a severe-flagged joint is a HARD floor — the movement never enters the deck', () => {
    // snapshot.severeJointFlagCounts = { knee: 1 }
    const deck = buildSwapDeck({
      plan: plan(),
      slotId: SLOT,
      pool: [
        cand('ex_jump_squat', { movement: mv('lower', 'squat', ['knee']) }),
        cand('ex_hip_hinge', { movement: mv('lower', 'hinge') }),
      ],
    });
    expect(deck.rows.map((r) => r.candidate.exerciseRef)).not.toContain('ex_jump_squat');
    expect(deck.rows.map((r) => r.candidate.exerciseRef)).toContain('ex_hip_hinge');
  });

  it('a wrong-day candidate never enters, even when the deck is starving', () => {
    const deck = buildSwapDeck({
      plan: plan(),
      slotId: SLOT,
      pool: [cand('ex_bench_press', { movement: mv('upper', 'push_horizontal') })],
    });
    // full_body admits upper — use a day-illegal one instead: unclassified.
    expect(deck.rows.map((r) => r.candidate.exerciseRef)).toContain('ex_bench_press');
    const deck2 = buildSwapDeck({
      plan: plan(),
      slotId: SLOT,
      pool: [cand('ex_mystery', { movement: null })],
    });
    expect(deck2.rows).toHaveLength(0);
    expect(deck2.exhausted).toBe(true);
  });

  it('missing equipment relaxes to a rung and the chip CONFESSES it first', () => {
    const deck = buildSwapDeck({
      plan: plan(),
      slotId: SLOT,
      pool: [
        cand('ex_landmine_squat', { equipmentRefs: ['eq_landmine'] }), // not in the room
        cand('ex_air_squat', { bodyweight: true }),
      ],
    });
    const landmine = deck.rows.find((r) => r.candidate.exerciseRef === 'ex_landmine_squat');
    expect(landmine?.rung).toBe('R5');
    expect(landmine?.chips[0].chip).toBe('bodyweight_sub'); // the confession leads
    expect(landmine?.chips[0].tone).toBe('relaxed');
  });

  it('the pinned bodyweight set guarantees the deck is never empty (R5 law)', () => {
    const deck = buildSwapDeck({
      plan: plan(),
      slotId: SLOT,
      pool: [cand('ex_air_squat', { bodyweight: true }), cand('ex_split_squat', { bodyweight: true })],
    });
    expect(deck.rows.length).toBeGreaterThan(0);
    expect(deck.exhausted).toBe(false);
  });

  it('true exhaustion offers STRUCTURAL OUTS, never an empty state', () => {
    const deck = buildSwapDeck({ plan: plan(), slotId: SLOT, pool: [] });
    expect(deck.exhausted).toBe(true);
    expect(deck.rung).toBe('R6');
    expect(deck.structuralOuts.length).toBeGreaterThan(0);
    expect(deck.structuralOuts[0].kind).toBe('hold_longer');
  });

  it('the current exercise is never offered as its own replacement', () => {
    const deck = buildSwapDeck({
      plan: plan(),
      slotId: SLOT,
      pool: [cand('ex_goblet_squat')], // the target itself
    });
    expect(deck.rows).toHaveLength(0);
  });

  it('an unstarted class (no snapshot) refuses to deal', () => {
    const p = plan();
    p.snapshot = null;
    expect(() => buildSwapDeck({ plan: p, slotId: SLOT, pool: [] })).toThrow(/frozen snapshot/);
  });
});

describe('applySwap — station-scoped, schema-valid, pure', () => {
  it('produces a plan that PASSES core validation with the event appended', () => {
    const p = plan();
    const next = applySwap({
      plan: p,
      slotId: SLOT,
      replacement: cand('ex_box_squat', { equipmentRefs: ['eq_dumbbell'] }),
      rung: 'R0',
      moment: 'live',
      atEpochMs: 1_785_000_900_000,
    });
    expect(validateClassPlan(next)).toEqual([]);
    const event = next.log.at(-1) as Record<string, unknown>;
    expect(event).toMatchObject({
      type: 'swap', actor: 'trainer', moment: 'live',
      stationIndex: 0, slotId: SLOT, from: 'ex_goblet_squat', to: 'ex_box_squat',
    });
  });

  it('does not mutate the input plan', () => {
    const p = plan();
    const before = JSON.stringify(p);
    applySwap({
      plan: p, slotId: SLOT, replacement: cand('ex_box_squat'),
      rung: 'R3', moment: 'pre_class', atEpochMs: 1,
    });
    expect(JSON.stringify(p)).toBe(before);
  });

  it('a relaxed replacement carries its confession chip on the slot itself', () => {
    const next = applySwap({
      plan: plan(), slotId: SLOT, replacement: cand('ex_air_squat', { bodyweight: true }),
      rung: 'R5', moment: 'live', atEpochMs: 2,
    });
    const slot = next.blocks.flatMap((b) => b.slots).find((s) => s.slotId === SLOT) as { chips: string[] };
    expect(slot.chips).toContain('bodyweight_sub');
  });

  it('refuses a slot with no station — swaps are station-scoped by law', () => {
    const p = plan();
    expect(() => applySwap({
      plan: p, slotId: 'world_s_greatest_stretch', replacement: cand('ex_x'),
      rung: 'R0', moment: 'live', atEpochMs: 3,
    })).toThrow(/station-scoped/);
  });
});
