import express from 'express';
import { vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  dailyMacroLogFindAll: vi.fn(),
  dailyMacroLogFindOne: vi.fn(),
  assertAssignmentOrAdmin: vi.fn(),
  user: { id: 9001, role: 'admin' },
}));

export const mocks = mockState;

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = mockState.user;
    next();
  },
}));

vi.mock('../../middleware/verifyClientAccess.mjs', () => ({
  assertAssignmentOrAdmin: mockState.assertAssignmentOrAdmin,
}));

vi.mock('../../models/DailyMacroLog.mjs', () => ({
  default: {
    findAll: mockState.dailyMacroLogFindAll,
    findOne: mockState.dailyMacroLogFindOne,
  },
}));

vi.mock('../../services/nutrition/macroLogService.mjs', () => ({
  createSingleMacroEntry: vi.fn(),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import dailyMacroRosterTriageRoutes from '../../routes/dailyMacroRosterTriageRoutes.mjs';

export const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/macros', dailyMacroRosterTriageRoutes);
  return app;
};

export const resetRosterRouteMocks = () => {
  mocks.user = { id: 9001, role: 'admin' };
  mocks.dailyMacroLogFindAll.mockReset();
  mocks.dailyMacroLogFindOne.mockReset();
  mocks.assertAssignmentOrAdmin.mockReset();
  mocks.assertAssignmentOrAdmin.mockResolvedValue(true);
};
