/**
 * Client plan-library normalization and local vault derivation.
 * ============================================================
 *
 * Maps canonical saved-plan responses into safe staff-facing summaries. Server
 * catalog reconciliation lives in ClientWorkoutPlanCatalog.logic so this file
 * remains the single plan-field mapper and stays within the repository cap.
 */

import { mapSavedPlan } from '../../../Pages/admin-workout-planner/workoutPlannerSavedPlanMapping';
import { normalizeClientHomeworkSummary } from '../../../shared/client-training/clientHomeworkSummary';
import { normalizeClientPlanUse } from './ClientWorkoutPlanUse.logic';
import {
  normalizeCatalogHorizonKey,
  normalizeTrainingPlanCatalog,
} from './ClientWorkoutPlanCatalog.logic';
import { normalizeClientPlanPdfContract } from './ClientWorkoutPlanPdfState.logic';
import {
  PLAN_HORIZON_SLOTS,
  type ClientPlanSummary,
  type ClientPlanVaultSummary,
  type ClientTodayAssignmentSummary,
  type ClientWorkoutPlansResponseSummary,
  type HorizonKey,
} from './ClientWorkoutPlansPanel.types';

export type {
  ClientHomeworkSummary,
  ClientPlanHorizonSlot,
  ClientPlanPdfDerivativeItem,
  ClientPlanPdfDerivativeSummary,
  ClientPlanPdfFile,
  ClientPlanSummary,
  ClientPlanVaultSummary,
  ClientTodayAssignmentSummary,
  ClientWorkoutPlansResponseSummary,
  HorizonKey,
} from './ClientWorkoutPlansPanel.types';

const normalizeClientWorkoutPlan = (
  plan: Record<string, unknown>,
): ClientPlanSummary | null => {
  const rawId = plan.id;
  const id = typeof rawId === 'number' || typeof rawId === 'string' ? String(rawId) : '';
  const mapped = mapSavedPlan(plan);
  if (!id || !mapped.name.trim()) return null;

  const planData = plan.planData && typeof plan.planData === 'object'
    ? plan.planData as Record<string, unknown>
    : {};
  const planSummary = planData.planSummary && typeof planData.planSummary === 'object'
    ? planData.planSummary as Record<string, unknown>
    : {};
  const directHorizonKey = normalizeCatalogHorizonKey(plan.horizonKey);

  return {
    ...mapped,
    ...normalizeClientPlanUse(plan),
    horizonKey: directHorizonKey || (mapped.horizonKey || 'six_month') as HorizonKey,
    horizonLabel: directHorizonKey
      ? PLAN_HORIZON_SLOTS.find((slot) => slot.key === directHorizonKey)?.label
      : mapped.horizonLabel,
    isPrimary: plan.isPrimary === true || mapped.isPrimary,
    ...normalizeClientPlanPdfContract(plan, mapped.pdfFile || null),
    nasmPhase: typeof plan.nasmPhase === 'number' ? plan.nasmPhase : undefined,
    durationWeeks: typeof plan.durationWeeks === 'number'
      ? plan.durationWeeks
      : typeof planSummary.durationWeeks === 'number' ? planSummary.durationWeeks : undefined,
    createdAt: typeof plan.updatedAt === 'string' ? plan.updatedAt : mapped.createdAt,
    planningSystem: typeof planData.planningSystem === 'string' ? planData.planningSystem : null,
  };
};

