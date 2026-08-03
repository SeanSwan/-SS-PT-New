/**
 * Schedule Route Role Scoping — security regression
 * =================================================
 *
 * Guards GET /api/schedule against the default-member role gap.
 *
 * `User.role` defaults to 'user' (backend/models/User.mjs:125-127) and public
 * self-registration mints exactly {'user','client'} (authController.mjs:272).
 * scheduleController's RBAC ladder branched on 'client' | 'trainer' | 'admin'
 * only, so a default-role member matched no branch: no ownership predicate was
 * appended to the WHERE clause, and the selectFields ternary fell through to the
 * admin projection carrying clientEmail / clientPhone.
 *
 * These tests capture the SQL the controller actually builds, so they fail
 * against the pre-fix controller and pass after it.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

let currentUser = { id: 42, role: 'user' };

vi.mock('../../database.mjs', () => ({
  default: { query: mockQuery },
}));

vi.mock('../../middleware/auth.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = currentUser;
    next();
  },
}));

const scheduleRoutes = (await import('../../routes/scheduleRoutes.mjs')).default;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/schedule', scheduleRoutes);
  return app;
}

async function callSchedule(user) {
  currentUser = user;
  mockQuery.mockReset();
  mockQuery.mockResolvedValue([]);
  await request(makeApp())
    .get('/api/schedule')
    .query({ start: '2000-01-01', end: '2099-01-01' })
    .expect(200);
  expect(mockQuery).toHaveBeenCalledTimes(1);
  const [sql, options] = mockQuery.mock.calls[0];
  return { sql, replacements: options.replacements };
}

const PII_COLUMNS = ['c.email', 'c.phone', 'clientEmail', 'clientPhone'];

describe('GET /api/schedule role scoping', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('scopes a default-role member (role "user") to their own sessions', async () => {
    const { sql, replacements } = await callSchedule({ id: 42, role: 'user' });

    expect(sql).toContain('s."userId" = :userId');
    expect(replacements.userId).toBe(42);
  });

  it('never projects another member\'s contact PII to role "user"', async () => {
    const { sql } = await callSchedule({ id: 42, role: 'user' });

    for (const column of PII_COLUMNS) {
      expect(sql).not.toContain(column);
    }
  });

  it('keeps the existing client projection unchanged', async () => {
    const { sql, replacements } = await callSchedule({ id: 7, role: 'client' });

    expect(sql).toContain('s."userId" = :userId');
    expect(replacements.userId).toBe(7);
    for (const column of PII_COLUMNS) {
      expect(sql).not.toContain(column);
    }
  });

  it('keeps trainers scoped to their own assignments', async () => {
    const { sql, replacements } = await callSchedule({ id: 9, role: 'trainer' });

    expect(sql).toContain('s."trainerId" = :userId');
    expect(replacements.userId).toBe(9);
  });

  it('still lets admins read the global schedule with full resource detail', async () => {
    const { sql } = await callSchedule({ id: 1, role: 'admin' });

    expect(sql).not.toContain('s."userId" = :userId');
    expect(sql).toContain('clientEmail');
  });

  it('fails closed for an unrecognised role', async () => {
    const { sql, replacements } = await callSchedule({ id: 77, role: 'auditor' });

    expect(sql).toContain('s."userId" = :userId');
    expect(replacements.userId).toBe(77);
    for (const column of PII_COLUMNS) {
      expect(sql).not.toContain(column);
    }
  });
});
