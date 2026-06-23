// @vitest-environment jsdom
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

const utilPath = resolve(__dirname, 'adminImpersonationSession.ts');

const loadUtils = async () => {
  expect(existsSync(utilPath), 'admin impersonation session utility must exist').toBe(true);
  return import(pathToFileURL(utilPath).href);
};

const seedAdminSession = () => {
  localStorage.setItem('token', 'admin-token');
  localStorage.setItem('refreshToken', 'admin-refresh');
  localStorage.setItem('tokenTimestamp', '111');
  localStorage.setItem('user', JSON.stringify({ id: '7', role: 'admin', username: 'sean.admin' }));
};

describe('admin impersonation browser session', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('starts a target session while preserving the current admin return session', async () => {
    const { startAdminImpersonationSession, getAdminImpersonationState } = await loadUtils();
    seedAdminSession();

    startAdminImpersonationSession({
      token: 'target-token',
      user: { id: '42', role: 'client', username: 'casey.client', firstName: 'Casey', lastName: 'Client' },
      impersonation: { actorId: '7', actorRole: 'admin', targetUserId: '42', targetRole: 'client', expiresIn: '45m' },
    });

    expect(localStorage.getItem('token')).toBe('target-token');
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(JSON.parse(localStorage.getItem('user') || '{}')).toMatchObject({ id: '42', role: 'client' });
    expect(getAdminImpersonationState()).toMatchObject({
      admin: { token: 'admin-token', refreshToken: 'admin-refresh', user: { id: '7', role: 'admin' } },
      target: { userId: '42', role: 'client', displayName: 'Casey Client' },
    });
  });

  it('rejects malformed or mismatched impersonation responses before swapping tokens', async () => {
    const { startAdminImpersonationSession } = await loadUtils();
    seedAdminSession();

    expect(() => startAdminImpersonationSession({
      token: 'target-token',
      user: { id: '1', role: 'admin' as any },
      impersonation: { actorId: '7', actorRole: 'admin', targetUserId: '1', targetRole: 'client' },
    })).toThrow('unsupported role');

    expect(() => startAdminImpersonationSession({
      token: 'target-token',
      user: { id: '42', role: 'client' },
      impersonation: { actorId: '8', actorRole: 'admin', targetUserId: '42', targetRole: 'client' },
    })).toThrow('active admin session');

    expect(localStorage.getItem('token')).toBe('admin-token');
    expect(localStorage.getItem('refreshToken')).toBe('admin-refresh');
  });

  it('restores the saved admin session and clears impersonation state', async () => {
    const { startAdminImpersonationSession, restoreAdminSessionFromImpersonation, getAdminImpersonationState } = await loadUtils();
    seedAdminSession();

    startAdminImpersonationSession({
      token: 'target-token',
      user: { id: '99', role: 'trainer', username: 'taylor.trainer' },
      impersonation: { actorId: '7', actorRole: 'admin', targetUserId: '99', targetRole: 'trainer', expiresIn: '45m' },
    }, '/dashboard/admin/client-management');

    const restored = restoreAdminSessionFromImpersonation();

    expect(restored).toMatchObject({ redirectPath: '/dashboard/admin/client-management' });
    expect(localStorage.getItem('token')).toBe('admin-token');
    expect(localStorage.getItem('refreshToken')).toBe('admin-refresh');
    expect(JSON.parse(localStorage.getItem('user') || '{}')).toMatchObject({ id: '7', role: 'admin' });
    expect(getAdminImpersonationState()).toBeNull();
  });

  it('sanitizes stored return paths and invalid stored roles before restore', async () => {
    const { ADMIN_IMPERSONATION_STORAGE_KEY, getAdminImpersonationState, restoreAdminSessionFromImpersonation } = await loadUtils();

    localStorage.setItem(ADMIN_IMPERSONATION_STORAGE_KEY, JSON.stringify({
      admin: { token: 'admin-token', refreshToken: null, user: { id: '7', role: 'admin' }, tokenTimestamp: null },
      target: { userId: '42', role: 'client', displayName: 'Casey Client' },
      startedAt: '2026-06-23T00:00:00.000Z',
      returnPath: 'https://example.com/phish',
    }));

    expect(getAdminImpersonationState()).toMatchObject({ returnPath: '/dashboard/admin/overview' });
    expect(restoreAdminSessionFromImpersonation()).toMatchObject({ redirectPath: '/dashboard/admin/overview' });

    localStorage.setItem(ADMIN_IMPERSONATION_STORAGE_KEY, JSON.stringify({
      admin: { token: 'admin-token', refreshToken: null, user: { id: '7', role: 'admin' }, tokenTimestamp: null },
      target: { userId: '1', role: 'admin', displayName: 'Root' },
      startedAt: '2026-06-23T00:00:00.000Z',
      returnPath: '/dashboard/admin/overview',
    }));

    expect(getAdminImpersonationState()).toBeNull();
  });

  it.each([
    ['trainer', '/dashboard/trainer/overview'],
    ['client', '/user-dashboard'],
    ['user', '/user-dashboard'],
  ])('routes %s impersonation to the correct live surface', async (role, expectedPath) => {
    const { getDashboardPathForImpersonatedRole } = await loadUtils();
    expect(getDashboardPathForImpersonatedRole(role)).toBe(expectedPath);
  });
});