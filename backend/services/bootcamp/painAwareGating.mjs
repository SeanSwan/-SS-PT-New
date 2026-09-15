/**
 * ============================================================================
 * FILE: painAwareGating.mjs
 * PURPOSE: Pain-aware exercise gating for bootcamp class generation
 * AUTHOR: Claude Fable 5 | CREATED: 2026-07-12 (Cortex P0 §5.5)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Aggregates active pain across the trainer's active-client
 * roster and GATES the generated class: severe-pain regions auto-route flagged
 * Board-1 exercises to joint-friendly alternatives in place; moderate regions
 * get Board 2/3 recommendations. Class-level aggregation only — never exposes
 * which participant reported pain (no names, no per-participant flags).
 *
 * WHY THIS FILE EXISTS: The previous inline version in bootcampGenerator
 * filtered ClientPainEntry on a `status` column that does not exist (the model
 * has `isActive`) — Rule 58 drift class — so the query threw on every call, a
 * silent catch swallowed it, and painAlerts was permanently empty in
 * production. It also queried `createdById: trainerId` (entries the trainer
 * AUTHORED), which is not the trainer's client roster. Verified in the
 * 2026-07-12 Cortex directive audit + triangle review.
 *
 * HOW IT FITS: bootcampGenerator Step 9b → applyPainAwareGating (after boards,
 * before class style). Unit-tested in tests/unit/bootcampPainGating.test.mjs.
 */

import { Op } from 'sequelize';
import { getClientPainEntry, getModel } from '../../models/index.mjs';
import logger from '../../utils/logger.mjs';
import { deriveJointFriendlyAlternative } from './classStyleModifiers.mjs';
import { unverifiedReplacement } from './bootcampSubstitutionContract.mjs';
import { canonicalizeMuscle, normalizeMuscleList } from './bootcampTaxonomy.mjs';
import {
  bootcampTargetsForRegion,
  registryMusclesForRegion,
} from '../training-cortex/ontology/regionMuscleMap.mjs';

// Severity at which flagged Board-1 exercises are swapped, not just annotated.
const PAIN_SWAP_SEVERITY = 7;
// Minimum severity worth surfacing to a class board at all.
const PAIN_FLAG_SEVERITY = 5;

// Cortex Phase 2C: the bootcamp region->target mapping moved to THE single
// home (training-cortex/ontology/regionMuscleMap.mjs); vocabulary difference
// vs the registry map is explicit there.

async function loadRosterClientIds(trainerId) {
  const ClientTrainerAssignment = getModel('ClientTrainerAssignment');
  if (!ClientTrainerAssignment) return null;
  const assignments = await ClientTrainerAssignment.findAll({
    where: { trainerId, status: 'active' },
    attributes: ['clientId'],
  });
  return assignments.map(a => a.clientId);
}

/**
 * Apply pain-aware gating to a generated class.
 * Mutates flagged Board-1 exercise objects in place (painSwap / painCaution)
 * and appends explanations. Returns the painAlerts array.
 */
