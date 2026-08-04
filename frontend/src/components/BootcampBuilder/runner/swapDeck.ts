/**
 * ============================================================================
 * FILE: runner/swapDeck.ts
 * PURPOSE: The one-tap intelligent swap — pure logic. SWA-105 Slice 7.
 * AUTHOR: Claude Fable 5 | CREATED: 2026-08-03
 * ============================================================================
 *
 * LAWS (consult synthesis + slice-0 schema, enforced not remembered):
 *  - Mid-class candidates validate against the FROZEN SNAPSHOT (Kimi R6):
 *    equipment counts, joint flags and day type come from `plan.snapshot`,
 *    never from live queries — a profile edited at minute 15 applies to the
 *    NEXT class.
 *  - Swaps are STATION-SCOPED. There is no per-person swap; the schema
 *    rejects person fields on the event (the dignity rule, structural).
 *  - Candidates ride the relaxation ladder (runLadder) so every row carries
 *    its rung, and its chips CONFESS any bent rule (deriveChips puts the
 *    relaxation chip first, never displaced).
 *  - The deck is THREE rows (pickTop 3) — more is a menu, not a decision.
 *  - Exhaustion (R6) offers STRUCTURAL OUTS, never an empty deck.
 *  - The severe joint band gates hard (T0): a movement loading a joint with a
 *    severe flag never enters the deck; mild flags surface as joint_safe
 *    preference, not exclusion.
 */

// @ts-expect-error shared core ships untyped .mjs (established pattern)
import { runLadder, pickTop, STRUCTURAL_OUTS } from '../../../../../shared/bootcamp-core/relaxation.mjs';
// @ts-expect-error shared core ships untyped .mjs
import { deriveChips, toneChips } from '../../../../../shared/bootcamp-core/chips.mjs';
// @ts-expect-error shared core ships untyped .mjs
import { createDayTypeRegistry, SWAN_DAY_TYPES, checkDayTypeLegality } from '../../../../../shared/bootcamp-core/dayTypes.mjs';

export interface SwapCandidate {
  exerciseRef: string;
  displayName: string;
  movement: {
    primaryRegion: string; regions: string[]; pattern: string | null;
    joints: string[]; impact: string;
  } | null;
  equipmentRefs: string[];
  setupSec?: number;
  /** Zero-equipment fallback — R5's guarantee. */
  bodyweight?: boolean;
}

export interface DeckRow {
  candidate: SwapCandidate;
  rung: string;
  chips: Array<{ chip: string; tone: string }>;
}

export interface SwapDeckResult {
  rows: DeckRow[];
  rung: string;
  exhausted: boolean;
  structuralOuts: typeof STRUCTURAL_OUTS;
}

type Snapshot = {
  dayTypeId: string;
  equipmentCounts: Record<string, number>;
  jointFlagCounts: Record<string, number>;
  severeJointFlagCounts: Record<string, number>;
  recentExerciseRefs: string[];
};
type Slot = { slotId: string; exerciseRef: string | null; stationIndex: number | null; movement: { pattern: string | null } | null };
type Plan = {
  snapshot: Snapshot | null;
  blocks: Array<{ kind: string; slots: Slot[] }>;
  log: Array<Record<string, unknown>>;
};

const registry = createDayTypeRegistry(SWAN_DAY_TYPES);

const usedRefs = (plan: Plan): Set<string> => {
  const used = new Set<string>();
  for (const block of plan.blocks) {
    for (const slot of block.slots) if (slot.exerciseRef) used.add(slot.exerciseRef);
  }
  return used;
};

/**
 * Build the deck for one slot. `pool` is adapter-supplied (exercise library);
 * everything else is read from the FROZEN snapshot.
 */
