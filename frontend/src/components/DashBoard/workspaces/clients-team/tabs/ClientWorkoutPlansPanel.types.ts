/**
 * Client Hub plan-library contracts.
 * ==================================
 * Safe summaries only: browser consumers never receive derivative storage keys,
 * checksums, or raw worker errors.
 */

import type { ClientHomeworkSummary } from '../../../shared/client-training/clientHomeworkSummary';

export type { ClientHomeworkSummary };

export type HorizonKey =
  | 'one_day'
  | 'one_week'
  | 'one_month'
  | 'three_month'
  | 'six_month'
  | 'nine_month'
  | 'twelve_month';

export const PLAN_HORIZON_SLOTS: Array<{
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

export type ClientPlanPdfSourceType = 'generated' | 'manual';
export type ClientPlanPdfDerivativeState =
  | 'pending'
  | 'rendering'
  | 'ready'
  | 'failed'
  | 'superseded';

export interface ClientPlanPdfFile {
  url: string;
  fileName: string;
  contentType: string;
  updatedAt: string | null;
  sourceType?: ClientPlanPdfSourceType;
  state?: ClientPlanPdfDerivativeState;
  sourceRevision?: number | null;
  sourceHash?: string | null;
  renderHash?: string | null;
  rendererVersion?: string | null;
  derivativeId?: string | null;
  needsReview?: boolean;
}

export interface ClientPlanPdfDerivativeItem {
  enabled?: boolean;
  id?: string;
  state: string;
  sourceType?: ClientPlanPdfSourceType;
  sourceRevision?: number | null;
  sourceHash?: string | null;
  renderHash?: string | null;
  rendererVersion?: string | null;
  needsReview?: boolean;
  attemptCount?: number;
  safeErrorCode?: string | null;
  readyAt?: string | null;
}

export interface ClientPlanPdfDerivativeSummary {
  enabled: boolean;
  state: string;
  latestGenerated?: ClientPlanPdfDerivativeItem | null;
  latestManual?: ClientPlanPdfDerivativeItem | null;
}

export interface ClientPlanSummary {
  id: string;
  name: string;
  status: string;
  goal: string;
  horizonKey: HorizonKey;
  horizonLabel?: string;
  isPrimary?: boolean;
  contentRevision?: number;
  contentHash?: string | null;
  currentWeek?: number;
  currentDay?: number;
  pdfFile?: ClientPlanPdfFile | null;
  pdfDerivative?: ClientPlanPdfDerivativeSummary | null;
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