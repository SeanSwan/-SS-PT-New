import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Op } from 'sequelize';
const servicePath = resolve(__dirname, '../../services/auth/adminImpersonationService.mjs');

const loadService = async () => {
  expect(existsSync(servicePath), 'admin impersonation service must exist').toBe(true);
  return import(`${pathToFileURL(servicePath).href}?case=${Date.now()}-${Math.random()}`);
};

const makeUser = (overrides = {}) => ({
  id: 42,
  firstName: 'Casey',
  lastName: 'Client',
  username: 'casey.client',
  email: 'casey@example.com',
  role: 'client',
  photo: '/avatar.jpg',
  isActive: true,
  isLocked: false,
  accountStatus: 'active',
  subscriptionTier: 'premium',
  toJSON() {
    const { toJSON, ...data } = this;
    return data;
  },
  ...overrides,
});

const adminActor = { id: 7, role: 'admin', email: 'owner@swanstudios.local' };
const ownerEnv = { OWNER_ADMIN_EMAILS: 'owner@swanstudios.local' };
const fakeAuditModel = () => ({ create: vi.fn().mockResolvedValue({ id: 1 }) });

describe('admin impersonation service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists only active non-admin targets with a sanitized payload', async () => {
    const { listAdminImpersonationTargets } = await loadService();
    const fakeUserModel = {
      findAll: vi.fn().mockResolvedValue([
        makeUser({ id: 12, role: 'client' }),
        makeUser({ id: 13, role: 'trainer', firstName: 'Taylor', lastName: 'Trainer' }),
      ]),
    };

    const result = await listAdminImpersonationTargets({
      actor: adminActor,
      query: { role: 'all', search: 'tay', limit: '75' },
      UserModel: fakeUserModel,
      env: ownerEnv,
    });

    expect(fakeUserModel.findAll).toHaveBeenCalledTimes(1);
    const call = fakeUserModel.findAll.mock.calls[0][0];
    expect(call.limit).toBe(50);
    expect(call.attributes).not.toContain('password');
    expect(call.attributes).not.toContain('refreshTokenHash');
    expect(JSON.stringify(call.where)).not.toContain('admin');
    expect(result.targets).toEqual([
      expect.objectContaining({ id: 12, role: 'client', displayName: 'Casey Client' }),
      expect.objectContaining({ id: 13, role: 'trainer', displayName: 'Taylor Trainer' }),
    ]);
    expect(result.targets[0]).not.toHaveProperty('password');
    expect(result.targets[0]).not.toHaveProperty('refreshTokenHash');
  });

  it('escapes wildcard search terms before building the target query', async () => {
    const { listAdminImpersonationTargets } = await loadService();
    const fakeUserModel = { findAll: vi.fn().mockResolvedValue([]) };

    await listAdminImpersonationTargets({
      actor: adminActor,
      query: { role: 'client', search: '%_\\' },
      UserModel: fakeUserModel,
      env: ownerEnv,
    });

    const where = fakeUserModel.findAll.mock.calls[0][0].where;
    const firstNamePattern = where[Op.or][0].firstName[Op.iLike];
    expect(firstNamePattern).toBe('%\\%\\_\\\\%');
  });

  it('rejects invalid role filters instead of silently widening to every account type', async () => {
    const { listAdminImpersonationTargets } = await loadService();
    const fakeUserModel = { findAll: vi.fn() };

    await expect(listAdminImpersonationTargets({
      actor: adminActor,
      query: { role: 'admin' },
      UserModel: fakeUserModel,
      env: ownerEnv,
    })).rejects.toMatchObject({ statusCode: 400, code: 'IMPERSONATION_INVALID_ROLE' });

    await expect(listAdminImpersonationTargets({
      actor: adminActor,
      query: { role: ['client', 'trainer'] },
      UserModel: fakeUserModel,
      env: ownerEnv,
    })).rejects.toMatchObject({ statusCode: 400, code: 'IMPERSONATION_INVALID_ROLE' });

    expect(fakeUserModel.findAll).not.toHaveBeenCalled();
  });

  it('rejects non-admin actors before reading targets', async () => {
    const { listAdminImpersonationTargets } = await loadService();
    const fakeUserModel = { findAll: vi.fn() };

    await expect(listAdminImpersonationTargets({
      actor: { id: 8, role: 'trainer' },
      UserModel: fakeUserModel,
    })).rejects.toMatchObject({ statusCode: 403, code: 'IMPERSONATION_ADMIN_ONLY' });

    expect(fakeUserModel.findAll).not.toHaveBeenCalled();
  });

  it('rejects generic admins that are not owner allowlisted before reading targets', async () => {
    const { listAdminImpersonationTargets } = await loadService();
    const fakeUserModel = { findAll: vi.fn() };

    await expect(listAdminImpersonationTargets({
      actor: { id: 8, role: 'admin', email: 'helper@example.com' },
      env: ownerEnv,
      UserModel: fakeUserModel,
    })).rejects.toMatchObject({ statusCode: 403, code: 'IMPERSONATION_OWNER_REQUIRED' });

    expect(fakeUserModel.findAll).not.toHaveBeenCalled();
  });

  it('mints an impersonation access token for active client, trainer, and user targets without a refresh token', async () => {
    const { startAdminImpersonationSession } = await loadService();
    const signJwt = vi.fn().mockReturnValue('signed-target-token');

    for (const role of ['client', 'trainer', 'user']) {
      const fakeUserModel = {
        findByPk: vi.fn().mockResolvedValue(makeUser({ id: 42, role })),
      };
      const AuditModel = fakeAuditModel();

      const result = await startAdminImpersonationSession({
        actor: adminActor,
        targetUserId: '42',
        UserModel: fakeUserModel,
        AuditModel,
        env: ownerEnv,
        signJwt,
        getSecret: () => 'jwt-secret',
        tokenIdFactory: () => `tid-${role}`,
        expiresIn: '45m',
      });

      expect(fakeUserModel.findByPk).toHaveBeenCalledWith(42, expect.objectContaining({
        attributes: expect.arrayContaining(['id', 'role', 'isActive', 'isLocked', 'accountStatus']),
      }));
      expect(fakeUserModel.findByPk.mock.calls[0][1].attributes).not.toContain('password');
      expect(fakeUserModel.findByPk.mock.calls[0][1].attributes).not.toContain('refreshTokenHash');
      expect(result).toMatchObject({
        success: true,
        token: 'signed-target-token',
        user: { id: 42, role },
        impersonation: {
          actorId: '7',
          actorRole: 'admin',
          targetUserId: '42',
          targetRole: role,
          expiresIn: '45m',
        },
      });
      expect(result).not.toHaveProperty('refreshToken');
      expect(AuditModel.create).toHaveBeenCalledWith(expect.objectContaining({
        actorUserId: 7,
        targetUserId: 42,
        action: 'impersonation_start',
        reason: 'Owner started account testing session.',
      }));
    }

    expect(signJwt).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 42,
        role: expect.any(String),
        tokenType: 'access',
        impersonation: true,
        impersonatedBy: '7',
        impersonationActorRole: 'admin',
      }),
      'jwt-secret',
      { expiresIn: '45m' }
    );
  });

  it.each([
    ['missing target id', 'abc', makeUser(), 400, 'IMPERSONATION_INVALID_TARGET'],
    ['inactive target', '42', makeUser({ isActive: false }), 404, 'IMPERSONATION_TARGET_NOT_FOUND'],
    ['invited target', '42', makeUser({ accountStatus: 'invited' }), 404, 'IMPERSONATION_TARGET_NOT_FOUND'],
    ['locked target', '42', makeUser({ isLocked: true }), 404, 'IMPERSONATION_TARGET_NOT_FOUND'],
    ['admin target', '42', makeUser({ role: 'admin' }), 400, 'IMPERSONATION_TARGET_INVALID_ROLE'],
  ])('rejects %s', async (_label, targetUserId, targetUser, statusCode, code) => {
    const { startAdminImpersonationSession } = await loadService();
    const fakeUserModel = {
      findByPk: vi.fn().mockResolvedValue(targetUser),
    };

    await expect(startAdminImpersonationSession({
      actor: adminActor,
      targetUserId,
      UserModel: fakeUserModel,
      AuditModel: fakeAuditModel(),
      env: ownerEnv,
      signJwt: vi.fn(),
    })).rejects.toMatchObject({ statusCode, code });
  });
});