export function buildSwapDeck(opts: {
  plan: Plan;
  slotId: string;
  pool: SwapCandidate[];
}): SwapDeckResult {
  const { plan, slotId, pool } = opts;
  const snapshot = plan.snapshot;
  if (!snapshot) throw new Error('buildSwapDeck: a swap requires the frozen snapshot (class not started?)');

  const target = plan.blocks.flatMap((b) => b.slots).find((s) => s.slotId === slotId);
  if (!target) throw new Error(`buildSwapDeck: unknown slotId "${slotId}"`);

  const dayType = registry.require(snapshot.dayTypeId);
  const inRoom = new Set(Object.keys(snapshot.equipmentCounts ?? {}));
  const severe = snapshot.severeJointFlagCounts ?? {};
  const mildFlagged = new Set(
    Object.entries(snapshot.jointFlagCounts ?? {})
      .filter(([, n]) => (n as number) > 0)
      .map(([joint]) => joint),
  );
  const recent = new Set(snapshot.recentExerciseRefs ?? []);
  const alreadyInClass = usedRefs(plan);

  // R0 hard floor: day-legal AND not severe-contraindicated. Never relaxed —
  // R5's bodyweight substitute still has to pass this.
  const hardFilter = (c: SwapCandidate) => {
    if (!c.movement) return false;
    if (!checkDayTypeLegality(dayType, c.movement).legal) return false;
    if (c.movement.joints.some((j) => (severe[j] ?? 0) > 0)) return false;
    if (c.exerciseRef === target.exerciseRef) return false; // a swap must change something
    return true;
  };

  const result = runLadder({
    candidates: pool.filter((c) => !c.bodyweight),
    alwaysLegal: pool.filter((c) => c.bodyweight),
    need: 3,
    hardFilter,
    identify: (c: SwapCandidate) => c.exerciseRef,
    constraints: {
      anti_repeat: (c: SwapCandidate) => !recent.has(c.exerciseRef),
      pattern_fidelity: (c: SwapCandidate) =>
        !target.movement?.pattern || c.movement?.pattern === target.movement.pattern,
      not_used_this_class: (c: SwapCandidate) => !alreadyInClass.has(c.exerciseRef),
      equipment: (c: SwapCandidate) =>
        c.equipmentRefs.length === 0 || c.equipmentRefs.every((ref) => inRoom.has(ref)),
    },
  });

  const rows: DeckRow[] = pickTop(result, 3).map(
    (entry: { item: SwapCandidate; rung: string }) => ({
      candidate: entry.item,
      rung: entry.rung,
      chips: toneChips(deriveChips(
        {
          samePattern: !!target.movement?.pattern && entry.item.movement?.pattern === target.movement.pattern,
          sameKit: entry.item.equipmentRefs.length > 0
            && entry.item.equipmentRefs.every((ref) => inRoom.has(ref)),
          noSetup: (entry.item.setupSec ?? 0) <= 5,
          notUsedRecently: !recent.has(entry.item.exerciseRef),
          jointSafe: entry.item.movement !== null
            && entry.item.movement.joints.every((j) => !mildFlagged.has(j)),
        },
        { rung: entry.rung },
      )),
    }),
  );

  // Deck semantics differ from pool semantics: the ladder's `exhausted` means
  // "couldn't fill need=3", but a swap needs ONE replacement. A deck showing
  // two honest rows must never claim "no swap exists" — R6 and the structural
  // outs appear only when there is genuinely NOTHING to offer.
  const deckExhausted = rows.length === 0;
  return {
    rows,
    rung: deckExhausted ? 'R6' : rows[rows.length - 1].rung,
    exhausted: deckExhausted,
    structuralOuts: deckExhausted ? STRUCTURAL_OUTS : [],
  };
}

/**
 * Apply a swap: replace the slot in place, append the station-scoped event.
 * Returns a NEW plan — pure. The event shape is exactly what validate.mjs
 * enforces (station-scoped, slotId-targeted, person fields rejected there).
 */
export function applySwap(opts: {
  plan: Plan;
  slotId: string;
  replacement: SwapCandidate;
  rung: string;
  moment: 'build' | 'pre_class' | 'live';
  atEpochMs: number;
}): Plan {
  const { plan, slotId, replacement, rung, moment, atEpochMs } = opts;
  const target = plan.blocks.flatMap((b) => b.slots).find((s) => s.slotId === slotId);
  if (!target) throw new Error(`applySwap: unknown slotId "${slotId}"`);
  if (target.stationIndex === null || target.stationIndex === undefined) {
    throw new Error('applySwap: swaps are station-scoped — this slot has no station');
  }

  const blocks = plan.blocks.map((block) => ({
    ...block,
    slots: block.slots.map((slot) => (slot.slotId === slotId
      ? {
        ...slot,
        exerciseRef: replacement.exerciseRef,
        displayName: replacement.displayName,
        movement: replacement.movement,
        equipmentRefs: replacement.equipmentRefs,
        setupSec: replacement.setupSec ?? 0,
        rung,
        chips: deriveChips({}, { rung }),
      }
      : slot)),
  }));

  return {
    ...plan,
    blocks,
    log: [
      ...plan.log,
      {
        actor: 'trainer',
        type: 'swap',
        moment,
        stationIndex: target.stationIndex,
        slotId,
        from: target.exerciseRef,
        to: replacement.exerciseRef,
        rung,
        ts: atEpochMs,
      },
    ],
  };
}
