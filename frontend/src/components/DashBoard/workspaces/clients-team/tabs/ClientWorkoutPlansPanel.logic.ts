import { mapSavedPlan } from '../../../Pages/admin-workout-planner/workoutPlannerSavedPlanMapping';

type HorizonKey =
  | 'one_day'
  | 'one_week'
  | 'one_month'
  | 'three_month'
  | 'six_month'
  | 'nine_month'
  | 'twelve_month';

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

export interface PlanPdfAuthClient {
  get: (
    url: string,
    config?: { responseType?: 'blob' },
  ) => Promise<{ data?: Blob | BlobPart }>;
}

export const normalizeClientWorkoutPlan = (plan: Record<string, unknown>): ClientPlanSummary | null => {
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

  return {
    ...mapped,
    horizonKey: (mapped.horizonKey || 'six_month') as HorizonKey,
    pdfFile: mapped.pdfFile ? { ...mapped.pdfFile, updatedAt: mapped.pdfFile.updatedAt ?? null } : null,
    nasmPhase: typeof plan.nasmPhase === 'number' ? plan.nasmPhase : undefined,
    durationWeeks: typeof plan.durationWeeks === 'number'
      ? plan.durationWeeks
      : typeof planSummary.durationWeeks === 'number' ? planSummary.durationWeeks : undefined,
    createdAt: typeof plan.updatedAt === 'string' ? plan.updatedAt : mapped.createdAt,
  };
};

const updatedTime = (plan: ClientPlanSummary) => {
  const parsed = plan.createdAt ? new Date(plan.createdAt).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

const isActivePlan = (plan: ClientPlanSummary) => plan.status.toLowerCase() === 'active';

const samePlan = (plan: ClientPlanSummary | null | undefined, id: string | null) => (
  Boolean(plan && id && plan.id === id)
);

const selectPrimaryPlan = (plans: ClientPlanSummary[]) => (
  plans.find((plan) => plan.isPrimary)
  || plans.find(isActivePlan)
  || plans.find((plan) => plan.horizonKey === 'six_month')
  || plans[0]
  || null
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

export const formatClientPlanUpdated = (value?: string) => {
  if (!value) return 'Updated date unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Updated date unavailable';
  return `Updated ${parsed.toLocaleDateString()}`;
};

export const createProtectedPdfObjectUrl = async (
  authAxios: PlanPdfAuthClient,
  pdfFile: ClientPlanPdfFile,
) => {
  const response = await authAxios.get(pdfFile.url, { responseType: 'blob' });
  const data = response.data;
  const blob = data instanceof Blob
    ? data
    : new Blob(data === undefined ? [] : [data], { type: pdfFile.contentType || 'application/pdf' });

  return URL.createObjectURL(blob);
};