const updatedTime = (plan: ClientPlanSummary) => {
  const parsed = plan.createdAt ? new Date(plan.createdAt).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

export const isClientPlanActiveStatus = (status: string) => (
  status.trim().toLowerCase() === 'active'
);
const isActivePlan = (plan: ClientPlanSummary) => isClientPlanActiveStatus(plan.status);
const isActivePrimaryPlan = (plan: ClientPlanSummary) => isActivePlan(plan) && plan.isPrimary;
const samePlan = (plan: ClientPlanSummary | null | undefined, id: string | null) => (
  Boolean(plan && id && plan.id === id)
);
const firstPlan = (plans: Array<ClientPlanSummary | null | undefined>) => (
  plans.find((plan): plan is ClientPlanSummary => Boolean(plan)) || null
);
const selectPrimaryPlan = (plans: ClientPlanSummary[]) => firstPlan([
  plans.find(isActivePrimaryPlan),
  plans.find(isActivePlan),
  plans.find((plan) => plan.isPrimary),
  plans.find((plan) => plan.horizonKey === 'six_month'),
  plans[0],
]);

const selectSlotPlan = (
  plans: ClientPlanSummary[],
  horizonKey: HorizonKey,
  primaryPlanId: string | null,
) => (
  plans
    .filter((plan) => plan.horizonKey === horizonKey)
    .sort((a, b) => {
      const primaryDiff = Number(samePlan(b, primaryPlanId)) - Number(samePlan(a, primaryPlanId));
      if (primaryDiff) return primaryDiff;
      const activeDiff = Number(isActivePlan(b)) - Number(isActivePlan(a));
      return activeDiff || updatedTime(b) - updatedTime(a);
    })[0]
  || null
);

export const buildClientPlanVault = (plans: ClientPlanSummary[]): ClientPlanVaultSummary => {
  const primaryPlan = selectPrimaryPlan(plans);
  const primaryPlanId = primaryPlan?.id || null;
  const slots = PLAN_HORIZON_SLOTS.map((horizon) => {
    const plan = selectSlotPlan(plans, horizon.key, primaryPlanId);
    const isPrimary = samePlan(plan, primaryPlanId);
    return {
      horizonKey: horizon.key,
      label: horizon.label,
      durationWeeks: horizon.durationWeeks,
      durationDays: horizon.durationDays,
      isDefaultHorizon: horizon.isDefault,
      isFilled: Boolean(plan),
      isPrimary,
      plan,
    };
  });

  return {
    filledCount: slots.filter((slot) => slot.isFilled).length,
    primaryPlanId,
    primaryHorizonKey: primaryPlan?.horizonKey || null,
    slots,
  };
};

const rawPlansFromResponse = (responseData: ClientWorkoutPlansResponseSummary) => (
  Array.isArray(responseData.plans)
    ? responseData.plans
    : responseData.plan && typeof responseData.plan === 'object' ? [responseData.plan] : []
);
const normalizeRawPlans = (rawPlans: unknown[]) => rawPlans
  .map((plan) => (
    plan && typeof plan === 'object'
      ? normalizeClientWorkoutPlan(plan as Record<string, unknown>)
      : null
  ))
  .filter((plan): plan is ClientPlanSummary => plan !== null);
const normalizeTodayAssignment = (value: unknown): ClientTodayAssignmentSummary | null => (
  value && typeof value === 'object' ? value as ClientTodayAssignmentSummary : null
);

export const normalizeClientWorkoutPlansResponse = (
  data?: ClientWorkoutPlansResponseSummary,
) => {
  const responseData = data ?? {};
  const serverPlanVault = normalizeTrainingPlanCatalog(
    responseData.trainingPlanCatalog,
    normalizeClientWorkoutPlan,
  );
  const canonicalPlans = serverPlanVault
    ? serverPlanVault.slots
        .map((slot) => slot.plan)
        .filter((plan): plan is ClientPlanSummary => plan !== null)
    : null;

  return {
    plans: canonicalPlans ?? normalizeRawPlans(rawPlansFromResponse(responseData)),
    serverPlanVault,
    homeworkSummary: normalizeClientHomeworkSummary(responseData.homeworkSummary),
    todayAssignment: normalizeTodayAssignment(responseData.todayAssignment),
  };
};

export const formatClientPlanUpdated = (value?: string) => {
  if (!value) return 'Updated date unavailable';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? 'Updated date unavailable'
    : `Updated ${parsed.toLocaleDateString()}`;
};
