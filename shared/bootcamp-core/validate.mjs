/**
 * ============================================================================
 * FILE: shared/bootcamp-core/validate.mjs
 * PURPOSE: Structural validation for ClassPlan. Extracted from classPlan.mjs
 *          when that file crossed the 300-line cap (Rule 4).
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-31 | SLICE: SWA-105 Slice 0
 * ============================================================================
 *
 * SCOPE: structure only. Never judges whether a class is GOOD — that is the
 * judgment regression suite (Kimi R5). It answers one question: could a Runner,
 * a PDF and a log-back all consume this document without guessing?
 * Snapshot + log validation live in validateState.mjs (Rule 4 split).
 */

import { CLASS_PLAN_SCHEMA_VERSION, BLOCK_KINDS, WORK_SHAPES } from './constants.mjs';
import { expandSegments } from './timeline.mjs';
import { validateSnapshot, validateLog } from './validateState.mjs';
import { validateSlot } from './validateSlots.mjs';


export function validateClassPlan(plan) {
  const problems = [];
  if (!plan || typeof plan !== 'object') return ['plan is not an object'];

  if (plan.schemaVersion !== CLASS_PLAN_SCHEMA_VERSION) {
    problems.push(`schemaVersion must be ${CLASS_PLAN_SCHEMA_VERSION}, got ${plan.schemaVersion}`);
  }

  problems.push(...validateIntent(plan.intent));
  problems.push(...validateStructure(plan.structure));
  problems.push(...validateBlocks(plan));
  problems.push(...validateStations(plan));
  problems.push(...validateStationBinding(plan));
  if (plan.snapshot) problems.push(...validateSnapshot(plan.snapshot));
  problems.push(...validateLog(plan));
  problems.push(...validateProvenance(plan.provenance));
  problems.push(...validateFit(plan, problems));

  return problems;
}

function validateIntent(intent) {
  const problems = [];
  if (!intent || typeof intent !== 'object') return ['intent is required'];

  if (!intent.dayTypeId) problems.push('intent.dayTypeId is required');
  if (!(intent.targetDurationMin > 0)) problems.push('intent.targetDurationMin must be > 0');

  if (intent.headcount !== null && intent.headcount !== undefined) {
    if (!Number.isInteger(intent.headcount) || intent.headcount <= 0) {
      problems.push('intent.headcount must be null or a positive integer');
    }
  }

  if (intent.mode !== 'strict' && intent.mode !== 'open_gym') {
    problems.push(`intent.mode must be 'strict' or 'open_gym', got ${intent.mode}`);
  }
  if (intent.mode === 'strict' && !intent.equipmentProfileId) {
    problems.push("intent.mode 'strict' requires an equipmentProfileId");
  }
  return problems;
}

function validateStructure(structure) {
  const problems = [];
  if (!structure || typeof structure !== 'object') return ['structure is required'];

  if (!WORK_SHAPES.includes(structure.shape)) {
    problems.push(`structure.shape must be one of ${WORK_SHAPES.join('|')}`);
  }
  if (!(structure.rounds >= 1)) problems.push('structure.rounds must be >= 1');
  if (!(structure.workSec > 0)) problems.push('structure.workSec must be > 0');
  if (!(structure.restSec >= 0)) problems.push('structure.restSec must be >= 0');

  if (structure.shape === 'stations') {
    if (!(structure.stationCount >= 1)) {
      problems.push("structure.shape 'stations' requires stationCount >= 1");
    }
    if (!(structure.exercisesPerStation >= 1)) {
      problems.push("structure.shape 'stations' requires exercisesPerStation >= 1");
    }
  }
  return problems;
}

function validateBlocks(plan) {
  const problems = [];
  if (!Array.isArray(plan.blocks)) return ['blocks must be an array'];

  const seenSlotIds = new Map();

  plan.blocks.forEach((block, i) => {
    if (!BLOCK_KINDS.includes(block?.kind)) {
      problems.push(`blocks[${i}].kind must be one of ${BLOCK_KINDS.join('|')}`);
    }
    if (!Array.isArray(block?.slots)) {
      problems.push(`blocks[${i}].slots must be an array`);
      return;
    }
    block.slots.forEach((slot, j) => {
      const path = `blocks[${i}].slots[${j}]`;
      problems.push(...validateSlot(slot, path, plan.structure));
      if (slot?.slotId) {
        if (seenSlotIds.has(slot.slotId)) {
          problems.push(
            `${path}.slotId "${slot.slotId}" duplicates ${seenSlotIds.get(slot.slotId)} — `
            + 'slotId keys media, swap targets and the log; duplicates make a swap ambiguous',
          );
        } else {
          seenSlotIds.set(slot.slotId, path);
        }
      }
    });
  });

  if (!plan.blocks.some((b) => b?.kind === 'work')) {
    problems.push('a plan must contain at least one work block');
  }
  return problems;
}


