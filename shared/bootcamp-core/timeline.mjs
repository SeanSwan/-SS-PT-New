/**
 * ============================================================================
 * FILE: shared/bootcamp-core/timeline.mjs
 * PURPOSE: Compile a time-relative ClassPlan into absolute-deadline segments.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-31 | SLICE: SWA-105 Slice 0
 * ============================================================================
 *
 * WHY ABSOLUTE DEADLINES (Opus 5 §0.7):
 * The obvious clock accumulates ticks — `remaining -= delta` each frame. Three
 * things break it, all of which happen in a real gym:
 *   - a backgrounded tab throttles `requestAnimationFrame` to ~1Hz or stops it,
 *     so accumulated time silently under-counts and the class ends late;
 *   - the laptop sleeps and every accumulated tick between sleep and wake is
 *     simply lost;
 *   - float drift compounds across a 45-minute class.
 *
 * Storing an absolute `endsAt` per segment makes throttling degrade RENDER RATE
 * ONLY, never correctness: however sparsely you sample the clock, `now` still
 * tells you the truth. Sleep becomes recoverable rather than corrupting —
 * `reconcile()` below reports the gap so the Runner can offer
 * "You lost 4:12 — resume here / skip ahead / extend class".
 *
 * This module is PURE. No timers, no `Date.now()`, no DOM. The caller supplies
 * `now`. That is what makes the whole class runnable in a unit test and what
 * lets the Runner checkpoint to IndexedDB and resume in place.
 */

import { PHASES } from './phases.mjs';

/**
 * Expand a ClassPlan into an ordered, time-relative segment list.
 * Durations only — no epoch anywhere, so the result is still template-safe.
 *
 * @param {object} plan
 * @returns {Array<{phase: string, blockIndex: number, round: number|null,
 *                  stationIndex: number|null, slotId: string|null,
 *                  label: string, durationSec: number}>}
 */
