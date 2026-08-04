/**
 * Bootcamp attendance route transaction contract
 * ===============================================
 * The canonical attendance writer must serialize on the class-log row and
 * keep authorization, form creation, and the attendance receipt in one DB transaction.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(resolve(process.cwd(), 'routes/bootcampRoutes.mjs'), 'utf8');
const routeStart = routeSource.indexOf("router.post('/class-logs/:id/attendance'");
const routeEnd = routeSource.indexOf("router.get('/history'", routeStart);
const attendanceRoute = routeSource.slice(routeStart, routeEnd);

describe('bootcamp attendance route safety', () => {
  it('serializes the class receipt and all workout forms in one transaction', () => {
    expect(routeSource).toContain("import sequelize from '../database.mjs';");
    expect(attendanceRoute).toContain('sequelize.transaction(async (transaction) =>');
    expect(attendanceRoute).toContain('lock: transaction.LOCK.UPDATE');
    expect(attendanceRoute).toContain('models.DailyWorkoutForm.bulkCreate');
    expect(attendanceRoute).toContain('{ transaction, returning: true }');
  });

  it('keeps the feature gate executable and default-off', () => {
    const gateLine = attendanceRoute
      .split(/\r?\n/)
      .find((line) => line.includes('SWAN_BOOTCAMP_ATTENDANCE_ENABLED'));
    expect(gateLine?.trim()).toBe("if (process.env.SWAN_BOOTCAMP_ATTENDANCE_ENABLED !== 'true') {");
  });

  it('authorizes the roster in one assignment query instead of one query per client', () => {
    expect(routeSource).toContain("import { Op } from 'sequelize';");
    expect(attendanceRoute).toContain('clientId: { [Op.in]: clientIds }');
    expect(attendanceRoute).toContain('verifyClientAccessBatch');
    expect(attendanceRoute).toContain('distinct: true');
    expect(attendanceRoute).toContain("col: 'clientId'");
    expect(attendanceRoute).not.toContain('ClientTrainerAssignment.findOne');
  });
});
