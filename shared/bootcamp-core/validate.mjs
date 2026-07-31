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
 *
 * Five checks exist because a hostile round found them missing, each mapping to
 * a concrete 6am failure: stationCount vs stations[] (empty card, rotation to
 * nowhere) · zero-duration slots (a segment the clock can never be inside) ·
 * duplicate slotIds ("swap slot X" is ambiguous) · swap referencing an unknown
 * station · compiled time > target (the room booking is blown, silently).
 */

import { isJoint } from './taxonomy.mjs';
import {
  CLASS_PLAN_SCHEMA_VERSION, BLOCK_KINDS, WORK_SHAPES, CHIPS, RUNGS, ACTORS, MOMENTS,
} from './constants.mjs';
import { expandSegments } from './timeline.mjs';

const CHIP_SET = new Set(CHIPS);
const RUNG_SET = new Set(RUNGS);

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

function validateSlot(slot, path, structure) {
  const problems = [];
  if (!slot || typeof slot !== 'object') return [`${path} is not an object`];
  if (!slot.displayName) problems.push(`${path}.displayName is required`);

  // A zero-length segment has startsAt === endsAt, so the clock can never be
  // "inside" it — the Runner skips it while the board still shows the exercise.
  for (const field of ['workSec', 'restSec']) {
    const value = slot[field];
    if (value === null || value === undefined) continue;
    if (typeof value !== 'number' || Number.isNaN(value)) {
      problems.push(`${path}.${field} must be a number when present`);
    } else if (field === 'workSec' && value <= 0) {
      problems.push(`${path}.workSec must be > 0 — a zero-duration segment is unreachable by the clock`);
    } else if (field === 'restSec' && value < 0) {
      problems.push(`${path}.restSec must be >= 0`);
    }
  }
  if ((slot.workSec === null || slot.workSec === undefined) && !(structure?.workSec > 0)) {
    problems.push(`${path}.workSec is null and structure.workSec is not usable as a fallback`);
  }

  if (!Array.isArray(slot.chips)) {
    problems.push(`${path}.chips must be an array`);
  } else {
    if (slot.chips.length > 2) {
      problems.push(`${path}.chips has ${slot.chips.length} entries; max 2 (three chips is a paragraph at 6am)`);
    }
    const unknown = slot.chips.filter((c) => !CHIP_SET.has(c));
    if (unknown.length > 0) {
      problems.push(`${path}.chips contains non-enum value(s): ${unknown.join(', ')} — free-text reasons are forbidden`);
    }
  }

  if (!RUNG_SET.has(slot.rung)) problems.push(`${path}.rung must be one of ${RUNGS.join('|')}`);
  if (slot.rung === 'R6') {
    problems.push(`${path}.rung R6 means "no swap exists" and cannot be a committed slot`);
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

function validateSnapshot(snapshot) {
  const problems = [];
  if (typeof snapshot !== 'object') return ['snapshot is not an object'];
  if (!snapshot.frozenAt) problems.push('snapshot.frozenAt is required once a snapshot exists');

  const flags = snapshot.jointFlagCounts;
  if (flags && typeof flags === 'object') {
    for (const [joint, count] of Object.entries(flags)) {
      if (!isJoint(joint)) problems.push(`snapshot.jointFlagCounts has unknown joint "${joint}"`);
      if (!Number.isInteger(count) || count < 0) {
        problems.push(`snapshot.jointFlagCounts.${joint} must be a non-negative integer — counts only, never identities`);
      }
    }
  }
  return problems;
}

function validateLog(plan) {
  const problems = [];
  if (!Array.isArray(plan.log)) return ['log must be an array'];

  const knownStations = new Set(
    Array.isArray(plan.stations) ? plan.stations.map((s) => s?.stationIndex) : [],
  );

  plan.log.forEach((event, i) => {
    const path = `log[${i}]`;
    if (!event || typeof event !== 'object') {
      problems.push(`${path} is not an object`);
      return;
    }
    if (!ACTORS.includes(event.actor)) problems.push(`${path}.actor must be one of ${ACTORS.join('|')}`);
    if (!event.type) problems.push(`${path}.type is required`);
    if (!event.ts) problems.push(`${path}.ts is required`);

    if (event.type !== 'swap') return;

    if (!Number.isInteger(event.stationIndex)) {
      problems.push(`${path}.stationIndex is required for a swap — swaps are station-scoped`);
    } else if (knownStations.size > 0 && !knownStations.has(event.stationIndex)) {
      problems.push(`${path}.stationIndex ${event.stationIndex} does not exist in stations[]`);
    }
    if (!MOMENTS.includes(event.moment)) {
      problems.push(`${path}.moment must be one of ${MOMENTS.join('|')}`);
    }
    // The invariant that makes the dignity rule structural rather than cultural.
    for (const field of ['attendeeId', 'personId', 'clientId', 'userId', 'memberId']) {
      if (field in event) {
        problems.push(
          `${path} carries a person identifier ("${field}"). There is no per-person swap — `
          + 'a swap changes the board for everyone; the modification line handles the individual.',
        );
      }
    }
  });
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
