/**
 * ============================================================================
 * FILE: runner/audienceDirector.ts
 * PURPOSE: The pure Audience-screen director — maps (plan, state, now, room)
 *          to exactly one screen S0–S7 and its complete view-model.
 *          SWA-105 Slice 6.
 * AUTHOR: Claude Fable 5 | CREATED: 2026-08-03
 * ============================================================================
 *
 * DESIGN AUTHORITY: the ratified consult synthesis (master prompt §12/P1–P6).
 * The station-circuit screen is a CLOCK BAND + N STATION CARDS — never one
 * huge exercise; 14 people are doing different things simultaneously. Hero
 * layouts are correct ONLY for warmup/cooldown/paced blocks (everyone
 * synchronized). This module is pure so every one of those laws is pinned by
 * a unit test before any pixel exists.
 *
 * VIEW-MODEL LAWS (each maps to a consult finding):
 *  - Every work render answers the five participant questions: what am I
 *    doing / how long / what's next / how do I do it / what if it hurts.
 *  - The modification line is ALWAYS present on a card — never behind an
 *    interaction (the dignity feature).
 *  - `endsAtLabel` is always present ("ENDS 6:47") — people silently want it.
 *  - Hierarchy DECAYS across rounds: round 1 the name dominates (people are
 *    learning it); rounds 2+ the scheme dominates (emphasis: 'scheme').
 *  - Density comes from the ROOM (stationPresentation), never from taste:
 *    over-capacity alternates pages or falls back to rotation-only + paper.
 */

import { locate, type RunnerState } from './runnerProtocol';
// @ts-expect-error shared core ships untyped .mjs (established pattern)
import { stationPresentation, maxStationCards, PHASES } from '../../../../../shared/bootcamp-core/phases.mjs';

export type AudienceScreenId = 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7';

export interface StationCardVM {
  stationIndex: number;
  label: string;
  exerciseName: string;
  /** The always-visible modification line (dignity feature). */
  modificationLine: string | null;
  equipmentLine: string | null;
  nextUpName: string | null;
  /** Rounds 2+ demote the name and promote the scheme. */
  emphasis: 'name' | 'scheme';
}

export interface AudienceVM {
  screen: AudienceScreenId;
  clock: { remainingSec: number; phaseLabel: string; endsAtLabel: string };
  /** S1/S4/S5/S6 hero surface — one synchronized exercise. */
  hero: { exerciseName: string; mediaSlotId: string | null; cue: string | null } | null;
  /** S2 station grid. */
  stations: StationCardVM[];
  presentation: { mode: 'grid' | 'alternating' | 'rotation_only'; perPage: number; pages: number; page: number };
  round: { current: number; total: number } | null;
}

export interface RoomProfile {
  tvDiagonalIn: number | null;
  maxViewDistanceFt: number | null;
}

const pad = (n: number) => String(n).padStart(2, '0');
/** Local wall-clock "ENDS 6:47" from an epoch — injected tz-free formatting. */
export function endsLabel(endsAtEpochMs: number): string {
  const d = new Date(endsAtEpochMs);
  const h = d.getHours() % 12 || 12;
  return `ENDS ${h}:${pad(d.getMinutes())}`;
}

type Slot = {
  slotId: string; displayName: string; stationIndex: number | null;
  variants?: Array<{ key: string; label: string }>; equipmentRefs?: string[];
};
type Plan = {
  structure: { shape: string; stationCount: number; exercisesPerStation: number; rounds: number };
  blocks: Array<{ kind: string; pacing?: { mode: string } | null; slots: Slot[] }>;
  stations: Array<{ stationIndex: number; label: string }>;
};

function workSlotsByStation(plan: Plan): Map<number, Slot[]> {
  const map = new Map<number, Slot[]>();
  for (const block of plan.blocks) {
    if (block.kind !== 'work' || (block.pacing && block.pacing.mode !== 'interval')) continue;
    for (const slot of block.slots) {
      if (slot.stationIndex === null || slot.stationIndex === undefined) continue;
      map.set(slot.stationIndex, [...(map.get(slot.stationIndex) ?? []), slot]);
    }
  }
  return map;
}

const modificationLine = (slot: Slot): string | null => {
  const easier = slot.variants?.find((v) => v.key === 'easier');
  const jointVariant = slot.variants?.find((v) => !['easier', 'harder'].includes(v.key));
  return jointVariant?.label ?? easier?.label ?? null;
};

