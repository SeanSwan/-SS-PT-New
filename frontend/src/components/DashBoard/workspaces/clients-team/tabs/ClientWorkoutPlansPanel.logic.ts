import { mapSavedPlan } from '../../../Pages/admin-workout-planner/workoutPlannerSavedPlanMapping';
import { normalizeClientHomeworkSummary } from '../../../shared/client-training/clientHomeworkSummary';
import { normalizeClientPlanUse } from './ClientWorkoutPlanUse.logic';

export type { ClientHomeworkSummary } from '../../../shared/client-training/clientHomeworkSummary';

type HorizonKey = 'one_day' | 'one_week' | 'one_month' | 'three_month' | 'six_month' | 'nine_month' | 'twelve_month';
const PLAN_HORIZON_SLOTS: Array<{
  key: HorizonKey;
  label: string;
  durationWeeks: number;
  durationDays: number;
  isDefault: boolean;
}> = [
  { key: 'one_day', label: '1 Day', durationWeeks: 1, durationDays: 1, isDefault: false },
  { key: 'one_week', label: '1 Week', durationWeeks: 1, durationDays: 7, isDefault: false },
  { key: 'one_month', label: '1 Month', durationWeeks: 4, durationDays: 30, isDefault: false },
  { key: 'three_month', label: '3 Month', durationWeeks: 12, durationDays: 90, isDefault: false },
  { key: 'six_month', label: '6 Month', durationWeeks: 26, durationDays: 182, isDefault: true },
  { key: 'nine_month', label: '9 Month', durationWeeks: 39, durationDays: 273, isDefault: false },
  { key: 'twelve_month', label: '12 Month', durationWeeks: 52, durationDays: 365, isDefault: false },
];
const PLAN_HORIZON_KEYS = new Set<HorizonKey>(PLAN_HORIZON_SLOTS.map((slot) => slot.key));
const normalizeCatalogHorizonKey = (value: unknown): HorizonKey | null => {
  const raw = typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s-]+/g, '_') : '';
  return PLAN_HORIZON_KEYS.has(raw as HorizonKey) ? raw as HorizonKey : null;
};

export interface ClientPlanPdfFile {
  url: string;
  fileName: string;
  contentType: string;
  updatedAt: string | null;
}
export interface ClientPlanSummary {
  id: string;
  name: string;
  status: string;
  goal: string;
  horizonKey: HorizonKey;
  horizonLabel?: string;
  isPrimary?: boolean;
  pdfFile?: ClientPlanPdfFile | null;
  nasmPhase?: number;
  durationWeeks?: number;
  createdAt?: string;
  assignmentDefault?: string | null;
  billingIntent?: string | null;
  defaultShouldDeductSession?: boolean;
  planningSystem?: string | null;
}
export interface ClientPlanHorizonSlot {
  horizonKey: HorizonKey;
  label: string;
  durationWeeks: number;
  durationDays: number;
  isDefaultHorizon: boolean;
  isFilled: boolean;
  isPrimary: boolean;
  plan: ClientPlanSummary | null;
}
export interface ClientPlanVaultSummary {
  filledCount: number;
  primaryPlanId: string | null;
  primaryHorizonKey: HorizonKey | null;
  slots: ClientPlanHorizonSlot[];
}

export interface ClientTodayAssignmentSummary {
  assignmentKey?: string;
  assignmentId?: string;
  status?: string;
  isLoggable?: boolean;
  ctaLabel?: string;
}

export interface ClientWorkoutPlansResponseSummary {
  plans?: unknown[];
  plan?: unknown;
  trainingPlanCatalog?: unknown;
  homeworkSummary?: unknown;
  todayAssignment?: unknown;
}