export function expandSegments(plan) {
  const segments = [];
  const structure = plan.structure ?? {};

  plan.blocks.forEach((block, blockIndex) => {
    if (block.kind === 'warmup' || block.kind === 'cooldown') {
      // Synchronized blocks: everyone does the same thing, so one segment per
      // slot. This is the S1/S6 hero screen — the ONE place a single huge
      // exercise is the correct layout.
      block.slots.forEach((slot) => {
        segments.push(segment({
          phase: block.kind === 'warmup' ? PHASES.WARMUP : PHASES.COOLDOWN,
          blockIndex,
          label: slot.displayName,
          slotId: slot.slotId,
          durationSec: slot.workSec ?? structure.workSec ?? 30,
        }));
        const rest = slot.restSec ?? 0;
        if (rest > 0) {
          segments.push(segment({
            phase: PHASES.REST, blockIndex, label: 'Rest', durationSec: rest,
          }));
        }
      });
      return;
    }

    if (block.kind !== 'work') return;

    if (structure.shape === 'full_group') {
      for (let round = 1; round <= structure.rounds; round += 1) {
        block.slots.forEach((slot) => {
          segments.push(segment({
            phase: PHASES.WORK,
            blockIndex,
            round,
            label: slot.displayName,
            slotId: slot.slotId,
            durationSec: slot.workSec ?? structure.workSec,
          }));
          const rest = slot.restSec ?? structure.restSec ?? 0;
          if (rest > 0) {
            segments.push(segment({ phase: PHASES.REST, blockIndex, round, label: 'Rest', durationSec: rest }));
          }
        });
        if (round < structure.rounds && structure.roundBreakSec > 0) {
          segments.push(segment({
            phase: PHASES.ROUND_BREAK, blockIndex, round, label: 'Round break', durationSec: structure.roundBreakSec,
          }));
        }
      }
      return;
    }

    // Station circuit.
    //
    // TWO things are easy to get wrong here, and both were:
    //
    // 1. A work segment is a slice of TIME, not one exercise. N stations are
    //    each doing a DIFFERENT exercise simultaneously (Opus 5 §0.1), so the
    //    segment binds to no slot — the Audience screen renders every station's
    //    current slot from `plan.stations`. Binding one slot is what produced
    //    the AMRAP-screen error.
    //
    // 2. A ROUND IS A FULL CIRCUIT OF EVERY STATION, not one station visit.
    //    Everyone rotates through all stations; the class ends when the circuit
    //    completes. So the work count is
    //        rounds x stationCount x exercisesPerStation
    //    and omitting the stationCount factor makes a 50-minute class compile to
    //    ~7 minutes. Main's own structure math agrees: it derives stationCount as
    //    targetDuration / time-per-station, i.e. the stations ARE the class.
    for (let round = 1; round <= structure.rounds; round += 1) {
      for (let visit = 0; visit < structure.stationCount; visit += 1) {
        for (let position = 0; position < structure.exercisesPerStation; position += 1) {
          segments.push(segment({
            phase: PHASES.WORK,
            blockIndex,
            round,
            visit,
            position,
            // "rotation", not "station": at any moment every GROUP is at a
            // DIFFERENT station — visit indexes the rotation step, and naming
            // it a station on the board would tell 14 people the wrong thing.
            label: `Round ${round} · rotation ${visit + 1} · exercise ${position + 1}`,
            durationSec: structure.workSec,
          }));
          const isLastInStation = position === structure.exercisesPerStation - 1;
          if (!isLastInStation && structure.restSec > 0) {
            segments.push(segment({
              phase: PHASES.REST, blockIndex, round, visit, position, label: 'Rest', durationSec: structure.restSec,
            }));
          }
        }

        // Rotate after every station visit except the very last of the class —
        // this is the S3 transition screen, the one place density is fine
        // because everyone is walking and looking at the TV.
        const isLastVisitOfClass = round === structure.rounds && visit === structure.stationCount - 1;
        if (!isLastVisitOfClass && structure.stationTransitionSec > 0) {
          segments.push(segment({
            phase: PHASES.STATION_TRANSITION,
            blockIndex,
            round,
            visit,
            label: 'Rotate',
            durationSec: structure.stationTransitionSec,
          }));
        }
      }

      if (round < structure.rounds && structure.roundBreakSec > 0) {
        segments.push(segment({
          phase: PHASES.ROUND_BREAK, blockIndex, round, label: 'Round break', durationSec: structure.roundBreakSec,
        }));
      }
    }
  });

  return segments;
}

function segment({ phase, blockIndex, round = null, visit = null, position = null, stationIndex = null, slotId = null, label, durationSec }) {
  return { phase, blockIndex, round, visit, position, stationIndex, slotId, label, durationSec };
}

/**
 * Compile to ABSOLUTE epoch deadlines.
 * @param {object} plan
 * @param {number} startedAtEpochMs
 * @returns {{startedAt: number, endsAt: number, totalSec: number, segments: Array}}
 */
export function compileTimeline(plan, startedAtEpochMs) {
  if (!Number.isFinite(startedAtEpochMs)) {
    throw new Error('compileTimeline: startedAtEpochMs must be a finite number');
  }
  const relative = expandSegments(plan);

  let cursor = startedAtEpochMs;
  const segments = relative.map((seg, index) => {
    const startsAt = cursor;
    const endsAt = startsAt + seg.durationSec * 1000;
    cursor = endsAt;
    return { ...seg, index, startsAt, endsAt };
  });

  return {
    startedAt: startedAtEpochMs,
    endsAt: cursor,
    totalSec: Math.round((cursor - startedAtEpochMs) / 1000),
    segments,
  };
}

/**
 * Where are we right now? Pure lookup against absolute deadlines — correct
 * regardless of how sparsely the caller has been sampling the clock.
 *
 * @returns {{status: 'pending'|'running'|'complete', segment: object|null,
 *            index: number, remainingSec: number, elapsedSec: number}}
 */
