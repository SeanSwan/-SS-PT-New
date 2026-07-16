import { describe, expect, it } from 'vitest';
import { describeClientWorkoutPlanPdfState } from './ClientWorkoutPlanPdfState.logic';
import type { ClientPlanSummary } from './ClientWorkoutPlansPanel.types';

const plan = (overrides: Partial<ClientPlanSummary> = {}): ClientPlanSummary => ({
  id: 'plan-fixture',
  name: 'Fixture Plan',
  status: 'active',
  goal: 'strength',
  horizonKey: 'six_month',
  contentRevision: 3,
  ...overrides,
});

const generated = (state: string, sourceRevision = 3) => ({
  state,
  sourceType: 'generated' as const,
  sourceRevision,
  needsReview: false,
});

describe('describeClientWorkoutPlanPdfState', () => {
  it('distinguishes current, generating, failed, stale, and missing generated derivatives', () => {
    expect(describeClientWorkoutPlanPdfState(plan({
      pdfDerivative: { enabled: true, state: 'ready', latestGenerated: generated('ready') },
    }))).toMatchObject({ key: 'current', label: 'Current PDF', canGenerate: true });

    expect(describeClientWorkoutPlanPdfState(plan({
      pdfDerivative: { enabled: true, state: 'rendering', latestGenerated: generated('rendering') },
    }))).toMatchObject({ key: 'generating', label: 'Generating current PDF', canGenerate: false });

    expect(describeClientWorkoutPlanPdfState(plan({
      pdfDerivative: { enabled: true, state: 'failed', latestGenerated: generated('failed') },
    }))).toMatchObject({ key: 'failed', label: 'PDF generation failed', canGenerate: true });

    expect(describeClientWorkoutPlanPdfState(plan({
      pdfDerivative: { enabled: true, state: 'ready', latestGenerated: generated('ready', 2) },
    }))).toMatchObject({ key: 'stale', label: 'PDF is stale', canGenerate: true });

    expect(describeClientWorkoutPlanPdfState(plan({
      pdfDerivative: { enabled: true, state: 'missing' },
    }))).toMatchObject({ key: 'missing', label: 'No generated PDF', canGenerate: true });
  });

  it('keeps a changed manual upload visible while recommending a current render', () => {
    expect(describeClientWorkoutPlanPdfState(plan({
      pdfFile: {
        url: '/api/workout-plans/plan-fixture/pdf/content.pdf',
        fileName: 'Custom Plan.pdf',
        contentType: 'application/pdf',
        updatedAt: null,
        sourceType: 'manual',
        sourceRevision: 2,
        needsReview: true,
      },
      pdfDerivative: {
        enabled: true,
        state: 'missing',
        latestManual: {
          state: 'ready',
          sourceType: 'manual',
          sourceRevision: 2,
          needsReview: true,
        },
      },
    }))).toMatchObject({
      key: 'custom-review',
      label: 'Custom upload - review after plan changes',
      canView: true,
      canGenerate: true,
    });
  });
});