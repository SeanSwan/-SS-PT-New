import express from '../../../backend/node_modules/express/index.js';
import request from '../../../backend/node_modules/supertest/index.js';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const dependencies = vi.hoisted(() => ({
  saveBootcampTemplate: vi.fn(),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  eventBus: { safeEmit: vi.fn() },
}));

vi.mock('../../../backend/database.mjs', () => ({ default: {} }));
vi.mock('../../../backend/middleware/auth.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 41, role: 'trainer' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));
vi.mock('../../../backend/services/eventBus.mjs', () => ({ default: dependencies.eventBus }));
vi.mock('../../../backend/utils/logger.mjs', () => ({ default: dependencies.logger }));
vi.mock('../../../backend/services/bootcampService.mjs', () => ({
  generateBootcampClass: vi.fn(),
  saveBootcampTemplate: dependencies.saveBootcampTemplate,
  logBootcampClass: vi.fn(),
  getClassHistory: vi.fn(),
  getTemplates: vi.fn(),
  createSpaceProfile: vi.fn(),
  getSpaceProfiles: vi.fn(),
  updateSpaceProfile: vi.fn(),
  getExerciseTrends: vi.fn(),
  approveExerciseTrend: vi.fn(),
  queryExercisesForBootcamp: vi.fn(),
}));

let router;

beforeEach(async () => {
  vi.clearAllMocks();
  dependencies.saveBootcampTemplate.mockResolvedValue({ id: 501 });
  ({ default: router } = await import('../../../backend/routes/bootcampRoutes.mjs'));
});

describe('server RED: bootcamp save route contract', () => {
  it('passes the trusted caller identity and returns the actual service result', async () => {
    const generatedClass = {
      name: 'Route RED Class',
      classFormat: 'full_group',
      exercises: [{ id: 901, templateId: 9001 }],
    };
    const app = express();
    app.use(express.json());
    app.use('/api/bootcamp', router);

    const response = await request(app)
      .post('/api/bootcamp/save')
      .send({ generatedClass });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, templateId: 501 });
    expect(dependencies.saveBootcampTemplate).toHaveBeenCalledWith(
      generatedClass,
      41,
    );
  });

  it('rejects an empty save body before calling the service', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/bootcamp', router);

    const response = await request(app).post('/api/bootcamp/save').send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, error: 'generatedClass is required' });
    expect(dependencies.saveBootcampTemplate).not.toHaveBeenCalled();
  });

  it('maps a service failure to the route error response', async () => {
    dependencies.saveBootcampTemplate.mockRejectedValueOnce(new Error('synthetic save failure'));
    const app = express();
    app.use(express.json());
    app.use('/api/bootcamp', router);

    const response = await request(app)
      .post('/api/bootcamp/save')
      .send({ generatedClass: { name: 'failure case' } });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, error: 'Failed to save template' });
  });
});
