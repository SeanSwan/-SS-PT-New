import { describe, expect, it, vi } from 'vitest';
import {
  normalizeClientWorkoutPlansResponse,
  type ClientPlanPdfFile,
} from './ClientWorkoutPlansPanel.logic';
import { createProtectedPlanPdfObjectUrl } from '../../../shared/plan-pdf/useProtectedPlanPdfViewer';

const pdfFile = (url: string): ClientPlanPdfFile => ({
  url,
  fileName: 'Plan.pdf',
  contentType: 'application/pdf',
  updatedAt: null,
});

describe('ClientWorkoutPlansPanel.logic PDF safety', () => {
  it('keeps only authenticated workout-plan PDF proxy URLs when normalizing plans', () => {
    const { plans } = normalizeClientWorkoutPlansResponse({
      plans: [
        {
          id: 'protected-plan',
          title: 'Protected Plan',
          status: 'active',
          durationWeeks: 26,
          metadata: { planPdf: pdfFile('/api/workout-plans/protected-plan/pdf/content.pdf') },
        },
        {
          id: 'public-plan',
          title: 'Public CDN Plan',
          status: 'draft',
          durationWeeks: 26,
          metadata: { planPdf: pdfFile('https://cdn.swanstudios.com/plans/public-plan.pdf') },
        },
        {
          id: 'uploads-plan',
          title: 'Uploads Plan',
          status: 'draft',
          durationWeeks: 26,
          metadata: { planPdf: pdfFile('/uploads/workout-plans/42/uploads-plan.pdf') },
        },
      ],
    });

    expect(plans.find((plan) => plan.id === 'protected-plan')?.pdfFile?.url)
      .toBe('/api/workout-plans/protected-plan/pdf/content.pdf');
    expect(plans.find((plan) => plan.id === 'public-plan')?.pdfFile).toBeNull();
    expect(plans.find((plan) => plan.id === 'uploads-plan')?.pdfFile).toBeNull();
  });

  it('does not fetch non-proxy PDF URLs', async () => {
    const authAxios = { get: vi.fn() };

    await expect(createProtectedPlanPdfObjectUrl(
      authAxios,
      pdfFile('https://cdn.swanstudios.com/plans/public-plan.pdf'),
    )).rejects.toThrow(/protected workout plan pdf url/i);

    expect(authAxios.get).not.toHaveBeenCalled();
  });
});
