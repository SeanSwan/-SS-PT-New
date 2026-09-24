// Isolated route harness for the repo's own runner (`cd backend && npm test`).
// Real Express Router + supertest; every application dependency is a vi.mock
// fake. No database, token signer, provider, network or application startup.
import express from 'express';
import request from 'supertest';
import { vi } from 'vitest';

const fakes = vi.hoisted(() => ({ state: null }));
const current = () => {
  if (!fakes.state) throw new Error('video session harness used before setup');
  return fakes.state;
};

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, res, next) => (req.user ? next() : res.status(401).json({ success: false })),
  authorize: roles => (req, res, next) => (roles.includes(req.user?.role)
    ? next() : res.status(403).json({ success: false })),
}));

vi.mock('../../middleware/verifyClientAccess.mjs', () => ({
  verifyClientAccessByUserId: () => (_req, _res, next) => next(),
}));

vi.mock('../../services/livekitService.mjs', () => ({
  default: {
    generateToken: async (...args) => {
      (current().tokenCalls ??= []).push(args);
      return 'synthetic-fresh-token';
    },
    getConnectionInfo: () => ({ url: 'wss://synthetic-unit.invalid' }),
    createRoomName: () => 'synthetic-room',
    checkHealth: async () => ({ ok: true }),
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: Object.fromEntries(['info', 'warn', 'error', 'debug'].map(level => [level,
    (...args) => fakes.state?.logs.push({ level, args }),
  ])),
}));

vi.mock('../../models/VideoSession.mjs', () => ({
  default: {
    findByPk: async id => {
      const state = current();
      state.lookups.push(id);
      if (state.lookupError) throw new Error('synthetic lookup failure');
      return state.session;
    },
    findAll: async query => {
      const state = current();
      state.listQueries.push(query);
      return [state.session];
    },
    update: async (...args) => { (current().modelUpdates ??= []).push(args); },
  },
}));

vi.mock('../../models/Gamification.mjs', () => ({
  default: {
    findOne: async () => ({
      experience: 10,
      totalXP: 10,
      update: async values => { (current().gamificationUpdates ??= []).push(values); },
    }),
  },
}));

const { default: videoSessionRoutes } = await import('../../routes/videoSessionRoutes.mjs');

// Background work (transcription) must never reach a real provider.
const flushBackgroundWork = () => new Promise(resolve => setTimeout(resolve, 0));

export async function loadVideoSessionRoutes(state) {
  fakes.state = state;
  vi.stubEnv('DEEPGRAM_API_KEY', '');
  vi.stubGlobal('fetch', async () => { throw new Error('network is not available in unit tests'); });

  const app = express();
  app.use(express.json());
  // Synthetic identity: the fake protect only checks that req.user exists.
  app.use((req, _res, next) => {
    const header = req.get('x-synthetic-user');
    if (header) req.user = JSON.parse(header);
    next();
  });
  app.use('/api/video-sessions', videoSessionRoutes);

  return async (method, path, { user, body } = {}) => {
    let pending = request(app)[method](`/api/video-sessions${path.replace(':id', 'session-1')}`);
    if (user) pending = pending.set('x-synthetic-user', JSON.stringify(user));
    // `null` means "no usable JSON body": express.json() rejects a literal null.
    if (body != null && method !== 'get') pending = pending.send(body);
    const response = await pending;
    await flushBackgroundWork();
    await flushBackgroundWork();
    return { status: response.status, body: response.body };
  };
}
