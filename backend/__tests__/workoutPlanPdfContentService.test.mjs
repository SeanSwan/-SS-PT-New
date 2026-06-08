/**
 * Workout plan PDF content service contracts.
 * ===========================================
 *
 * Locks authenticated delivery for private workout-plan PDFs. The metadata URL
 * stays inside the app, while the storage key may point at local disk or R2.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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
  let originalNodeEnv;
  let originalFallbackFlag;
  let uploadsRoot;

  beforeEach(() => {
    originalBucket = process.env.R2_BUCKET_NAME;
    originalNodeEnv = process.env.NODE_ENV;
    originalFallbackFlag = process.env.SWAN_WORKOUT_PLAN_ALLOW_R2_LOCAL_FALLBACK;
    process.env.R2_BUCKET_NAME = 'swan-private-plans';
    mockR2Send.mockReset();
  });

  afterEach(async () => {
    if (originalBucket === undefined) delete process.env.R2_BUCKET_NAME;
    else process.env.R2_BUCKET_NAME = originalBucket;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalFallbackFlag === undefined) delete process.env.SWAN_WORKOUT_PLAN_ALLOW_R2_LOCAL_FALLBACK;
    else process.env.SWAN_WORKOUT_PLAN_ALLOW_R2_LOCAL_FALLBACK = originalFallbackFlag;
    if (uploadsRoot) {
      await rm(uploadsRoot, { recursive: true, force: true });
      uploadsRoot = null;
    }
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

  it('fails closed on local plan PDFs in production unless persistent-disk fallback is explicit', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SWAN_WORKOUT_PLAN_ALLOW_R2_LOCAL_FALLBACK;
    uploadsRoot = await mkdtemp(path.join(os.tmpdir(), 'swan-workout-plan-content-'));
    const storageKey = 'workout-plans/42/plan-local-upload-id-plan.pdf';
    const fullPath = path.join(uploadsRoot, storageKey);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, pdfBuffer);

    const plan = {
      id: 'plan-local',
      metadata: {
        planPdf: {
          url: '/api/workout-plans/plan-local/pdf/content.pdf',
          storage: 'local',
          storageKey,
          fileName: 'Local Production Plan.pdf',
        },
      },
    };

    await expect(resolveWorkoutPlanPdfContent({ plan, uploadsRoot })).rejects.toMatchObject({
      status: 503,
      message: 'Workout plan PDF local storage is disabled in production',
    });

    process.env.SWAN_WORKOUT_PLAN_ALLOW_R2_LOCAL_FALLBACK = 'true';
    const result = await resolveWorkoutPlanPdfContent({ plan, uploadsRoot });

    expect(result).toMatchObject({
      contentType: 'application/pdf',
      fileName: 'Local Production Plan.pdf',
      size: pdfBuffer.length,
    });
  });

  it('rejects stored PDF metadata when the storage key belongs to another plan', async () => {
    await expect(resolveWorkoutPlanPdfContent({
      plan: {
        id: 'plan-1',
        metadata: {
          planPdf: {
            url: '/api/workout-plans/plan-1/pdf/content.pdf',
            storage: 'r2',
            storageKey: 'workout-plans/42/plan-2-upload-id-plan.pdf',
            fileName: 'Wrong Plan.pdf',
          },
        },
      },
    })).rejects.toMatchObject({
      status: 404,
      message: 'Workout plan PDF is not available',
    });

    expect(mockR2Send).not.toHaveBeenCalled();
  });
});