// fallow-ignore-next-line complexity
const normalizeClientWorkoutPlan = (plan: Record<string, unknown>): ClientPlanSummary | null => {
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
    pdfFile: mapped.pdfFile ? { ...mapped.pdfFile, updatedAt: mapped.pdfFile.updatedAt ?? null } : null,
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
const isActivePlan = (plan: ClientPlanSummary) => plan.status.trim().toLowerCase() === 'active';
const isActivePrimaryPlan = (plan: ClientPlanSummary) => isActivePlan(plan) && plan.isPrimary;
const samePlan = (plan: ClientPlanSummary | null | undefined, id: string | null) => (
  Boolean(plan && id && plan.id === id)
);
const firstPlan = (plans: Array<ClientPlanSummary | null | undefined>) => (
  plans.find((plan): plan is ClientPlanSummary => Boolean(plan)) || null
);
const selectPrimaryPlan = (plans: ClientPlanSummary[]) => (
  firstPlan([
    plans.find(isActivePrimaryPlan),
    plans.find(isActivePlan),
    plans.find((plan) => plan.isPrimary),
    plans.find((plan) => plan.horizonKey === 'six_month'),
    plans[0],
  ])
);

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
      if (activeDiff) return activeDiff;
      return updatedTime(b) - updatedTime(a);
    })[0]
  || null
);

// fallow-ignore-next-line complexity
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
    primaryHorizonKey: (primaryPlan?.horizonKey as HorizonKey | undefined) || null,
    slots,
  };
};

const numberOrFallback = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// fallow-ignore-next-line complexity
const normalizeServerCatalogSlot = (value: unknown): ClientPlanHorizonSlot | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const horizonKey = normalizeCatalogHorizonKey(raw.horizonKey);
  if (!horizonKey) return null;

  const fallback = PLAN_HORIZON_SLOTS.find((slot) => slot.key === horizonKey);
  if (!fallback) return null;

  const rawPlan = raw.plan && typeof raw.plan === 'object'
    ? raw.plan as Record<string, unknown>
    : null;
  const plan = rawPlan
    ? normalizeClientWorkoutPlan({
        ...rawPlan,
        horizonKey,
        isPrimary: raw.isPrimary === true || rawPlan.isPrimary === true,
      })
    : null;
  const isPrimary = raw.isPrimary === true || plan?.isPrimary === true;

  return {
    horizonKey,
    label: typeof raw.label === 'string' && raw.label.trim() ? raw.label : fallback.label,
    durationWeeks: numberOrFallback(raw.durationWeeks, fallback.durationWeeks),
    durationDays: numberOrFallback(raw.durationDays, fallback.durationDays),
    isDefaultHorizon: raw.isDefaultHorizon === true || fallback.isDefault,
    isFilled: raw.isFilled === true || Boolean(plan),
    isPrimary,
    plan: plan ? { ...plan, isPrimary } : null,
  };
};

const emptyCatalogSlot = (
  horizon: typeof PLAN_HORIZON_SLOTS[number],
): ClientPlanHorizonSlot => ({
  horizonKey: horizon.key,
  label: horizon.label,
  durationWeeks: horizon.durationWeeks,
  durationDays: horizon.durationDays,
  isDefaultHorizon: horizon.isDefault,
  isFilled: false,
  isPrimary: false,
  plan: null,
});

const buildCatalogSlots = (serverSlots: ClientPlanHorizonSlot[]): ClientPlanHorizonSlot[] => (
  PLAN_HORIZON_SLOTS.map((horizon) => (
    serverSlots.find((slot) => slot.horizonKey === horizon.key) || emptyCatalogSlot(horizon)
  ))
);

const slotPlan = (slot: ClientPlanHorizonSlot | undefined) => slot?.plan || null;
const findSlotPlanById = (slots: ClientPlanHorizonSlot[], planId: string | null) => (
  slotPlan(slots.find((slot) => slot.plan?.id === planId))
);
const findSlotPlanByHorizon = (slots: ClientPlanHorizonSlot[], horizonKey: HorizonKey | null) => (
  slotPlan(slots.find((slot) => slot.horizonKey === horizonKey && slot.plan))
);
const findActivePrimarySlotPlan = (slots: ClientPlanHorizonSlot[]) => (
  slotPlan(slots.find((slot) => (
    slot.plan && isActivePlan(slot.plan) && (slot.isPrimary || slot.plan.isPrimary === true)
  )))
);
const findActiveSlotPlan = (slots: ClientPlanHorizonSlot[]) => (
  slotPlan(slots.find((slot) => slot.plan && isActivePlan(slot.plan)))
);
const findPrimarySlotPlan = (slots: ClientPlanHorizonSlot[]) => (
  slotPlan(slots.find((slot) => slot.isPrimary && slot.plan))
);