function validateStations(plan) {
  const problems = [];
  const structure = plan.structure ?? {};
  if (!Array.isArray(plan.stations)) return ['stations must be an array'];

  if (structure.shape === 'stations') {
    if (plan.stations.length !== structure.stationCount) {
      problems.push(
        `structure.stationCount is ${structure.stationCount} but stations[] has ${plan.stations.length} `
        + '— the TV would render an empty card and rotate people to a station that does not exist',
      );
    }
    const seen = new Set();
    plan.stations.forEach((station, i) => {
      if (!Number.isInteger(station?.stationIndex)) {
        problems.push(`stations[${i}].stationIndex must be an integer`);
        return;
      }
      if (seen.has(station.stationIndex)) {
        problems.push(`stations[${i}] duplicates stationIndex ${station.stationIndex}`);
      }
      seen.add(station.stationIndex);
    });
  } else if (plan.stations.length > 0) {
    problems.push(`structure.shape '${structure.shape}' must not declare stations[]`);
  }
  return problems;
}

/**
 * The slot->station binding. Without this the schema could not express its own
 * primary product surface — the Audience screen cannot know what station 2 is
 * doing and the SwapDeck has nothing to target. Found by a Fable hostile round
 * AFTER the suite was green: fixtures declared 4x3=12 slots, carried 6, and
 * nothing objected.
 */
function validateStationBinding(plan) {
  const problems = [];
  const structure = plan.structure ?? {};
  if (!Array.isArray(plan.blocks)) return problems;

  const isStations = structure.shape === 'stations';
  const perStation = new Map();
  let workSlotCount = 0;

  plan.blocks.forEach((block, i) => {
    (block?.slots ?? []).forEach((slot, j) => {
      if (!slot || typeof slot !== 'object') return;
      const path = `blocks[${i}].slots[${j}]`;

      if (block.kind !== 'work' || !isStations) {
        // Warmup, cooldown and full_group are synchronized surfaces — a
        // station binding there is a category error.
        if (slot.stationIndex !== null && slot.stationIndex !== undefined) {
          problems.push(`${path}.stationIndex must be null outside station-shaped work blocks`);
        }
        return;
      }

      workSlotCount += 1;
      const idx = slot.stationIndex;
      if (!Number.isInteger(idx) || idx < 0 || idx >= structure.stationCount) {
        problems.push(
          `${path}.stationIndex must be an integer in [0, ${structure.stationCount}) — `
          + 'a work slot that does not know its station cannot be rendered or swapped',
        );
        return;
      }
      perStation.set(idx, (perStation.get(idx) ?? 0) + 1);
    });
  });

  if (!isStations) return problems;

  const expectedTotal = structure.stationCount * structure.exercisesPerStation;
  if (workSlotCount !== expectedTotal) {
    problems.push(
      `stations shape declares ${structure.stationCount} stations x ${structure.exercisesPerStation} `
      + `exercises = ${expectedTotal} work slots, but the plan carries ${workSlotCount}`,
    );
    return problems; // per-station counts are noise once the total is wrong
  }
  for (let s = 0; s < structure.stationCount; s += 1) {
    const count = perStation.get(s) ?? 0;
    if (count !== structure.exercisesPerStation) {
      problems.push(
        `station ${s} has ${count} work slot(s); every station needs exactly `
        + `${structure.exercisesPerStation} — an uneven station stalls its group`,
      );
    }
  }
  return problems;
}

function validateProvenance(provenance) {
  if (!provenance || typeof provenance !== 'object') return ['provenance is required'];
  if (!['deterministic', 'brain'].includes(provenance.generator)) {
    return ["provenance.generator must be 'deterministic' or 'brain'"];
  }
  if (provenance.generator === 'brain' && !provenance.brainModel) {
    return ["provenance.generator 'brain' requires brainModel — an unattributed AI class is unauditable"];
  }
  return [];
}

/**
 * Does the compiled class fit the time the room is booked for? Skipped when the
 * plan is already broken — expandSegments would be reasoning about garbage.
 */
function validateFit(plan, priorProblems) {
  if (priorProblems.length > 0) return [];
  const target = plan.intent?.targetDurationMin;
  if (!(target > 0)) return [];

  let totalSec;
  try {
    totalSec = expandSegments(plan).reduce((sum, s) => sum + s.durationSec, 0);
  } catch {
    return [];
  }

  if (totalSec <= target * 60) return [];
  const overBy = Math.round((totalSec - target * 60) / 60);
  return [
    `compiled duration ${Math.round(totalSec / 60)}min exceeds intent.targetDurationMin `
    + `${target}min by ~${overBy}min — the class would overrun its booking`,
  ];
}

export function assertValidClassPlan(plan) {
  const problems = validateClassPlan(plan);
  if (problems.length > 0) {
    throw new Error(`Invalid ClassPlan:\n  - ${problems.join('\n  - ')}`);
  }
  return plan;
}
