import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildScheduleReturnRoute,
  buildScheduleWorkoutLoggerRoute,
  buildScheduleWorkoutsRoute,
  canSessionOpenWorkoutLogger,
  getStatusTone,
} from './SessionDetailModal.logic';
import type { SessionDetail } from './SessionDetailModal.types';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

const baseSession: SessionDetail = {
  id: 72,
  userId: 155,
  trainerId: 9,
  sessionDate: '2026-05-30T16:00:00.000Z',
  duration: 60,
  status: 'confirmed',
  attendanceStatus: null,
};

describe('SessionDetailModal extracted route and permission logic', () => {
  it('builds role-owned return routes for schedule-origin navigation', () => {
    expect(buildScheduleReturnRoute('admin')).toBe('/dashboard/admin/master-schedule');
    expect(buildScheduleReturnRoute('trainer')).toBe('/dashboard/trainer/schedule');
    expect(buildScheduleReturnRoute('client')).toBe('/dashboard/client/schedule');
  });

  it('routes schedule Log Workout into the logger with client, session, date, source, and return context', () => {
    const route = buildScheduleWorkoutLoggerRoute('admin', baseSession);
    const url = new URL(route, 'https://sswanstudios.com');

    expect(url.pathname).toBe('/dashboard/admin/log-workout');
    expect(url.searchParams.get('clientId')).toBe('155');
    expect(url.searchParams.get('sessionId')).toBe('72');
    expect(url.searchParams.get('sessionDate')).toBe('2026-05-30T16:00:00.000Z');
    expect(url.searchParams.get('source')).toBe('master-schedule');
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/admin/master-schedule');
  });

  it('routes View Workouts to the role-owned client workout surface', () => {
    expect(buildScheduleWorkoutsRoute('client', baseSession)).toBe('/dashboard/client/workouts');
    expect(buildScheduleWorkoutsRoute('trainer', baseSession)).toBe('/dashboard/trainer/client-progress?clientId=155');
    expect(buildScheduleWorkoutsRoute('admin', baseSession)).toBe('/dashboard/admin/client-management?clientId=155&tab=training');
  });

  it('blocks cancelled, blocked, no-show, and missing-client sessions from opening the logger', () => {
    expect(canSessionOpenWorkoutLogger(baseSession)).toBe(true);
    expect(canSessionOpenWorkoutLogger({ ...baseSession, status: 'cancelled' })).toBe(false);
    expect(canSessionOpenWorkoutLogger({ ...baseSession, status: 'blocked' })).toBe(false);
    expect(canSessionOpenWorkoutLogger({ ...baseSession, isBlocked: true })).toBe(false);
    expect(canSessionOpenWorkoutLogger({ ...baseSession, attendanceStatus: 'no_show' })).toBe(false);
    expect(canSessionOpenWorkoutLogger({ ...baseSession, userId: undefined })).toBe(false);
  });

  it('uses token-backed status tones instead of local raw hex constants', () => {
    expect(getStatusTone('confirmed')).toMatch(/^var\(--schedule-status-confirmed,/);
    expect(getStatusTone('unknown')).toBe(getStatusTone('available'));
  });

  it('keeps route/type/status helpers out of the canonical modal shell', () => {
    const modalSource = read('SessionDetailModal.tsx');

    expect(modalSource).toContain("from './SessionDetailModal.logic'");
    expect(modalSource).toContain("from './SessionDetailModal.types'");
    expect(modalSource).not.toContain('interface Session {');
    expect(modalSource).not.toContain('interface SessionDetailModalProps {');
    expect(modalSource).not.toContain('const statusColors');
    expect(modalSource).not.toContain('const buildScheduleWorkoutLoggerRoute =');
    expect(modalSource.split(/\r?\n/).length).toBeLessThanOrEqual(1430);
  });
});
