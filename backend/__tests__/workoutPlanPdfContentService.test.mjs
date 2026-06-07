/**
 * Workout plan PDF content service contracts.
 * ===========================================
 *
 * Locks authenticated delivery for private workout-plan PDFs. The metadata URL
 * stays inside the app, while the storage key may point at local disk or R2.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
const mockR2Send = vi.hoisted(() => vi.fn());

vi.mock('../services/r2StorageService.mjs', () => ({
  r2Configured: true,
  getR2Client: () => ({ send: mockR2Send }),
}));

const {
  resolveWorkoutPlanPdfContent,
} = await import('../services/workoutPlanPdfContentService.mjs');

describe('workoutPlanPdfContentService', () => {
  let originalBucket;

  beforeEach(() => {
    originalBucket = process.env.R2_BUCKET_NAME;
    process.env.R2_BUCKET_NAME = 'swan-private-plans';
    mockR2Send.mockReset();
  });

  afterEach(() => {
    if (originalBucket === undefined) delete process.env.R2_BUCKET_NAME;
    else process.env.R2_BUCKET_NAME = originalBucket;
  });

  it('resolves a private R2-backed plan PDF through authenticated app metadata', async () => {
    mockR2Send.mockResolvedValue({
      Body: {
        transformToByteArray: async () => Uint8Array.from(pdfBuffer),
      },
    });

    const result = await resolveWorkoutPlanPdfContent({
      plan: {
        id: 'plan-1',
        metadata: {
          planPdf: {
            url: '/api/workout-plans/plan-1/pdf/content.pdf',
            storage: 'r2',
            storageKey: 'workout-plans/42/plan-1-upload-id-plan.pdf',
            fileName: 'Six Month Plan.pdf',
          },
        },
      },
    });

    expect(mockR2Send).toHaveBeenCalledOnce();
    expect(mockR2Send.mock.calls[0][0].input).toMatchObject({
      Bucket: 'swan-private-plans',
      Key: 'workout-plans/42/plan-1-upload-id-plan.pdf',
    });
    expect(result).toMatchObject({
      contentType: 'application/pdf',
      fileName: 'Six Month Plan.pdf',
      size: pdfBuffer.length,
    });
    expect(result.buffer.equals(pdfBuffer)).toBe(true);
  });
});
