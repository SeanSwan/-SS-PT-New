import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import debugRoutes from '../../routes/debug.mjs';
import debugAuthRoutes from '../../routes/debugAuthRoutes.mjs';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/debug', debugRoutes);
  app.use('/api/debug', debugAuthRoutes);
  return app;
}

describe('debug route security', () => {
  it('does not expose credential or user lookup helpers', async () => {
    const app = makeApp();

    await request(app)
      .post('/api/debug/verify-password')
      .send({ email: 'client@example.com', password: 'secret' })
      .expect(404);

    await request(app)
      .get('/api/debug/check-user')
      .query({ email: 'client@example.com' })
      .expect(404);

    await request(app)
      .post('/api/debug/login-test')
      .send({ username: 'client@example.com', password: 'secret' })
      .expect(404);
  });

  it('keeps the public status payload free of database, user, and secret state', async () => {
    const response = await request(makeApp())
      .get('/api/debug/server-status')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Server is running'
    });
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).not.toHaveProperty('userCount');
    expect(response.body).not.toHaveProperty('totalUsersInDb');
    expect(response.body).not.toHaveProperty('jwtSecretConfigured');
    expect(response.body).not.toHaveProperty('databaseConnected');
    expect(response.body).not.toHaveProperty('environment');
  });
});
