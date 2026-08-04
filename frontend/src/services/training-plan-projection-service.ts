/**
 * ============================================================================
 * FILE: training-plan-projection-service.ts
 * PURPOSE: Fetch and normalize the read-only plan projection API contract.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Calls the dedicated projection GET route and rejects
 * malformed, appointment-shaped, billing-shaped, or duplicate response items.
 * HOW IT FITS IN THE APP: The UMS projection hook consumes this service only;
 * appointment services retain all booking, drag, edit, and payment behavior.
 * KEY DECISIONS: Response objects use a strict allowlist and real date-only
 * validation. Unknown server fields fail closed instead of reaching the UI.
 */

import apiService from './api.service';
import { getBrowserTimeZoneHeader } from './clientTimeZoneHeader';

export interface TrainingPlanProjection {
  projectionId: string;
  kind: 'training_plan_projection';
  source: 'training_plan';
  billingImpact: 'none';
  readOnly: true;
  planId: string;
  clientId: number;
  trainerId: number | null;
  planStatus: 'active';
  scheduledDate: string;
  dateBasis: 'explicit' | 'plan_start' | 'current_cursor';
  timeZone: string | null;
  weekNumber: number;
  dayNumber: number;
  title: string;
  dayLabel: string;
  focus: string | null;
  assignmentType: string;
  exerciseCount: number;
  exercisePreview: string[];
  prescribedRevision: number;
  prescribedHash: string | null;
  completionState: 'planned' | 'completed';
  completedAt: string | null;
  /** S2: planned day behind the client's local today (>=1) — honest drift.
   *  Optional for rolling-deploy tolerance: absent from older servers. */
  overdueDays?: number | null;
  coexistenceKey: string;
}

export interface TrainingPlanProjectionResponse {
  items: TrainingPlanProjection[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  range: { startDate: string; endDate: string };
}

export interface TrainingPlanProjectionRequest {
  startDate: string;
  endDate: string;
  clientIds?: number[];
  page: number;
  limit: number;
  timeZone?: string;
}

interface ProjectionApiClient {
  get: (url: string, config?: Record<string, unknown>) => Promise<{ data: unknown }>;
}

const ITEM_KEYS = new Set<keyof TrainingPlanProjection>([
  'projectionId', 'kind', 'source', 'billingImpact', 'readOnly', 'planId',
  'clientId', 'trainerId', 'planStatus', 'scheduledDate', 'dateBasis', 'timeZone',
  'weekNumber', 'dayNumber', 'title', 'dayLabel', 'focus', 'assignmentType',
  'exerciseCount', 'exercisePreview', 'prescribedRevision', 'prescribedHash',
  'completionState', 'completedAt', 'overdueDays', 'coexistenceKey',
]);
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const HASH = /^[a-f0-9]{64}$/;
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const positive = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;
const isObject = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);
const invalid = (): never => { throw new Error('Invalid training plan projection response'); };

const realDateOnly = (value: unknown): value is string => {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
};

const nullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';
const nullableHash = (value: unknown): value is string | null => value === null
  || (typeof value === 'string' && HASH.test(value));
const nullableCompletedAt = (value: unknown): value is string | null => value === null
  || (typeof value === 'string' && !Number.isNaN(new Date(value).getTime()));

const normalizeItem = (value: unknown): TrainingPlanProjection => {
  if (!isObject(value) || Object.keys(value).some((key) => !ITEM_KEYS.has(key as keyof TrainingPlanProjection))) {
    return invalid();
  }
  if (
    !nonEmpty(value.projectionId)
    || value.kind !== 'training_plan_projection'
    || value.source !== 'training_plan'
    || value.billingImpact !== 'none'
    || value.readOnly !== true
    || !nonEmpty(value.planId)
    || !positive(value.clientId)
    || !(value.trainerId === null || positive(value.trainerId))
    || value.planStatus !== 'active'
    || !realDateOnly(value.scheduledDate)
    || !['explicit', 'plan_start', 'current_cursor'].includes(String(value.dateBasis))
    || !nullableString(value.timeZone)
    || !positive(value.weekNumber)
    || !positive(value.dayNumber)
    || !nonEmpty(value.title)
    || !nonEmpty(value.dayLabel)
    || !nullableString(value.focus)
    || !nonEmpty(value.assignmentType)
    || !Number.isSafeInteger(value.exerciseCount) || Number(value.exerciseCount) < 0
    || !Array.isArray(value.exercisePreview)
    || value.exercisePreview.length > 3
    || value.exercisePreview.some((name) => !nonEmpty(name))
    || !positive(value.prescribedRevision)
    || !nullableHash(value.prescribedHash)
    || !['planned', 'completed'].includes(String(value.completionState))
    || !nullableCompletedAt(value.completedAt)
    || (value.completionState === 'completed') !== (value.completedAt !== null)
    // S2 overdueDays: tolerant-optional (absent = older server), else null or
    // a positive integer — and NEVER present on a completed day.
    || !(!('overdueDays' in value) || value.overdueDays === null || positive(value.overdueDays))
    || (value.completionState === 'completed' && value.overdueDays != null)
    || value.coexistenceKey !== `${value.clientId}:${value.scheduledDate}`
  ) return invalid();
  return value as unknown as TrainingPlanProjection;
};

export const normalizeTrainingPlanProjectionResponse = (
  value: unknown,
): TrainingPlanProjectionResponse => {
  if (!isObject(value) || value.success !== true || !Array.isArray(value.items) || !isObject(value.range)) {
    return invalid();
  }
  const items = value.items.map(normalizeItem);
  const identities = new Set(items.map(({ projectionId }) => projectionId));
  if (
    identities.size !== items.length
    || !positive(value.page)
    || !positive(value.limit)
    || Number(value.limit) > 250
    || !Number.isSafeInteger(value.total)
    || Number(value.total) < items.length
    || typeof value.hasMore !== 'boolean'
    || value.hasMore !== (Number(value.page) * Number(value.limit) < Number(value.total))
    || !realDateOnly(value.range.startDate)
    || !realDateOnly(value.range.endDate)
    || value.range.startDate > value.range.endDate
  ) return invalid();
  return {
    items,
    page: value.page as number,
    limit: value.limit as number,
    total: value.total as number,
    hasMore: value.hasMore,
    range: {
      startDate: value.range.startDate,
      endDate: value.range.endDate,
    },
  };
};

export const createTrainingPlanProjectionService = (api: ProjectionApiClient = apiService) => ({
  async getProjections(input: TrainingPlanProjectionRequest): Promise<TrainingPlanProjectionResponse> {
    const clientIds = [...new Set((input.clientIds || []).filter(positive))].slice(0, 50);
    const timeZone = getBrowserTimeZoneHeader(input.timeZone);
    const response = await api.get('/api/training-plan-projections', {
      params: {
        startDate: input.startDate,
        endDate: input.endDate,
        ...(clientIds.length ? { clientIds: clientIds.join(',') } : {}),
        page: input.page,
        limit: input.limit,
      },
      headers: timeZone ? { 'X-Client-Timezone': timeZone } : undefined,
    });
    const normalized = normalizeTrainingPlanProjectionResponse(response.data);
    if (
      normalized.page !== input.page
      || normalized.limit !== input.limit
      || normalized.range.startDate !== input.startDate
      || normalized.range.endDate !== input.endDate
    ) return invalid();
    return normalized;
  },
});

export const trainingPlanProjectionService = createTrainingPlanProjectionService();