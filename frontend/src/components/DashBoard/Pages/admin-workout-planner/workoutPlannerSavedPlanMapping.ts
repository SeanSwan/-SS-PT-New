/**
 * Saved-plan API mapping helpers for the admin/trainer workout planner.
 *
 * Keeps API normalization outside the state hook so the hook stays focused on
 * orchestration while still rendering only safe PDF metadata and SwanStudios
 * horizon labels.
 */

import type { SavedPlanSummary } from './SavedPlanCard';
import { normalizeProtectedPlanPdfUrl } from '../../shared/plan-pdf/workoutPlanPdfUrl';

type PlanRecord = Record<string, unknown>;

const HORIZON_LABELS: Record<string, string> = {
  one_day: '1 Day',
  one_week: '1 Week',
  one_month: '1 Month',
  three_month: '3 Month',
  six_month: '6 Month',
  nine_month: '9 Month',
  twelve_month: '12 Month',
};

const WEEKS_TO_HORIZON: Array<{ weeks: number; key: keyof typeof HORIZON_LABELS }> = [
  { weeks: 1, key: 'one_week' },
  { weeks: 4, key: 'one_month' },
  { weeks: 12, key: 'three_month' },
  { weeks: 26, key: 'six_month' },
  { weeks: 39, key: 'nine_month' },
  { weeks: 52, key: 'twelve_month' },
];

const HORIZON_METADATA_FIELDS = [
  'planHorizon',
  'horizonKey',
  'durationPreset',
  'planDurationKey',
] as const;

const asRecord = (value: unknown): PlanRecord | undefined => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as PlanRecord
    : undefined
);

const recordValue = (record: PlanRecord | undefined, field: string) => (
  record ? record[field] : undefined
);

const firstTruthy = (...values: unknown[]) => values.find(Boolean);

const stringFrom = (fallback: string, ...values: unknown[]) => (
  String(firstTruthy(...values) || fallback)
);

const optionalString = (value: unknown) => (
  typeof value === 'string' ? value : null
);

const normalizeHorizonKey = (value: unknown, durationWeeks: unknown): string => {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  const key = raw.replace(/[\s-]+/g, '_');
  if (HORIZON_LABELS[key]) return key;
  if (key === 'single' || key === '1_day') return 'one_day';

  const weeks = Number(durationWeeks);
  if (!Number.isFinite(weeks) || weeks <= 0) return 'six_month';
  return WEEKS_TO_HORIZON.reduce((closest, candidate) => {
    const candidateDistance = Math.abs(candidate.weeks - weeks);
    const closestDistance = Math.abs(closest.weeks - weeks);
    if (candidateDistance < closestDistance) return candidate;
    if (candidateDistance === closestDistance && candidate.weeks > closest.weeks) return candidate;
    return closest;
  }, WEEKS_TO_HORIZON[0]).key;
};

const horizonMetadataValue = (metadata: PlanRecord | undefined) => (
  firstTruthy(...HORIZON_METADATA_FIELDS.map(field => recordValue(metadata, field)))
);

const isPrimaryPlan = (metadata: PlanRecord | undefined) => (
  recordValue(metadata, 'isPrimaryPlan') === true || recordValue(metadata, 'primary') === true
);

const planPdfRecord = (plan: PlanRecord, metadata: PlanRecord | undefined) => (
  asRecord(firstTruthy(
    recordValue(plan, 'pdfFile'),
    recordValue(metadata, 'planPdf'),
    recordValue(metadata, 'pdfFile'),
  ))
);

const mapPlanPdf = (plan: PlanRecord) => {
  const metadata = asRecord(plan.metadata);
  const rawPdf = planPdfRecord(plan, metadata);
  const url = normalizeProtectedPlanPdfUrl(recordValue(rawPdf, 'url'));
  if (!url) return null;

  return {
    url,
    fileName: stringFrom('Workout Plan.pdf', recordValue(rawPdf, 'fileName')),
    contentType: stringFrom('application/pdf', recordValue(rawPdf, 'contentType')),
    updatedAt: optionalString(recordValue(rawPdf, 'updatedAt')),
  };
};

export const mapSavedPlan = (plan: Record<string, unknown>): SavedPlanSummary => {
  const metadata = asRecord(plan.metadata);
  const planData = asRecord(plan.planData);
  const horizonKey = normalizeHorizonKey(horizonMetadataValue(metadata), plan.durationWeeks);

  return {
    id: stringFrom('', plan.id),
    name: stringFrom('Untitled Plan', plan.title, plan.name),
    status: stringFrom('draft', plan.status),
    createdAt: stringFrom('', plan.createdAt),
    goal: stringFrom('', recordValue(planData, 'goal'), plan.goal),
    horizonKey,
    horizonLabel: HORIZON_LABELS[horizonKey] || '6 Month',
    isPrimary: isPrimaryPlan(metadata),
    pdfFile: mapPlanPdf(plan),
  };
};
