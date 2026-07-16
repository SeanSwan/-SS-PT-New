/**
 * backupPlanService.mjs — the AI backup plan variant (charter v3 P2)
 * ====================================================================
 * Sean's operating model: every client carries a SECOND, data-grounded plan
 * beside the trainer's primary — ready to swap in at any moment, never
 * auto-activated, always the trainer's choice.
 *
 * GROUNDING: generation reuses the DETERMINISTIC registry-based
 * workoutBuilderService.generatePlan pipeline (client baseline, readiness,
 * compensations, equipment → NASM-phase mesocycles). Real client data by
 * construction — never template filler — and zero LLM dependency (the
 * "Render AI key" concern applies to Coach Draft prose, not this path).
 *
 * MODEL: one backup per client, stored as a normal WorkoutPlan row with
 * status 'draft' + metadata.planRole 'ai_backup' (+ provenance). Zero schema
 * change — role/provenance ride the existing sanitized JSONB metadata.
 *
 * STALENESS (charter V3-B): regenerate-worthy when older than 21 days OR ≥3
 * completed sessions landed since generation. Surfaced, never auto-run.
 *
 * PROMOTION (the swap): transactional — current active plan(s) → 'paused'
 * (archived variant, nothing deleted), backup → 'active' + planRole 'primary'.
 */
import { Op } from 'sequelize';
import sequelize from '../database.mjs';
import { getWorkoutPlan, getWorkoutSession } from '../models/index.mjs';
import {
  createWorkoutPlanRecord,
  mutateWorkoutPlanRecord,
  WorkoutPlanMutationError,
} from './workoutPlanMutationService.mjs';
import { transitionWorkoutPlanLifecycle } from './workoutPlanLifecycleService.mjs';
import { generatePlan } from './workoutBuilderService.mjs';
import {
  sanitizeWorkoutPlanDataForPersistence,
  sanitizeWorkoutPlanMetadataForPersistence,
} from './workoutPlanDataPrivacyService.mjs';
import logger from '../utils/logger.mjs';

export const BACKUP_STALE_DAYS = 21;
export const BACKUP_STALE_SESSIONS = 3;

/** PURE: is the backup regenerate-worthy? Missing provenance = stale. */
export function isBackupStale({ generatedAt, sessionsSince = 0 }, now = new Date()) {
  if (!generatedAt) return true;
  const ageMs = now.getTime() - new Date(generatedAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs > BACKUP_STALE_DAYS * 86_400_000) return true;
  return Number(sessionsSince) >= BACKUP_STALE_SESSIONS;
}

/**
 * PURE: structural planData subset from a generatePlan result — mirrors the
 * frontend planDataBuilder's generated-mode payload. Identity fields
 * (clientName etc.) are deliberately excluded; the privacy sanitizer runs on
 * top as defense-in-depth.
 */
export function buildBackupPlanData(generated) {
  const structural = {
    weeks: generated?.weeks ?? [],
    mesocycles: generated?.mesocycles ?? [],
    weeklySchedule: generated?.weeklySchedule ?? [],
    rationale: generated?.rationale ?? [],
    planSummary: generated?.planSummary ?? {},
    recommendations: generated?.recommendations ?? [],
    swanCoachReadiness: generated?.swanCoachReadiness ?? null,
    category: 'full_body',
  };
  return sanitizeWorkoutPlanDataForPersistence(structural);
}

const backupWhere = (userId) => ({
  userId,
  metadata: { [Op.contains]: { planRole: 'ai_backup' } },
});

/** Completed sessions since a timestamp (staleness signal). */
async function countSessionsSince(userId, sinceIso) {
  if (!sinceIso) return 0;
  const WorkoutSession = getWorkoutSession();
  if (!WorkoutSession?.count) return 0;
  return WorkoutSession.count({
    where: { userId, status: 'completed', date: { [Op.gte]: sinceIso.slice(0, 10) } },
  });
}

/** The client's backup plan + staleness verdict (null-honest when none). */
export async function getBackupPlan(userId) {
  const WorkoutPlan = getWorkoutPlan();
  const backup = await WorkoutPlan.findOne({
    where: backupWhere(userId),
    order: [['updatedAt', 'DESC']],
  });
  if (!backup) return { hasBackup: false, backup: null, stale: true, sessionsSince: 0 };
  const generatedAt = backup.metadata?.generatedAt ?? null;
  const sessionsSince = await countSessionsSince(userId, generatedAt);
  return {
    hasBackup: true,
    backup,
    generatedAt,
    sessionsSince,
    stale: isBackupStale({ generatedAt, sessionsSince }),
  };
}

/**
 * Generate (or refresh in place — ONE backup per client) the client's backup
 * through the deterministic pipeline. Never touches the primary.
 */
