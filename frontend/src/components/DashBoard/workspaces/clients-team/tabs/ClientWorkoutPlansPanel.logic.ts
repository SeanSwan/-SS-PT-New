import { mapSavedPlan } from '../../../Pages/admin-workout-planner/workoutPlannerSavedPlanMapping';

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
  horizonLabel?: string;
  isPrimary?: boolean;
  pdfFile?: ClientPlanPdfFile | null;
  nasmPhase?: number;
  durationWeeks?: number;
  createdAt?: string;
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
    pdfFile: mapped.pdfFile ? { ...mapped.pdfFile, updatedAt: mapped.pdfFile.updatedAt ?? null } : null,
    nasmPhase: typeof plan.nasmPhase === 'number' ? plan.nasmPhase : undefined,
    durationWeeks: typeof plan.durationWeeks === 'number'
      ? plan.durationWeeks
      : typeof planSummary.durationWeeks === 'number' ? planSummary.durationWeeks : undefined,
    createdAt: typeof plan.updatedAt === 'string' ? plan.updatedAt : mapped.createdAt,
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