/**
 * The director. Pure: same inputs, same screen.
 */
export function directAudience(
  plan: Plan,
  state: RunnerState,
  nowEpochMs: number,
  room: RoomProfile = { tvDiagonalIn: null, maxViewDistanceFt: null },
): AudienceVM {
  const { timeline, at } = locate(plan as object, state, nowEpochMs);
  const endsAtLabel = endsLabel(timeline.endsAt + state.shiftMs);

  const capacity = maxStationCards(room.tvDiagonalIn, room.maxViewDistanceFt);
  const pres = stationPresentation(plan.structure.stationCount, capacity);

  const base = (screen: AudienceScreenId, phaseLabel: string): AudienceVM => ({
    screen,
    clock: { remainingSec: at.remainingSec, phaseLabel, endsAtLabel },
    hero: null,
    stations: [],
    presentation: { ...pres, page: 0 },
    round: at.segment?.round ? { current: at.segment.round, total: plan.structure.rounds } : null,
  });

  if (state.endedEarly || at.status === 'complete') return base('S7', 'Complete');
  if (at.status === 'pending') return base('S0', 'Starting soon');

  const seg = at.segment!;
  const heroFor = (screen: AudienceScreenId, label: string, cue: string | null = null): AudienceVM => {
    const slot = findSlot(plan, seg.slotId);
    return {
      ...base(screen, label),
      hero: { exerciseName: slot?.displayName ?? seg.label, mediaSlotId: seg.slotId, cue },
    };
  };

  switch (seg.phase) {
    case PHASES.WARMUP: return heroFor('S1', 'Warmup');
    case PHASES.COOLDOWN: return heroFor('S6', 'Stretch');
    case PHASES.ROUND_BREAK: return base('S3', 'Round break');
    case PHASES.STATION_TRANSITION: return { ...base('S3', 'MOVE'), stations: stationCards(plan, seg, +1) };
    case PHASES.REST: {
      // S4 turns dead time into instruction: the NEXT exercise's demo + a cue.
      if (seg.slotId || plan.structure.shape === 'full_group') {
        return heroFor('S4', 'Rest', 'Next up — set up now');
      }
      return { ...base('S4', 'Rest'), stations: stationCards(plan, seg, +1) };
    }
    case PHASES.WORK: {
      // Paced or full_group work is synchronized — hero (S5).
      if (seg.pacingMode || plan.structure.shape === 'full_group' || seg.slotId) {
        return heroFor('S5', seg.pacingMode ? seg.pacingMode.toUpperCase() : 'Work');
      }
      // The primary screen: clock band + every station's CURRENT slot.
      return { ...base('S2', 'Work'), stations: stationCards(plan, seg, 0) };
    }
    default: return base('S2', 'Work');
  }
}

type SegLike = { round: number | null; position: number | null };

/** Each station shows ITS OWN slot at the segment's position (+lookahead for next-up). */
function stationCards(plan: Plan, seg: SegLike, offset: 0 | 1): StationCardVM[] {
  const byStation = workSlotsByStation(plan);
  const perStation = plan.structure.exercisesPerStation;
  const round = seg.round ?? 1;
  const position = Math.min((seg.position ?? 0) + offset, perStation - 1);

  return plan.stations.map((station) => {
    const slots = byStation.get(station.stationIndex) ?? [];
    const current = slots[position] ?? slots[slots.length - 1] ?? null;
    const next = slots[position + 1] ?? null;
    return {
      stationIndex: station.stationIndex,
      label: station.label,
      exerciseName: current?.displayName ?? '—',
      modificationLine: current ? modificationLine(current) : null,
      equipmentLine: current?.equipmentRefs?.length
        ? current.equipmentRefs.map((r) => r.replace(/^eq_/, '').replace(/_/g, ' ')).join(' · ')
        : null,
      nextUpName: next?.displayName ?? null,
      emphasis: round >= 2 ? 'scheme' : 'name',
    };
  });
}

function findSlot(plan: Plan, slotId: string | null): Slot | null {
  if (!slotId) return null;
  for (const block of plan.blocks) {
    const hit = block.slots.find((s) => s.slotId === slotId);
    if (hit) return hit;
  }
  return null;
}
