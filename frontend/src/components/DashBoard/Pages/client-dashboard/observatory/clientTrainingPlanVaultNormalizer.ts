/**
 * FILE: clientTrainingPlanVaultNormalizer.ts
 * PURPOSE: Normalize client dashboard training-plan vault payloads.
 */

import { normalizeProtectedPlanPdfUrl } from '../../../shared/plan-pdf/workoutPlanPdfUrl';
import { normalizeWorkoutPlanUse } from '../../../../../utils/workoutPlanAssignmentSemantics';

interface ClientPlanPdfPreview {
  url?: string;
  fileName?: string;
  contentType?: string;
  updatedAt?: string | null;
}

interface TrainingPlanSlotPreview {
  horizonKey?: string;
  label?: string;
  durationWeeks?: number;
  durationDays?: number;
  isDefaultHorizon?: boolean;
  isPrimary?: boolean;
  isFilled?: boolean;
  plan?: {
    id?: string | number | null;
    title?: string;
    status?: string;
    currentWeek?: number | string | null;
    currentDay?: number | string | null;
    pdfFile?: ClientPlanPdfPreview | null;
    planPdf?: ClientPlanPdfPreview | null;
    assignmentDefault?: string | null;
    billingIntent?: string | null;
    defaultShouldDeductSession?: boolean;
    metadata?: Record<string, unknown> | null;
    planData?: Record<string, unknown> | null;
  } | null;
}

export interface TrainingPlanCatalogPreview {
  defaultHorizonKey?: string;
  primaryPlanId?: string | number | null;
  primaryHorizonKey?: string | null;
  filledHorizonKeys?: string[];
  slots?: TrainingPlanSlotPreview[];
}

interface WorkoutPlanVaultResponsePreview {
  data?: { trainingPlanCatalog?: TrainingPlanCatalogPreview | null } | null;
  plan?: { trainingPlanCatalog?: TrainingPlanCatalogPreview | null } | null;
  trainingPlanCatalog?: TrainingPlanCatalogPreview | null;
}

export interface ClientTrainingPlanSlot {
  horizonKey: string;
  label: string;
  durationWeeks?: number;
  durationDays?: number;
  isDefaultHorizon: boolean;
  isFilled: boolean;
  isPrimary: boolean;
  planId?: string | number | null;
  planTitle?: string;
  planStatus?: string;
  assignmentDefault?: string | null;
  billingIntent?: string | null;
  defaultShouldDeductSession?: boolean;
  currentWeek?: number;
  currentDay?: number;
  pdfFile?: {
    url: string;
    fileName: string;
    contentType: string;
    updatedAt?: string | null;
  } | null;
}

export interface ClientTrainingPlanVault {
  defaultHorizonKey: string;
  primaryPlanId?: string | number | null;
  primaryHorizonKey?: string | null;
  filledHorizonKeys: string[];
  filledCount: number;
  slots: ClientTrainingPlanSlot[];
}

const toPositiveInteger = (raw: unknown): number | undefined => {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : undefined;
};

function normalizePlanPdfFile(raw?: ClientPlanPdfPreview | null): ClientTrainingPlanSlot['pdfFile'] {
  const url = normalizeProtectedPlanPdfUrl(raw?.url);
  if (!url) return null;
  return {
    url,
    fileName: typeof raw?.fileName === 'string' && raw.fileName.trim() ? raw.fileName.trim() : 'Workout Plan.pdf',
    contentType: typeof raw?.contentType === 'string' && raw.contentType.trim() ? raw.contentType.trim() : 'application/pdf',
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : null,
  };
}

export function primaryPlanLabel(catalog?: TrainingPlanCatalogPreview | null): string | undefined {
  const slot = Array.isArray(catalog?.slots)
    ? catalog?.slots?.find((item) => item?.isPrimary && item?.isFilled)
    : null;
  return typeof slot?.label === 'string' && slot.label.trim() ? slot.label.trim() : undefined;
}

export function normalizeTrainingPlanVault(
  payload?: WorkoutPlanVaultResponsePreview | null,
): ClientTrainingPlanVault | null {
  const plan = payload?.data || payload?.plan || null;
  const catalog = payload?.trainingPlanCatalog || plan?.trainingPlanCatalog || null;
  const slots = Array.isArray(catalog?.slots) ? catalog.slots : [];
  if (!slots.length) return null;

  const normalizedSlots = slots.map((slot) => {
    const planUse = slot.plan ? normalizeWorkoutPlanUse(slot.plan) : {};
    return {
      horizonKey: slot.horizonKey || 'unknown',
      label: slot.label || 'Plan',
      durationWeeks: slot.durationWeeks,
      durationDays: slot.durationDays,
      isDefaultHorizon: Boolean(slot.isDefaultHorizon),
      isFilled: Boolean(slot.isFilled),
      isPrimary: Boolean(slot.isPrimary),
      planId: slot.plan?.id,
      planTitle: slot.plan?.title,
      planStatus: slot.plan?.status,
      assignmentDefault: planUse.assignmentDefault,
      billingIntent: planUse.billingIntent,
      defaultShouldDeductSession: planUse.defaultShouldDeductSession,
      currentWeek: toPositiveInteger(slot.plan?.currentWeek),
      currentDay: toPositiveInteger(slot.plan?.currentDay),
      pdfFile: normalizePlanPdfFile(slot.plan?.pdfFile || slot.plan?.planPdf),
    };
  });
  const filledHorizonKeys = Array.isArray(catalog?.filledHorizonKeys)
    ? catalog.filledHorizonKeys
    : normalizedSlots.filter((slot) => slot.isFilled).map((slot) => slot.horizonKey);

  return {
    defaultHorizonKey: catalog?.defaultHorizonKey || 'six_month',
    primaryPlanId: catalog?.primaryPlanId,
    primaryHorizonKey: catalog?.primaryHorizonKey || normalizedSlots.find((slot) => slot.isPrimary)?.horizonKey || null,
    filledHorizonKeys,
    filledCount: normalizedSlots.filter((slot) => slot.isFilled).length,
    slots: normalizedSlots,
  };
}
