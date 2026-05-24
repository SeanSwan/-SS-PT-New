import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import devRoutes from '../../routes/dev-routes.mjs';
import { runMigrations } from '../../controllers/migrationController.mjs';
import migrationRoutes from '../../routes/migrationRoutes.mjs';

const originalNodeEnv = process.env.NODE_ENV;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/dev', devRoutes);
  app.use('/api/migrations', migrationRoutes);
  return app;
}

describe('development and migration route security', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('keeps dev account seeding retired', async () => {
    const response = await request(makeApp())
      .get('/api/dev/seed-test-accounts')
      .expect(410);

    expect(response.body).toMatchObject({
      success: false,
      message: 'Dev account seeding is retired. Use backend seed scripts with explicit credentials.'
    });
  });

  it('does not expose an HTTP migration runner', async () => {
    await request(makeApp())
      .post('/api/migrations/run')
      .expect(404);
  });

  it('keeps the retired migration controller fail-closed if remounted later', async () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));

    await runMigrations({}, { status });

    expect(status).toHaveBeenCalledWith(410);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'HTTP-triggered migrations are retired. Use the migration CLI or deployment scripts.'
    });
  });

  it('keeps migration status free of database and secret state', async () => {
    const response = await request(makeApp())
      .get('/api/migrations/status')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Migration system is available',
      environment: 'development'
    });
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).not.toHaveProperty('userCount');
    expect(response.body).not.toHaveProperty('databaseConnected');
    expect(response.body).not.toHaveProperty('jwtSecret');
    expect(response.body).not.toHaveProperty('output');
    expect(response.body).not.toHaveProperty('stderr');
  });
});