const resolveCatalogPrimaryPlanId = (
  slots: ClientPlanHorizonSlot[],
  rawPrimaryPlanId: string | null,
  declaredPrimaryHorizon: HorizonKey | null,
) => firstPlan([
  findActivePrimarySlotPlan(slots),
  findActiveSlotPlan(slots),
  findSlotPlanById(slots, rawPrimaryPlanId),
  findPrimarySlotPlan(slots),
  findSlotPlanByHorizon(slots, declaredPrimaryHorizon),
])?.id || null;

const reconcileCatalogSlots = (
  slots: ClientPlanHorizonSlot[],
  primaryPlanId: string | null,
) => (
  primaryPlanId
    ? slots.map((slot) => {
        const isPrimary = slot.plan?.id === primaryPlanId;
        return { ...slot, isPrimary, plan: slot.plan ? { ...slot.plan, isPrimary } : null };
      })
    : slots
);

const toRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' ? value as Record<string, unknown> : null
);

const normalizeServerCatalogSlots = (raw: Record<string, unknown>) => (
  (Array.isArray(raw.slots) ? raw.slots : [])
    .map(normalizeServerCatalogSlot)
    .filter((slot): slot is ClientPlanHorizonSlot => Boolean(slot))
);

const normalizeRawPrimaryPlanId = (value: unknown) => (
  typeof value === 'number' || typeof value === 'string' ? String(value) : null
);

const primaryCatalogHorizonKey = (
  slots: ClientPlanHorizonSlot[],
  declaredPrimaryHorizon: HorizonKey | null,
) => slots.find((slot) => slot.isPrimary)?.horizonKey || declaredPrimaryHorizon || null;

const buildTrainingPlanCatalogSummary = (
  raw: Record<string, unknown>,
  serverSlots: ClientPlanHorizonSlot[],
): ClientPlanVaultSummary => {
  const slots = buildCatalogSlots(serverSlots);
  const declaredPrimaryHorizon = normalizeCatalogHorizonKey(raw.primaryHorizonKey);
  const primaryPlanId = resolveCatalogPrimaryPlanId(
    slots,
    normalizeRawPrimaryPlanId(raw.primaryPlanId),
    declaredPrimaryHorizon,
  );
  const reconciledSlots = reconcileCatalogSlots(slots, primaryPlanId);

  return {
    filledCount: reconciledSlots.filter((slot) => slot.isFilled).length,
    primaryPlanId,
    primaryHorizonKey: primaryCatalogHorizonKey(reconciledSlots, declaredPrimaryHorizon),
    slots: reconciledSlots,
  };
};

// fallow-ignore-next-line complexity
const normalizeTrainingPlanCatalog = (value: unknown): ClientPlanVaultSummary | null => {
  const raw = toRecord(value);
  if (!raw) return null;

  const serverSlots = normalizeServerCatalogSlots(raw);
  if (serverSlots.length === 0) return null;

  return buildTrainingPlanCatalogSummary(raw, serverSlots);
};

const rawPlansFromResponse = (responseData: ClientWorkoutPlansResponseSummary) => (
  Array.isArray(responseData.plans)
    ? responseData.plans
    : responseData.plan && typeof responseData.plan === 'object' ? [responseData.plan] : []
);

const normalizeRawPlans = (rawPlans: unknown[]) => rawPlans
  .map((plan: unknown) => (
    plan && typeof plan === 'object'
      ? normalizeClientWorkoutPlan(plan as Record<string, unknown>)
      : null
  ))
  .filter((plan: ClientPlanSummary | null): plan is ClientPlanSummary => plan !== null);

const normalizeTodayAssignment = (value: unknown): ClientTodayAssignmentSummary | null => (
  value && typeof value === 'object' ? value as ClientTodayAssignmentSummary : null
);

export const normalizeClientWorkoutPlansResponse = (
  data?: ClientWorkoutPlansResponseSummary,
) => {
  const responseData = data ?? {};
  const serverPlanVault = normalizeTrainingPlanCatalog(responseData.trainingPlanCatalog);
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
  return Number.isNaN(parsed.getTime()) ? 'Updated date unavailable' : `Updated ${parsed.toLocaleDateString()}`;
};
