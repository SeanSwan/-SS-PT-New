/**
 * Saved-plan API mapping helpers for the admin/trainer workout planner.
 *
 * Keeps API normalization outside the state hook so the hook stays focused on
 * orchestration while still rendering only safe PDF metadata and SwanStudios
 * horizon labels.
 */

import type { SavedPlanSummary } from './SavedPlanCard';

const HORIZON_LABELS: Record<string, string> = {
  one_day: '1 Day',
  one_week: '1 Week',
  one_month: '1 Month',
  three_month: '3 Month',
  six_month: '6 Month',
  nine_month: '9 Month',
  twelve_month: '12 Month',
};

const WEEKS_TO_HORIZON: Array<[number, keyof typeof HORIZON_LABELS]> = [
  [1, 'one_week'],
  [4, 'one_month'],
  [13, 'three_month'],
  [26, 'six_month'],
  [39, 'nine_month'],
  [52, 'twelve_month'],
];

const normalizeHorizonKey = (value: unknown, durationWeeks: unknown): string => {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  const key = raw.replace(/[\s-]+/g, '_');
  if (HORIZON_LABELS[key]) return key;
  if (key === 'single' || key === '1_day') return 'one_day';

  const weeks = Number(durationWeeks);
  if (!Number.isFinite(weeks) || weeks <= 0) return 'six_month';
  return WEEKS_TO_HORIZON.reduce(
    (closest, candidate) => (
      Math.abs(candidate[0] - weeks) < Math.abs(closest[0] - weeks) ? candidate : closest
    ),
    WEEKS_TO_HORIZON[0],
  )[1];
};

const normalizeWorkoutPlannerPdfUrl = (value: unknown) => {
  const raw = typeof value === 'string' ? value : '';
  if (!raw.trim() || /[\r\n\t]/.test(raw)) return null;
  const url = raw.trim();
  const isRootRelative = url.startsWith('/') && !url.startsWith('//');
  const isHttpsAbsolute = /^https:\/\//i.test(url);
  if (!isRootRelative && !isHttpsAbsolute) return null;

  try {
    const parsed = new URL(url, 'https://swanstudios.local');
    if (isHttpsAbsolute && parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password || !/\.pdf$/i.test(parsed.pathname)) return null;
    return isRootRelative ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString();
  } catch {
    return null;
  }
};

const mapPlanPdf = (plan: Record<string, unknown>) => {
  const metadata = plan.metadata as Record<string, unknown> | undefined;
  const rawPdf = (plan.pdfFile || metadata?.planPdf || metadata?.pdfFile) as Record<string, unknown> | undefined;
  const url = normalizeWorkoutPlannerPdfUrl(rawPdf?.url);
  if (!url) return null;

  return {
    url,
    fileName: String(rawPdf?.fileName || 'Workout Plan.pdf'),
    contentType: String(rawPdf?.contentType || 'application/pdf'),
    updatedAt: typeof rawPdf?.updatedAt === 'string' ? rawPdf.updatedAt : null,
  };
};

export const mapSavedPlan = (plan: Record<string, unknown>): SavedPlanSummary => {
  const metadata = plan.metadata as Record<string, unknown> | undefined;
  const planData = plan.planData as Record<string, unknown> | undefined;
  const horizonKey = normalizeHorizonKey(
    metadata?.planHorizon || metadata?.horizonKey || metadata?.durationPreset || metadata?.planDurationKey,
    plan.durationWeeks,
  );

  return {
    id: String(plan.id || ''),
    name: String(plan.title || plan.name || 'Untitled Plan'),
    status: String(plan.status || 'draft'),
    createdAt: String(plan.createdAt || ''),
    goal: String(planData?.goal || plan.goal || ''),
    horizonKey,
    horizonLabel: HORIZON_LABELS[horizonKey] || '6 Month',
    isPrimary: metadata?.isPrimaryPlan === true || metadata?.primary === true,
    pdfFile: mapPlanPdf(plan),
  };
};