export async function applyPainAwareGating({ trainerId, allExercises, explanations }) {
  // U5 (purity ruling): gates CLONES, collects its own explanations, and
  // returns { painAlerts, explanations, exercises } — inputs untouched.
  const localExplanations = [];
  const painAlerts = [];
  const workingSet = (Array.isArray(allExercises) ? allExercises : []).map(ex => ({ ...ex }));

  if (!trainerId) {
    return { painAlerts, explanations: localExplanations, exercises: workingSet };
  }

  try {
    const PainEntry = getClientPainEntry();

    // Roster semantics (§5.5b): aggregate across the trainer's ACTIVE CLIENTS.
    // Fall back to trainer-authored entries — honestly labeled — only when the
    // assignment model is unavailable.
    const rosterClientIds = await loadRosterClientIds(trainerId);
    const painWhere = { isActive: true, painLevel: { [Op.gte]: PAIN_FLAG_SEVERITY } };
    let aggregationScope;
    if (Array.isArray(rosterClientIds)) {
      if (rosterClientIds.length === 0) {
        // Fail-VISIBLE: an empty active roster means drop-ins, pending
        // assignments, and other trainers' clients are invisible to this
        // gate — the trainer must know the check ran against nobody, not
        // read the absence of annotations as "no pain in the room".
        localExplanations.push({
          type: 'pain_gate_roster_empty',
          message: 'Pain-aware gating found no ACTIVE client assignments for this trainer — the class was not checked against any participant\'s pain report. Review Board 1 manually if drop-ins or unassigned clients are attending.',
        });
        return { painAlerts, explanations: localExplanations, exercises: workingSet };
      }
      painWhere.userId = { [Op.in]: rosterClientIds };
      aggregationScope = `across ${rosterClientIds.length} active client(s)`;
    } else {
      painWhere.createdById = trainerId;
      aggregationScope = 'across trainer-authored pain entries (client roster unavailable)';
    }

    const activeEntries = await PainEntry.findAll({
      where: painWhere,
      attributes: ['bodyRegion', 'side', 'painLevel', 'painType', 'userId'],
    });
    if (activeEntries.length === 0) return { painAlerts, explanations: localExplanations, exercises: workingSet };

    const painRegions = [...new Set(activeEntries.map(e => e.bodyRegion))];
    for (const region of painRegions) {
      // Keep the bootcamp target map in the call path for legacy
      // `muscleTargets` prose, but compare canonical registry tags as well.
      // A class record can contain primary and secondary muscles in either
      // representation; substring-only matching missed aliases such as
      // pectorals/pectoralis and could let a secondary pain target through.
      const relatedMuscles = [...new Set([
        ...registryMusclesForRegion(region),
        ...bootcampTargetsForRegion(region),
      ])];
      const severity = Math.max(
        ...activeEntries.filter(e => e.bodyRegion === region).map(e => e.painLevel || 0),
      );
      if (relatedMuscles.length === 0) {
        // Fail-VISIBLE (hostile-review HIGH-2, 2026-07-13): the intake
        // vocabulary is more granular than the bootcamp map (left_achilles,
        // left_hip_flexor, upper_traps_* ...) — an unmapped region used to
        // `continue` silently, so severe pain there gated NOTHING with no
        // note. Full vocabulary reconciliation is the Cortex Phase 2E+ arc;
        // until then the gate says plainly that it could not map the region.
        painAlerts.push({
          region,
          severity,
          unmappedRegion: true,
          flaggedExercises: [],
          swappedExercises: [],
          cautionExercises: [],
          recommendation: `${region.replace(/_/g, ' ')} pain (severity ${severity}) reported ${aggregationScope}, but this region is not yet mapped to bootcamp exercise targets — review Board 1 manually for movements loading this area.`,
        });
        continue;
      }

      const flagged = workingSet.filter(ex => {
        if (ex.board && ex.board !== 'main') return false;
        const rawMuscles = ex.muscleTargets ?? ex.muscles ?? '';
        const exMuscles = normalizeMuscleList(rawMuscles);
        const exMuscleText = String(rawMuscles).toLowerCase();
        return relatedMuscles.some((muscle) => {
          const canonical = canonicalizeMuscle(muscle);
          return (canonical && exMuscles.includes(canonical)) || exMuscleText.includes(String(muscle).toLowerCase());
        });
      });
      if (flagged.length === 0) continue;

      const swappedExercises = [];
      const cautionExercises = [];
      if (severity >= PAIN_SWAP_SEVERITY) {
        // §5.5c: gate, don't decorate. Severe regions auto-route Board-1
        // exercises to a joint-friendly alternative in place (station
        // structure and timing preserved); no alternative → loud CAUTION mark.
        for (const ex of flagged) {
          // Already routed for an earlier region: the muscleTargets that
          // matched here belong to the ORIGINAL exercise, so a re-derived
          // swap would overwrite painSwap.from with the first alternative's
          // name (audit-trail corruption). Keep the original swap and add a
          // loud caution for this region instead.
          if (ex.painSwap) {
            // Keep the FIRST region's caution if one exists (no last-writer-
            // wins overwrite); the alert list still names this exercise.
            if (!ex.painCaution) ex.painCaution = { region, severity };
            cautionExercises.push(ex.exerciseName);
            continue;
          }
          const alternative = deriveJointFriendlyAlternative(ex, region);
          if (alternative && alternative !== ex.exerciseName) {
            const originalName = ex.exerciseName;
            Object.assign(ex, unverifiedReplacement(ex, alternative));
            ex.painSwap = { from: originalName, region, severity };
            ex.painCaution = { region, severity, reason: 'replacement_unverified' };
            swappedExercises.push(alternative);
          } else {
            if (!ex.painCaution) ex.painCaution = { region, severity };
            cautionExercises.push(ex.exerciseName);
          }
        }
      }

      painAlerts.push({
        region,
        severity,
        flaggedExercises: flagged.map(e => e.painSwap?.from || e.exerciseName),
        swappedExercises,
        cautionExercises,
        recommendation: severity >= PAIN_SWAP_SEVERITY
          ? `Severe ${region.replace(/_/g, ' ')} pain reported ${aggregationScope}: flagged Board 1 exercises were auto-routed to joint-friendly alternatives${cautionExercises.length > 0 ? `; ${cautionExercises.length} had no alternative and are marked CAUTION` : ''}.`
          : `Participants with ${region.replace(/_/g, ' ')} issues should use Board 2 joint-friendly alternatives or Board 3 low-impact swaps for these exercises.`,
      });
    }

    if (painAlerts.length > 0) {
      localExplanations.push({
        type: 'pain_alert',
        message: `Pain-aware gating (${aggregationScope}): ${painAlerts.length} region group(s) flagged; severe regions auto-routed to joint-friendly alternatives. Class-level aggregation only — per-participant safety was NOT computed.`,
      });
    }
    return { painAlerts, explanations: localExplanations, exercises: workingSet };
  } catch (err) {
    // Fail-VISIBLE (§5.5a): the old silent catch hid a dead query in production.
    logger.warn('[BootcampGenerator] Pain-aware gating unavailable:', err?.message);
    localExplanations.push({
      type: 'pain_alert_unavailable',
      message: 'Pain data could not be checked for this class — review Board 1 manually against known client injuries.',
    });
  }

  return { painAlerts, explanations: localExplanations, exercises: workingSet };
}

