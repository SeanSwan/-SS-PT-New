import { describe, expect, it } from 'vitest';

import {
  buildWorkoutPlanPdfMetadata,
  extractWorkoutPlanPdfAttachment,
} from '../services/workoutPlanPdfAttachmentService.mjs';

describe('workoutPlanPdfAttachmentService', () => {
  it('accepts protected app PDF metadata with private storage details', () => {
    const result = buildWorkoutPlanPdfMetadata({
      currentMetadata: { planHorizon: 'six_month' },
      pdfUrl: '/api/workout-plans/plan-1/pdf/content.pdf',
      fileName: 'Foundation',
      storage: 'r2',
      storageKey: 'workout-plans/42/plan-1-foundation.pdf',
      updatedBy: 7,
      updatedAt: '2026-06-07T12:00:00.000Z',
      planId: 'plan-1',
    });

    expect(result).toMatchObject({
      ok: true,
      planPdf: {
        url: '/api/workout-plans/plan-1/pdf/content.pdf',
        fileName: 'Foundation.pdf',
        contentType: 'application/pdf',
        updatedAt: '2026-06-07T12:00:00.000Z',
      },
    });
    expect(result.metadata.planHorizon).toBe('six_month');
  });

  it('reuses existing private storage details when editing PDF display metadata', () => {
    const result = buildWorkoutPlanPdfMetadata({
      currentMetadata: {
        planPdf: {
          storage: 'r2',
          storageKey: 'workout-plans/42/plan-1-existing.pdf',
        },
      },
      pdfUrl: '/api/workout-plans/plan-1/pdf/content.pdf',
      fileName: 'Plan 1',
      updatedBy: 7,
      planId: 'plan-1',
    });

    expect(result).toMatchObject({
      ok: true,
      planPdf: {
        url: '/api/workout-plans/plan-1/pdf/content.pdf',
        fileName: 'Plan 1.pdf',
      },
    });
    expect(result.metadata.planPdf).toMatchObject({
      storage: 'r2',
      storageKey: 'workout-plans/42/plan-1-existing.pdf',
    });
  });

  it('rejects public URLs, raw uploads paths, and mismatched protected plan URLs', () => {
    const rejected = [
      'https://cdn.swanstudios.com/plans/foundation.pdf',
      '/uploads/workout-plans/plan-1.pdf',
      '/api/workout-plans/other-plan/pdf/content.pdf',
    ].map((pdfUrl) => buildWorkoutPlanPdfMetadata({ pdfUrl, planId: 'plan-1' }));

    expect(rejected).toEqual([
      expect.objectContaining({ ok: false }),
      expect.objectContaining({ ok: false }),
      expect.objectContaining({ ok: false }),
    ]);
  });

  it('does not expose legacy raw uploads metadata as a safe attachment', () => {
    expect(extractWorkoutPlanPdfAttachment({
      planPdf: {
        url: '/uploads/workout-plans/42/raw-plan.pdf',
        fileName: 'Raw Plan.pdf',
      },
    })).toBeNull();
  });
});
