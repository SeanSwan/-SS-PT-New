import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');

vi.mock('../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../services/r2StorageService.mjs', () => ({
  r2Configured: false,
  getR2Client: () => {
    throw new Error('R2 not configured');
  },
}));

const importStorageService = async () => {
  vi.resetModules();
  return import('../services/workoutPlanPdfStorageService.mjs');
};

const restoreEnv = (key, value) => {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
};

const file = {
  originalname: 'AI Generated Plan.pdf',
  mimetype: 'application/pdf',
  size: pdfBuffer.length,
  buffer: pdfBuffer,
};

describe('workoutPlanPdfStorageService production no-R2 policy', () => {
  let uploadsRoot;
  let originalNodeEnv;
  let originalFallbackFlag;
  let originalUploadRoot;

  beforeEach(async () => {
    uploadsRoot = await mkdtemp(path.join(os.tmpdir(), 'swan-workout-plan-no-r2-'));
    originalNodeEnv = process.env.NODE_ENV;
    originalFallbackFlag = process.env.SWAN_WORKOUT_PLAN_ALLOW_R2_LOCAL_FALLBACK;
    originalUploadRoot = process.env.SWAN_WORKOUT_PLAN_UPLOAD_ROOT;
    process.env.NODE_ENV = 'production';
    process.env.SWAN_WORKOUT_PLAN_UPLOAD_ROOT = uploadsRoot;
    delete process.env.SWAN_WORKOUT_PLAN_ALLOW_R2_LOCAL_FALLBACK;
  });

  afterEach(async () => {
    restoreEnv('NODE_ENV', originalNodeEnv);
    restoreEnv('SWAN_WORKOUT_PLAN_ALLOW_R2_LOCAL_FALLBACK', originalFallbackFlag);
    restoreEnv('SWAN_WORKOUT_PLAN_UPLOAD_ROOT', originalUploadRoot);
    await rm(uploadsRoot, { recursive: true, force: true });
  });

  it('fails closed in production when durable R2 storage is not configured', async () => {
    const { storeWorkoutPlanPdf } = await importStorageService();

    await expect(storeWorkoutPlanPdf({
      file,
      planId: 'plan-ai-1',
      clientId: 42,
      uploadedBy: 7,
    })).rejects.toThrow(/durable production storage/i);
  });

  it('allows explicit local fallback for production deployments with persistent disk', async () => {
    process.env.SWAN_WORKOUT_PLAN_ALLOW_R2_LOCAL_FALLBACK = 'true';
    const { storeWorkoutPlanPdf } = await importStorageService();

    const result = await storeWorkoutPlanPdf({
      file,
      planId: 'plan-ai-1',
      clientId: 42,
      uploadedBy: 7,
      idFactory: () => 'local-id',
    });

    expect(result).toMatchObject({
      url: '/api/workout-plans/plan-ai-1/pdf/content.pdf',
      storage: 'local',
      storageKey: 'workout-plans/42/plan-ai-1-local-id-ai-generated-plan.pdf',
    });
  });
});