export async function generateBackupPlan({
  userId,
  trainerId,
  durationWeeks = 4,
  sessionsPerWeek = 3,
  primaryGoal = 'general_fitness',
  equipmentProfileId = null,
  planningReviewAcknowledged = false,
  planningReviewReason = null,
  planningReviewActorRole = null,
}) {
  // Cortex P0 caller sweep: generatePlan now BLOCKS behind the deterministic
  // safety gate (409 acknowledged-review contract). Forward the trainer's
  // acknowledgement and let SwanCoachPlanningReviewError propagate — the
  // route maps it to the same 409/400 shape the builder routes use.
  const generated = await generatePlan({
    clientId: userId,
    trainerId,
    durationWeeks,
    sessionsPerWeek,
    primaryGoal,
    equipmentProfileId,
    planningReviewAcknowledged: planningReviewAcknowledged === true,
    planningReviewReason,
    planningReviewActorRole,
  });

  const planData = buildBackupPlanData(generated);
  const metadata = sanitizeWorkoutPlanMetadataForPersistence({
    planRole: 'ai_backup',
    generatedAt: new Date().toISOString(),
    generator: 'swan_coach_planning',
    generatedBy: trainerId,
    sourceGoal: primaryGoal,
  });

  const WorkoutPlan = getWorkoutPlan();
  const existing = await WorkoutPlan.findOne({ where: backupWhere(userId) });
  if (existing) {
    const { plan: refreshed } = await mutateWorkoutPlanRecord({
      sequelize,
      WorkoutPlan,
      planId: existing.id,
      expectedRevision: existing.contentRevision,
      // Re-verify the role on the LOCKED row: a concurrent promotion flips this
      // row to active/'primary' without bumping contentRevision (status/metadata
      // writes are hash-invisible), so the revision gate alone cannot stop a
      // refresh from demoting a just-promoted active plan back to draft.
      updates: (lockedPlan) => {
        if (lockedPlan.metadata?.planRole !== 'ai_backup' || lockedPlan.status === 'active') {
          throw new WorkoutPlanMutationError(
            'Backup was promoted while refreshing — refresh aborted',
            {
              code: 'WORKOUT_PLAN_BACKUP_PROMOTED_CONFLICT',
              statusCode: 409,
            },
          );
        }
        return {
          title: `Backup Plan — ${new Date().toISOString().slice(0, 10)}`,
          durationWeeks,
          planData,
          metadata,
          status: 'draft',
          currentWeek: 1,
          currentDay: 1,
          createdBy: 'ai',
        };
      },
    });
    logger.info('[BackupPlan] refreshed backup #%d for client %d', refreshed.id, userId);
    return { backup: refreshed, refreshed: true };
  }

  const backup = await createWorkoutPlanRecord({
    sequelize,
    WorkoutPlan,
    values: {
      userId,
      trainerId,
      title: `Backup Plan — ${new Date().toISOString().slice(0, 10)}`,
      description: 'Data-grounded backup program generated from real training history. Trainer-activated only.',
      durationWeeks,
      status: 'draft',
      currentWeek: 1,
      currentDay: 1,
      planData,
      createdBy: 'ai',
      metadata,
    },
  });
  logger.info('[BackupPlan] created backup #%d for client %d', backup.id, userId);
  return { backup, refreshed: false };
}

/** Builds role provenance without the retired metadata primary markers. */
const buildPromotionMetadata = (plan, trainerId) => {
  const metadata = sanitizeWorkoutPlanMetadataForPersistence({
    ...(plan.metadata ?? {}),
    planRole: 'promoted_backup',
    promotedFrom: 'ai_backup',
    promotedAt: new Date().toISOString(),
    promotedBy: trainerId,
  });
  delete metadata.isPrimaryPlan;
  delete metadata.primary;
  return metadata;
};

const validateBackupTarget = (plan) => {
  if (plan.metadata?.planRole !== 'ai_backup') {
    throw new WorkoutPlanMutationError(
      'Not an AI backup plan - only a backup can be promoted',
      { code: 'WORKOUT_PLAN_NOT_BACKUP', statusCode: 400 },
    );
  }
};

/** Promotes one trainer-chosen backup through the audited activation boundary. */
export async function promoteBackupPlan({ planId, trainerId }) {
  const WorkoutPlan = getWorkoutPlan();
  const result = await transitionWorkoutPlanLifecycle({
    sequelize,
    WorkoutPlan,
    planId,
    action: 'activate',
    actorId: trainerId,
    derivativeReason: 'backup_promotion',
    validateTarget: validateBackupTarget,
    targetUpdates: (plan) => ({
      currentWeek: 1,
      currentDay: 1,
      metadata: buildPromotionMetadata(plan, trainerId),
    }),
  });
  const archived = result.lifecycleReceipts
    .filter((receipt) => receipt.action === 'activate_sibling_pause')
    .map((receipt) => receipt.planId);
  logger.info(
    '[BackupPlan] promoted #%s for client %s (paused %d prior active plans)',
    result.plan.id,
    result.plan.userId,
    archived.length,
  );
  return { promoted: result.plan, archived };
}