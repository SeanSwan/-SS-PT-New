/**
 * ============================================================================
 * FILE: shared/bootcamp-core/pacing.mjs
 * PURPOSE: Validation + timeline expansion for paced blocks (amrap/emom/tabata).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-08-03 | SLICE: SWA-105 Slice 3
 * ============================================================================
 *
 * Sean's ratified decision (2026-07-31): the shipped class styles must be
 * EXPRESSIBLE in the schema or V2 quietly drops live product functionality.
 * This module is deliberately small: pacing is a per-block timing law, nothing
 * more. Selection, stations and budgets are untouched by it.
 */

import { PACING_MODES } from './constants.mjs';
import { PHASES } from './phases.mjs';

export { PACING_MODES };

/** Is this block paced outside the plain interval law? */
export function isPacedBlock(block) {
  const mode = block?.pacing?.mode;
  return typeof mode === 'string' && mode !== 'interval' && PACING_MODES.includes(mode);
}

/** @returns {string[]} problems; [] = valid (or no pacing present). */
export function validatePacing(block, path) {
  const pacing = block?.pacing;
  if (pacing === undefined || pacing === null) return [];
  const problems = [];

  if (typeof pacing !== 'object') return [`${path}.pacing must be an object`];
  if (!PACING_MODES.includes(pacing.mode)) {
    return [`${path}.pacing.mode must be one of ${PACING_MODES.join('|')}`];
  }

  if (pacing.mode === 'amrap') {
    if (!(pacing.blockMin > 0)) {
      problems.push(`${path}.pacing amrap requires blockMin > 0 — the window IS the exercise`);
    }
  }
  if (pacing.mode === 'emom') {
    if (!(Number.isInteger(pacing.rounds) && pacing.rounds >= 1)) {
      problems.push(`${path}.pacing emom requires integer rounds >= 1 (total minutes)`);
    }
  }
  if (pacing.mode === 'tabata') {
    if (!(Number.isInteger(pacing.rounds) && pacing.rounds >= 1)) {
      problems.push(`${path}.pacing tabata requires integer rounds >= 1`);
    }
    if (pacing.workSec !== undefined && !(pacing.workSec > 0)) {
      problems.push(`${path}.pacing tabata workSec must be > 0 when set`);
    }
    if (pacing.restSec !== undefined && !(pacing.restSec >= 0)) {
      problems.push(`${path}.pacing tabata restSec must be >= 0 when set`);
    }
  }

  if (isPacedBlock(block) && Array.isArray(block.slots)) {
    if (block.slots.length === 0) {
      problems.push(`${path} is paced but has no slots — a timed window over nothing`);
    }
    block.slots.forEach((slot, j) => {
      if (slot?.stationIndex !== null && slot?.stationIndex !== undefined) {
        problems.push(
          `${path}.slots[${j}].stationIndex must be null in a paced block — `
          + 'amrap/emom/tabata are synchronized; everyone works together',
        );
      }
    });
  }
  return problems;
}

/**
 * Expand a paced work block into time-relative segments.
 * @param {object} block  a work block where isPacedBlock(block) is true
 * @param {number} blockIndex
 * @returns {Array} segments in the same shape timeline.mjs emits
 */
export function expandPacedBlock(block, blockIndex) {
  const { pacing, slots } = block;
  const segments = [];
  const seg = (extra) => ({
    phase: PHASES.WORK, blockIndex, round: null, visit: null, position: null,
    stationIndex: null, slotId: null, ...extra,
  });

  if (pacing.mode === 'amrap') {
    // One window. The Audience screen renders the slot MENU for the block;
    // binding a single slot here would recreate the AMRAP-screen error in
    // reverse (a menu pretending to be a sequence).
    segments.push(seg({
      label: `AMRAP ${pacing.blockMin} min`,
      durationSec: Math.round(pacing.blockMin * 60),
      pacingMode: 'amrap',
    }));
    return segments;
  }

  if (pacing.mode === 'emom') {
    for (let minute = 0; minute < pacing.rounds; minute += 1) {
      const slot = slots[minute % slots.length];
      segments.push(seg({
        label: `EMOM min ${minute + 1} — ${slot.displayName}`,
        durationSec: 60,
        slotId: slot.slotId,
        round: minute + 1,
        pacingMode: 'emom',
      }));
    }
    return segments;
  }

  // tabata
  const workSec = pacing.workSec ?? 20;
  const restSec = pacing.restSec ?? 10;
  for (let round = 0; round < pacing.rounds; round += 1) {
    const slot = slots[round % slots.length];
    segments.push(seg({
      label: `Tabata ${round + 1}/${pacing.rounds} — ${slot.displayName}`,
      durationSec: workSec,
      slotId: slot.slotId,
      round: round + 1,
      pacingMode: 'tabata',
    }));
    if (restSec > 0 && round < pacing.rounds - 1) {
      segments.push({ ...seg({ label: 'Rest', durationSec: restSec, round: round + 1, pacingMode: 'tabata' }), phase: PHASES.REST });
    }
  }
  return segments;
}
