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

// Severity at which flagged Board-1 exercises are swapped, not just annotated.
const PAIN_SWAP_SEVERITY = 7;
// Minimum severity worth surfacing to a class board at all.
const PAIN_FLAG_SEVERITY = 5;

// Bootcamp-local region map (bridging to the shared Cortex ontology map is a
// Phase 2 consolidation item in the directive — §1.3).
const REGION_MUSCLE_MAP = {
  left_knee: ['quadriceps', 'hamstrings'], right_knee: ['quadriceps', 'hamstrings'],
  lower_back: ['erector_spinae', 'core', 'glutes'], upper_back: ['trapezius', 'rhomboids', 'lats'],
  left_shoulder: ['shoulders', 'chest'], right_shoulder: ['shoulders', 'chest'],
  left_hip: ['glutes', 'hip_flexors', 'adductors'], right_hip: ['glutes', 'hip_flexors', 'adductors'],
  left_ankle: ['calves', 'tibialis'], right_ankle: ['calves', 'tibialis'],
};

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
  const painAlerts = [];
  if (!trainerId) return painAlerts;

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
        explanations.push({
          type: 'pain_gate_roster_empty',
          message: 'Pain-aware gating found no ACTIVE client assignments for this trainer — the class was not checked against any participant\'s pain report. Review Board 1 manually if drop-ins or unassigned clients are attending.',
        });
        return painAlerts;
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
    if (activeEntries.length === 0) return painAlerts;

    const painRegions = [...new Set(activeEntries.map(e => e.bodyRegion))];
    for (const region of painRegions) {
      const relatedMuscles = REGION_MUSCLE_MAP[region] || [];
      if (relatedMuscles.length === 0) continue;
      const severity = Math.max(
        ...activeEntries.filter(e => e.bodyRegion === region).map(e => e.painLevel || 0),
      );

      const flagged = allExercises.filter(ex => {
        if (ex.board && ex.board !== 'main') return false;
        const exMuscles = ex.muscleTargets?.toLowerCase() || '';
        return relatedMuscles.some(m => exMuscles.includes(m));
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
            ex.painCaution = { region, severity };
            cautionExercises.push(ex.exerciseName);
            continue;
          }
          const alternative = deriveJointFriendlyAlternative(ex, region);
          if (alternative && alternative !== ex.exerciseName) {
            ex.painSwap = { from: ex.exerciseName, region, severity };
            ex.exerciseName = alternative;
            swappedExercises.push(alternative);
          } else {
            ex.painCaution = { region, severity };
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
      explanations.push({
        type: 'pain_alert',
        message: `Pain-aware gating (${aggregationScope}): ${painAlerts.length} region group(s) flagged; severe regions auto-routed to joint-friendly alternatives. Class-level aggregation only — per-participant safety was NOT computed.`,
      });
    }
  } catch (err) {
    // Fail-VISIBLE (§5.5a): the old silent catch hid a dead query in production.
    logger.warn('[BootcampGenerator] Pain-aware gating unavailable:', err?.message);
    explanations.push({
      type: 'pain_alert_unavailable',
      message: 'Pain data could not be checked for this class — review Board 1 manually against known client injuries.',
    });
  }

  return painAlerts;
}
