import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildScheduleReturnRoute,
  buildScheduleCoachRoute,
  buildScheduleLogWorkoutLabel,
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
    const route = buildScheduleWorkoutLoggerRoute('admin', {
      ...baseSession,
      sessionType: { id: 3, name: 'Partner Training', creditsRequired: 2 },
    });
    const url = new URL(route, 'https://sswanstudios.com');

    expect(url.pathname).toBe('/dashboard/admin/client-management');
    expect(url.searchParams.get('clientId')).toBe('155');
    expect(url.searchParams.get('tab')).toBe('training');
    expect(url.searchParams.get('trainingSection')).toBe('logger');
    expect(url.searchParams.get('sessionId')).toBe('72');
    expect(url.searchParams.get('sessionDate')).toBe('2026-05-30T16:00:00.000Z');
    expect(url.searchParams.get('source')).toBe('master-schedule');
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/admin/master-schedule');
    expect(url.searchParams.get('loadPlan')).toBe('today');
    expect(url.searchParams.get('sessionCredits')).toBe('2');
  });

  it('routes schedule Coach Log into the role-owned coach assistant with booked-session context', () => {
    const route = buildScheduleCoachRoute('trainer', {
      ...baseSession,
      sessionType: { id: 3, name: 'Partner Training', creditsRequired: 2 },
    });
    const url = new URL(route, 'https://sswanstudios.com');

    expect(url.pathname).toBe('/dashboard/trainer/coach-assistant');
    expect(url.searchParams.get('clientId')).toBe('155');
    expect(url.searchParams.get('intent')).toBe('log_workout');
    expect(url.searchParams.get('source')).toBe('master-schedule');
    expect(url.searchParams.get('sourcePath')).toBe('/dashboard/trainer/schedule');
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/trainer/schedule');
    expect(url.searchParams.get('sessionId')).toBe('72');
    expect(url.searchParams.get('sessionDate')).toBe('2026-05-30T16:00:00.000Z');
    expect(url.searchParams.get('sessionCredits')).toBe('2');

    const adminUrl = new URL(buildScheduleCoachRoute('admin', baseSession), 'https://sswanstudios.com');
    expect(adminUrl.pathname).toBe('/dashboard/admin/coach-assistant');
    expect(adminUrl.searchParams.get('sourcePath')).toBe('/dashboard/admin/master-schedule');
    expect(adminUrl.searchParams.get('returnTo')).toBe('/dashboard/admin/master-schedule');
  });

  it('builds a billing-aware schedule logger label from the session type', () => {
    expect(buildScheduleLogWorkoutLabel({
      ...baseSession,
      sessionType: { id: 3, name: 'Partner Training', creditsRequired: 2 },
    })).toBe('Log Workout (2 credits)');

    expect(buildScheduleLogWorkoutLabel({
      ...baseSession,
      sessionType: { id: 4, name: 'Standard Training', creditsRequired: 1 },
    })).toBe('Log Workout (1 credit)');

    expect(buildScheduleLogWorkoutLabel({
      ...baseSession,
      sessionType: { id: 5, name: 'Fallback Training', creditsRequired: 'not-a-number' as any },
    })).toBe('Log Workout (1 credit)');

    expect(buildScheduleLogWorkoutLabel({
      ...baseSession,
      sessionType: { id: 6, name: 'Null Training', creditsRequired: null },
    })).toBe('Log Workout (1 credit)');
  });

  it('keeps zero-credit scheduled assessments explicit', () => {
    const session = {
      ...baseSession,
      sessionType: { id: 7, name: 'Assessment', creditsRequired: 0 },
    };
    const route = buildScheduleWorkoutLoggerRoute('admin', session);
    const url = new URL(route, 'https://sswanstudios.com');

    expect(buildScheduleLogWorkoutLabel(session)).toBe('Log Workout (no paid credit)');
    expect(url.searchParams.get('sessionCredits')).toBe('0');
  });

  it('makes free-tracking and already-deducted schedule labels explicit', () => {
    expect(buildScheduleLogWorkoutLabel({
      ...baseSession,
      clientSource: 'move_fitness',
      sessionType: { id: 3, name: 'Partner Training', creditsRequired: 2 },
    })).toBe('Log Workout (no paid credit)');

    expect(buildScheduleLogWorkoutLabel({
      ...baseSession,
      sessionDeducted: true,
      sessionType: { id: 3, name: 'Partner Training', creditsRequired: 2 },
    })).toBe('Log Workout (deducted)');
  });

  it('routes View Workouts to the role-owned client workout surface', () => {
    expect(buildScheduleWorkoutsRoute('client', baseSession)).toBe('/dashboard/client/workouts');
    expect(buildScheduleWorkoutsRoute('trainer', baseSession)).toBe('/dashboard/trainer/client-progress?clientId=155');
    expect(buildScheduleWorkoutsRoute('admin', baseSession)).toBe('/dashboard/admin/client-management?clientId=155&tab=training&trainingSection=history');
  });

  it('blocks cancelled, blocked, no-show, and missing-client sessions from opening the logger', () => {
    expect(canSessionOpenWorkoutLogger(baseSession)).toBe(true);
    expect(canSessionOpenWorkoutLogger(null)).toBe(false);
    expect(canSessionOpenWorkoutLogger({ ...baseSession, status: 'cancelled' })).toBe(false);
    expect(canSessionOpenWorkoutLogger({ ...baseSession, status: 'blocked' })).toBe(false);
    expect(canSessionOpenWorkoutLogger({ ...baseSession, isBlocked: true })).toBe(false);
    expect(canSessionOpenWorkoutLogger({ ...baseSession, attendanceStatus: 'no_show' })).toBe(false);
    expect(canSessionOpenWorkoutLogger({ ...baseSession, userId: undefined })).toBe(false);
  });

  it('blocks schedule-origin logging when the session identity or date is not usable', () => {
    expect(canSessionOpenWorkoutLogger({ ...baseSession, id: 0 })).toBe(false);
    expect(canSessionOpenWorkoutLogger({ ...baseSession, id: Number.NaN })).toBe(false);
    expect(canSessionOpenWorkoutLogger({ ...baseSession, sessionDate: '' })).toBe(false);
    expect(canSessionOpenWorkoutLogger({ ...baseSession, sessionDate: 'not-a-date' })).toBe(false);
  });

  it('allows numeric string session and client IDs from serialized schedule responses', () => {
    expect(canSessionOpenWorkoutLogger({
      ...baseSession,
      id: '72' as any,
      userId: '155' as any,
    })).toBe(true);
  });

  it('blocks future scheduled sessions from opening the workout logger before the session day', () => {
    expect(canSessionOpenWorkoutLogger({
      ...baseSession,
      sessionDate: '2099-01-01T16:00:00.000Z',
    })).toBe(false);
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
