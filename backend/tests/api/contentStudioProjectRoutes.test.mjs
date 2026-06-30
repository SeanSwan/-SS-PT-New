import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockRole = 'admin';
const findAllMock = vi.fn();
const createMock = vi.fn();
const findByPkMock = vi.fn();

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 11, role: mockRole };
    next();
  },
  adminOnly: (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Admin access required' });
  },
}));

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    ContentProject: {
      findAll: findAllMock,
      create: createMock,
      findByPk: findByPkMock,
    },
  }),
}));

const { default: contentStudioProjectRoutes } = await import('../../routes/contentStudioProjectRoutes.mjs');

const app = express();
app.use(express.json());
app.use('/api/content-studio/projects', contentStudioProjectRoutes);

const projectRow = (data) => ({ toJSON: () => data });

describe('Content Studio project routes', () => {
  beforeEach(() => {
    mockRole = 'admin';
    findAllMock.mockReset();
    createMock.mockReset();
    findByPkMock.mockReset();
  });

  it('lists projects through the admin-only project API', async () => {
    findAllMock.mockResolvedValueOnce([projectRow({ id: 'p1', title: 'Demo', status: 'idea', sourceType: 'manual', priority: 'normal' })]);

    const response = await request(app).get('/api/content-studio/projects?status=idea');

    expect(response.status).toBe(200);
    expect(response.body.data.projects).toEqual([expect.objectContaining({ id: 'p1', title: 'Demo', status: 'idea' })]);
    expect(findAllMock).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'idea' } }));
  });

  it('creates a project with sanitized workflow payload', async () => {
    createMock.mockResolvedValueOnce(projectRow({ id: 'p2', title: 'Deadlift demo', status: 'idea', sourceType: 'coverage_gap', priority: 'normal' }));

    const response = await request(app)
      .post('/api/content-studio/projects')
      .send({ title: ' Deadlift demo ', sourceType: 'coverage_gap', sourceId: 'exercise-1' });

    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Deadlift demo',
      sourceType: 'coverage_gap',
      sourceId: 'exercise-1',
      createdBy: 11,
      updatedBy: 11,
    }));
  });

  it('patches a project through the admin-only project API', async () => {
    const row = {
      data: { id: 'p3', title: 'Script draft', status: 'idea', sourceType: 'manual', priority: 'normal' },
      async update(payload) { Object.assign(this.data, payload); },
      toJSON() { return this.data; },
    };
    findByPkMock.mockResolvedValueOnce(row);

    const response = await request(app)
      .patch('/api/content-studio/projects/p3')
      .send({ status: 'script' });

    expect(response.status).toBe(200);
    expect(findByPkMock).toHaveBeenCalledWith('p3');
    expect(response.body.data.project).toEqual(expect.objectContaining({ id: 'p3', status: 'script', updatedBy: 11 }));
  });

  it('rejects non-admin access before model writes', async () => {
    mockRole = 'trainer';

    const response = await request(app)
      .post('/api/content-studio/projects')
      .send({ title: 'Trainer draft' });

    expect(response.status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('returns validation errors without raw stack details', async () => {
    const response = await request(app)
      .post('/api/content-studio/projects')
      .send({ title: 'Bad', status: 'not_real' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: 'status is invalid.' });
  });
});