export function segmentAt(timeline, nowEpochMs) {
  if (nowEpochMs < timeline.startedAt) {
    return { status: 'pending', segment: null, index: -1, remainingSec: 0, elapsedSec: 0 };
  }
  if (nowEpochMs >= timeline.endsAt) {
    return {
      status: 'complete',
      segment: null,
      index: timeline.segments.length,
      remainingSec: 0,
      elapsedSec: timeline.totalSec,
    };
  }
  const index = timeline.segments.findIndex((s) => nowEpochMs < s.endsAt);
  const segment = timeline.segments[index];
  return {
    status: 'running',
    segment,
    index,
    remainingSec: Math.ceil((segment.endsAt - nowEpochMs) / 1000),
    elapsedSec: Math.floor((nowEpochMs - timeline.startedAt) / 1000),
  };
}

/**
 * Reconcile after a gap — laptop sleep, tab death, or a paused class.
 * Returns the choice set the Runner offers rather than deciding unilaterally:
 * silently skipping ahead ends the class at the wrong minute, and silently
 * resuming overruns the room's booking. Both are the trainer's call.
 *
 * THREE GENUINELY DISTINCT options (a hostile round found the original third,
 * "extend", was numerically identical to resumeHere — two buttons, one action):
 *   resumeHere — do ALL remaining content; the class ends `lostSec` later.
 *   skipAhead  — honour the original end time by DROPPING what was missed.
 *   compress   — do ALL remaining content AND end on time, by scaling the
 *                remaining segments down (the §5.4 running-behind move).
 *
 * @param {object} timeline
 * @param {number} expectedNowMs  where the clock believed it was
 * @param {number} actualNowMs    wall clock on wake
 */
export function reconcile(timeline, expectedNowMs, actualNowMs) {
  const lostMs = Math.max(0, actualNowMs - expectedNowMs);
  const lostSec = Math.round(lostMs / 1000);
  const remainingMs = Math.max(0, timeline.endsAt - expectedNowMs);
  const compressScale = remainingMs > lostMs ? (remainingMs - lostMs) / remainingMs : 0;

  return {
    lostSec,
    significant: lostSec >= 5,
    options: {
      resumeHere: { newStartedAt: timeline.startedAt + lostMs, endsAt: timeline.endsAt + lostMs },
      skipAhead: { newStartedAt: timeline.startedAt, endsAt: timeline.endsAt },
      /** scale <= 0 means the gap ate the rest of the class — offer only the other two. */
      compress: { scale: compressScale, feasible: compressScale >= 0.5 },
    },
  };
}

/**
 * Apply the compress option: rebuild every segment that ends after `fromMs`
 * with its duration scaled, so all remaining content fits before the original
 * `endsAt`. Segments already completed are untouched. Pure — returns a new
 * timeline. `feasible` above guards against comic outcomes (a 40s work slot
 * scaled to 6s); the Runner must not offer compress below 0.5.
 */
export function compressRemaining(timeline, fromMs, scale) {
  if (!(scale > 0 && scale <= 1)) {
    throw new Error(`compressRemaining: scale must be in (0, 1], got ${scale}`);
  }
  let cursor = null;
  const segments = timeline.segments.map((seg) => {
    if (seg.endsAt <= fromMs) return seg;
    const startsAt = cursor ?? Math.max(seg.startsAt, fromMs);
    const durationMs = (seg.endsAt - Math.max(seg.startsAt, fromMs)) * scale
      + Math.max(0, Math.min(seg.endsAt, fromMs) - seg.startsAt);
    const endsAt = startsAt + Math.round(durationMs);
    cursor = endsAt;
    return { ...seg, startsAt, endsAt, durationSec: Math.round((endsAt - startsAt) / 1000) };
  });
  const endsAt = segments[segments.length - 1]?.endsAt ?? timeline.endsAt;
  return {
    ...timeline,
    segments,
    endsAt,
    totalSec: Math.round((endsAt - timeline.startedAt) / 1000),
  };
}
