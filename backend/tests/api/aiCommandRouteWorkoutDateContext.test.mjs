import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockExecuteCommandPipeline, mockGetCommandExecutionLane } = vi.hoisted(() => ({
  mockExecuteCommandPipeline: vi.fn(),
  mockGetCommandExecutionLane: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 7, role: 'admin', firstName: 'Admin', lastName: 'User' };
    next();
  },
}));

vi.mock('../../database.mjs', () => ({ default: { query: vi.fn(async () => []) } }));

vi.mock('../../services/ai/commandExecutor.mjs', () => ({
  executeCommandPipeline: mockExecuteCommandPipeline,
  executeConfirmedOperation: vi.fn(),
  checkForConfirmation: vi.fn(),
}));

vi.mock('../../services/ai/commandExecutionLane.mjs', () => ({
  getCommandExecutionLane: mockGetCommandExecutionLane,
}));

const aiCommandRoutes = (await import('../../routes/aiCommandRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai-command', aiCommandRoutes);
  return app;
}

describe('aiCommandRoutes workout date route context', () => {
  beforeEach(() => {
    mockExecuteCommandPipeline.mockReset();
    mockExecuteCommandPipeline.mockResolvedValue({
      error: null,
      resolvedClient: null,
      metadata: { timing: { totalMs: 3 } },
      intent: { intent: 'chat', params: {} },
      command: null,
      result: null,
    });
  });

  it('passes safe workoutDate route context and strips malformed date text', async () => {
    await request(makeApp())
      .post('/api/ai-command/execute')
      .send({
        message: 'log today workout',
        selectedClientId: 42,
        routeContext: {
          source: 'clients-team',
          intent: 'daily_training_command',
          surface: 'client-training-command-bar',
          workoutDate: '2026-06-09T16:30:00.000Z',
          fallbackDate: 'tomorrow after lunch',
        },
      })
      .expect(200);

    expect(mockExecuteCommandPipeline).toHaveBeenLastCalledWith(
      'log today workout',
      expect.objectContaining({ id: 7, role: 'admin' }),
      expect.objectContaining({
        routeContext: {
          source: 'clients-team',
          intent: 'daily_training_command',
          surface: 'client-training-command-bar',
          workoutDate: '2026-06-09',
        },
      }),
    );
    expect(mockExecuteCommandPipeline.mock.lastCall?.[2]?.routeContext)
      .not.toHaveProperty('fallbackDate');
  });
});
