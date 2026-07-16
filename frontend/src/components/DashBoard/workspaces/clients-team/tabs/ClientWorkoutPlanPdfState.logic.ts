/** Safe PDF normalization and presentation state for staff plan cards. */

import type {
  ClientPlanPdfDerivativeItem,
  ClientPlanPdfDerivativeState,
  ClientPlanPdfDerivativeSummary,
  ClientPlanPdfFile,
  ClientPlanPdfSourceType,
  ClientPlanSummary,
} from './ClientWorkoutPlansPanel.types';

const DERIVATIVE_STATES = new Set(['pending', 'rendering', 'ready', 'failed', 'superseded']);
const HASH = /^[a-f0-9]{64}$/i;
const SAFE_ERROR = /^[A-Z0-9_]{1,80}$/;
const toRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);
const compactString = (value: unknown) => (
  typeof value === 'string' && value.trim() ? value.trim() : null
);
const positiveInteger = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};
const safeHash = (value: unknown) => HASH.test(String(value || ''))
  ? String(value).toLowerCase()
  : null;
const safeSourceType = (value: unknown): ClientPlanPdfSourceType | undefined => (
  value === 'generated' || value === 'manual' ? value : undefined
);
const safeState = (value: unknown): ClientPlanPdfDerivativeState | undefined => (
  DERIVATIVE_STATES.has(String(value)) ? value as ClientPlanPdfDerivativeState : undefined
);

const normalizeDerivativeItem = (value: unknown): ClientPlanPdfDerivativeItem | null => {
  const raw = toRecord(value);
  if (!raw) return null;
  const state = compactString(raw.state);
  if (!state) return null;
  const errorCode = compactString(raw.safeErrorCode);
  return {
    state,
    sourceType: safeSourceType(raw.sourceType),
    sourceRevision: positiveInteger(raw.sourceRevision),
    sourceHash: safeHash(raw.sourceHash),
    renderHash: safeHash(raw.renderHash),
    rendererVersion: compactString(raw.rendererVersion),
    needsReview: raw.needsReview === true,
    attemptCount: Number.isFinite(Number(raw.attemptCount)) ? Number(raw.attemptCount) : 0,
    safeErrorCode: errorCode && SAFE_ERROR.test(errorCode) ? errorCode : null,
    readyAt: compactString(raw.readyAt),
  };
};

const normalizeDerivativeSummary = (value: unknown): ClientPlanPdfDerivativeSummary | null => {
  const raw = toRecord(value);
  if (!raw || typeof raw.enabled !== 'boolean') return null;
  return {
    enabled: raw.enabled,
    state: compactString(raw.state) || (raw.enabled ? 'missing' : 'legacy'),
    latestGenerated: normalizeDerivativeItem(raw.latestGenerated),
    latestManual: normalizeDerivativeItem(raw.latestManual),
  };
};

const rawPdfForPlan = (plan: Record<string, unknown>) => {
  const metadata = toRecord(plan.metadata);
  return toRecord(plan.pdfFile)
    || toRecord(metadata?.planPdf)
    || toRecord(metadata?.pdfFile);
};

const normalizePdfFile = (
  mappedPdf: Pick<ClientPlanPdfFile, 'url' | 'fileName' | 'contentType'> & { updatedAt?: string | null } | null,
  rawPdf: Record<string, unknown> | null,
): ClientPlanPdfFile | null => {
  if (!mappedPdf) return null;
  return {
    ...mappedPdf,
    updatedAt: mappedPdf.updatedAt ?? null,
    sourceType: safeSourceType(rawPdf?.sourceType),
    state: safeState(rawPdf?.state),
    sourceRevision: positiveInteger(rawPdf?.sourceRevision),
    sourceHash: safeHash(rawPdf?.sourceHash),
    renderHash: safeHash(rawPdf?.renderHash),
    rendererVersion: compactString(rawPdf?.rendererVersion),
    derivativeId: compactString(rawPdf?.derivativeId),
    needsReview: rawPdf?.needsReview === true,
  };
};

export const normalizeClientPlanPdfContract = (
  plan: Record<string, unknown>,
  mappedPdf: Pick<ClientPlanPdfFile, 'url' | 'fileName' | 'contentType'> & { updatedAt?: string | null } | null,
) => ({
  contentRevision: positiveInteger(plan.contentRevision) ?? 1,
  contentHash: safeHash(plan.contentHash),
  currentWeek: positiveInteger(plan.currentWeek) ?? undefined,
  currentDay: positiveInteger(plan.currentDay) ?? undefined,
  pdfFile: normalizePdfFile(mappedPdf, rawPdfForPlan(plan)),
  pdfDerivative: normalizeDerivativeSummary(plan.pdfDerivative),
});

export type ClientPlanPdfPresentationKey =
  | 'current'
  | 'generating'
  | 'failed'
  | 'stale'
  | 'custom-review'
  | 'available'
  | 'missing';

export interface ClientPlanPdfPresentation {
  key: ClientPlanPdfPresentationKey;
  label: string;
  detail: string;
  canView: boolean;
  canGenerate: boolean;
}

export const describeClientWorkoutPlanPdfState = (
  plan: ClientPlanSummary,
): ClientPlanPdfPresentation => {
  const generated = plan.pdfDerivative?.latestGenerated;
  const manual = plan.pdfDerivative?.latestManual;
  const generatedState = generated?.state || plan.pdfDerivative?.state;
  const manualNeedsReview = plan.pdfFile?.sourceType === 'manual'
    && (plan.pdfFile.needsReview === true || manual?.needsReview === true);
  const canView = Boolean(plan.pdfFile);

  if (generatedState === 'pending' || generatedState === 'rendering') {
    return {
      key: 'generating', label: 'Generating current PDF', canView, canGenerate: false,
      detail: manualNeedsReview
        ? 'The custom upload remains available while the current revision renders.'
        : 'The current plan revision is rendering after commit.',
    };
  }
  if (generatedState === 'failed') {
    return {
      key: 'failed', label: 'PDF generation failed', canView, canGenerate: true,
      detail: canView
        ? 'The last available PDF remains protected; retry the current revision.'
        : 'No replacement was published. Retry the current revision.',
    };
  }
  if (manualNeedsReview) {
    return {
      key: 'custom-review', label: 'Custom upload - review after plan changes',
      canView: true, canGenerate: true,
      detail: 'The manual PDF was preserved and was not silently overwritten.',
    };
  }
  if (generatedState === 'ready' && generated) {
    const current = generated.sourceRevision === plan.contentRevision;
    return current
      ? {
          key: 'current', label: 'Current PDF', canView, canGenerate: true,
          detail: `Rendered from plan revision ${plan.contentRevision ?? 1}.`,
        }
      : {
          key: 'stale', label: 'PDF is stale', canView, canGenerate: true,
          detail: 'A newer plan revision exists. Generate the current PDF.',
        };
  }
  if (generatedState === 'superseded') {
    return {
      key: 'stale', label: 'PDF is stale', canView, canGenerate: true,
      detail: 'The previous render was superseded by a newer plan revision.',
    };
  }
  if (canView) {
    return {
      key: 'available', label: 'PDF available', canView: true, canGenerate: true,
      detail: 'Protected legacy PDF available; generate to bind it to the current revision.',
    };
  }
  return {
    key: 'missing', label: 'No generated PDF', canView: false, canGenerate: true,
    detail: 'Generate a protected PDF from the current saved revision.',
  };
};
