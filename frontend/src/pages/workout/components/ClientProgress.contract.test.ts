import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const componentPath = resolve(__dirname, './ClientProgress.tsx');
const logicPath = resolve(__dirname, './ClientProgress.logic.ts');

const componentSource = readFileSync(componentPath, 'utf8');
const logicSource = readFileSync(logicPath, 'utf8');

describe('ClientProgress protected endpoint contract', () => {
  it('chooses self endpoints for client/self views and scoped endpoints for selected staff clients', () => {
    expect(logicSource).toContain('export const getClientProgressUrl');
    expect(logicSource).toContain("return '/api/client-progress';");
    expect(logicSource).toContain('return `/api/client-progress/${targetUserId}`;');
    expect(logicSource).toContain('export const getWorkoutStatisticsUrl');
    expect(logicSource).toContain("return '/api/workout/statistics';");
    expect(logicSource).toContain('return `/api/workout/statistics/${targetUserId}`;');
  });

  it('keeps ClientProgress role-aware instead of hardcoding selected ids into every request', () => {
    expect(componentSource).toContain('userRole?: string');
    expect(componentSource).toContain('getClientProgressUrl(targetUserId, userRole, user?.id)');
    expect(componentSource).toContain('getWorkoutStatisticsUrl(targetUserId, userRole, user?.id)');
    expect(componentSource).not.toContain('`/api/client-progress/${targetUserId}`');
    expect(componentSource).not.toContain('`/api/workout/statistics/${targetUserId}`');
  });

  it('unwraps both client progress envelopes used by the current backend routes', () => {
    expect(logicSource).toContain('export const extractClientProgress');
    expect(logicSource).toContain('payload?.progress');
    expect(logicSource).toContain('payload?.data?.progress');
    expect(logicSource).toContain('export const extractWorkoutStatistics');
    expect(logicSource).toContain('payload?.data?.statistics');
  });
});