/**
 * H07-B (Sean-approved 2026-09-13): the severe-pain 422 is a BACKSTOP, not a
 * roster-wide block. Severe regions with flagged exercises are gated first
 * (auto-routed to joint-friendly alternatives); review is required only when
 * gating could not make the class safe — an UNMAPPED severe region, or a
 * flagged exercise left as CAUTION because no alternative existed. A region
 * whose every flagged exercise was swapped no longer blocks the class: the
 * swap trail (painSwap/painCaution + the pain_alert explanations) stays on
 * the generated record.
 */
export function severePainReviewRequired(painAlerts) {
  if (!Array.isArray(painAlerts)) return false;
  return painAlerts.some(alert => {
    if ((alert?.severity ?? 0) < 7) return false;
    if (alert.unmappedRegion) return true;
    return Array.isArray(alert.cautionExercises) && alert.cautionExercises.length > 0;
  });
}

/**
 * U1: project the swap facts onto the generated class so the trainer-facing
 * surfaces (demo board, runner) can SAY 'this movement replaced X because of
 * your knee' without parsing the explanation prose.
 */
export function collectPainSwaps(exercises) {
  if (!Array.isArray(exercises)) return [];
  return exercises
    .filter(ex => ex?.painSwap?.from)
    .map(ex => ({
      from: ex.painSwap.from,
      to: ex.exerciseName,
      region: ex.painSwap.region,
      severity: ex.painSwap.severity ?? null,
    }));
}
