import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockStartValidation } = vi.hoisted(() => ({
  mockStartValidation: vi.fn(() => 'val_test1234')
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 42, role: 'admin' };
    next();
  },
  adminOnly: (_req, _res, next) => next()
}));

vi.mock('../../services/ai/aiVillageService.mjs', () => ({
  startValidation: mockStartValidation,
  getValidationStatus: vi.fn(() => null),
  getValidationOutput: vi.fn(() => null),
  isValidationRunning: vi.fn(() => ({ running: false, jobId: null })),
  readLatestReport: vi.fn(() => ({ summary: null, reports: {} })),
  listArchiveRuns: vi.fn(() => []),
  readArchivedReport: vi.fn(() => ({ error: 'not found' })),
  getVillageHealth: vi.fn(() => ({ healthy: true }))
}));

const aiVillageRoutes = (await import('../../routes/aiVillageRoutes.mjs')).default;
const originalFlag = process.env.SWAN_ENABLE_AI_VILLAGE_HTTP_RUN;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai-village', aiVillageRoutes);
  return app;
}

describe('AI Village HTTP run gate', () => {
  beforeEach(() => {
    mockStartValidation.mockClear();
    delete process.env.SWAN_ENABLE_AI_VILLAGE_HTTP_RUN;
  });

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.SWAN_ENABLE_AI_VILLAGE_HTTP_RUN;
    } else {
      process.env.SWAN_ENABLE_AI_VILLAGE_HTTP_RUN = originalFlag;
    }
  });

  it('blocks HTTP validation runs unless Sean explicitly enables the flag', async () => {
    const response = await request(makeApp())
      .post('/api/ai-village/run')
      .send({ files: ['backend/routes/authRoutes.mjs'] })
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      error: 'AI Village HTTP runs are disabled until explicitly enabled by Sean.'
    });
    expect(mockStartValidation).not.toHaveBeenCalled();
  });

  it('allows the existing admin flow only when the explicit flag is enabled', async () => {
    process.env.SWAN_ENABLE_AI_VILLAGE_HTTP_RUN = 'true';

    const response = await request(makeApp())
      .post('/api/ai-village/run')
      .send({ files: ['backend/routes/authRoutes.mjs'], staged: false })
      .expect(200);

    expect(mockStartValidation).toHaveBeenCalledWith(
      { files: ['backend/routes/authRoutes.mjs'], since: undefined, staged: false },
      42
    );
    expect(response.body).toMatchObject({
      success: true,
      jobId: 'val_test1234'
    });
  });

  it('does not echo validation orchestrator exception text to API clients', async () => {
    process.env.SWAN_ENABLE_AI_VILLAGE_HTTP_RUN = 'true';
    mockStartValidation.mockImplementationOnce(() => {
      throw new Error('internal validator path leaked');
    });

    const response = await request(makeApp())
      .post('/api/ai-village/run')
      .send({ files: ['backend/routes/authRoutes.mjs'], staged: false })
      .expect(500);

    expect(response.body).toEqual({
      success: false,
      error: 'Failed to start validation run'
    });
  });
});
