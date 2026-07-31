/**
 * ============================================================================
 * FILE: shared/bootcamp-core/validateState.mjs
 * PURPOSE: Validation for the plan's STATE surfaces — the frozen constraint
 *          snapshot and the append-only event log. Split from validate.mjs
 *          at the 300-line cap (Rule 4).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-07-31 | SLICE: SWA-105 Slice 0 (Fable review pass)
 * ============================================================================
 */

import { isJoint } from './taxonomy.mjs';
import { ACTORS, MOMENTS } from './constants.mjs';

/** Fields whose presence on any event means someone is naming a person. */
const PERSON_FIELDS = ['attendeeId', 'personId', 'clientId', 'userId', 'memberId'];

export function validateSnapshot(snapshot) {
  const problems = [];
  if (typeof snapshot !== 'object' || snapshot === null) return ['snapshot is not an object'];
  if (!snapshot.frozenAt) problems.push('snapshot.frozenAt is required once a snapshot exists');

  const counts = snapshot.equipmentCounts;
  if (counts !== undefined && counts !== null) {
    if (typeof counts !== 'object') {
      problems.push('snapshot.equipmentCounts must be an object of {ref: count}');
    } else {
      for (const [ref, count] of Object.entries(counts)) {
        if (!Number.isInteger(count) || count < 1) {
          problems.push(
            `snapshot.equipmentCounts["${ref}"] must be a positive integer — `
            + 'presence without quantity cannot answer "is this station viable for this headcount"',
          );
        }
      }
    }
  }

  problems.push(...validateJointCounts(snapshot.jointFlagCounts, 'snapshot.jointFlagCounts'));
  problems.push(...validateJointCounts(snapshot.severeJointFlagCounts, 'snapshot.severeJointFlagCounts'));

  // The severe band is a SUBSET of the total: 2 severe knees among 1 flagged
  // knee is a data-entry error that would over-gate the whole class.
  const total = snapshot.jointFlagCounts ?? {};
  const severe = snapshot.severeJointFlagCounts ?? {};
  for (const [joint, count] of Object.entries(severe)) {
    const totalCount = total[joint] ?? 0;
    if (Number.isInteger(count) && Number.isInteger(totalCount) && count > totalCount) {
      problems.push(
        `snapshot.severeJointFlagCounts.${joint} (${count}) exceeds jointFlagCounts.${joint} `
        + `(${totalCount}) — the severe band is a subset of the total`,
      );
    }
  }

  return problems;
}

function validateJointCounts(map, path) {
  const problems = [];
  if (map === undefined || map === null) return problems;
  if (typeof map !== 'object') return [`${path} must be an object`];
  for (const [joint, count] of Object.entries(map)) {
    if (!isJoint(joint)) problems.push(`${path} has unknown joint "${joint}"`);
    if (!Number.isInteger(count) || count < 0) {
      problems.push(`${path}.${joint} must be a non-negative integer — counts only, never identities`);
    }
  }
  return problems;
}

export function validateLog(plan) {
  const problems = [];
  if (!Array.isArray(plan.log)) return ['log must be an array'];

  const knownStations = new Set(
    Array.isArray(plan.stations) ? plan.stations.map((s) => s?.stationIndex) : [],
  );
  const knownSlotIds = new Set();
  if (Array.isArray(plan.blocks)) {
    for (const block of plan.blocks) {
      for (const slot of block?.slots ?? []) {
        if (slot?.slotId) knownSlotIds.add(slot.slotId);
      }
    }
  }

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

    // slotId is what a swap TARGETS (the doctrine printed on the slot itself);
    // from/to exerciseRefs are history-facing. Without the slotId, "re-inject
    // the previous exercise at rank 1 with a `was here` chip" has no anchor.
    if (typeof event.slotId !== 'string' || !event.slotId.trim()) {
      problems.push(`${path}.slotId is required for a swap — slotId is what a swap targets`);
    } else if (knownSlotIds.size > 0 && !knownSlotIds.has(event.slotId)) {
      problems.push(`${path}.slotId "${event.slotId}" does not exist in any block`);
    }

    if (!MOMENTS.includes(event.moment)) {
      problems.push(`${path}.moment must be one of ${MOMENTS.join('|')}`);
    }
    // The invariant that makes the dignity rule structural rather than cultural.
    for (const field of PERSON_FIELDS) {
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
