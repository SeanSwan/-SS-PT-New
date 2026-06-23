/**
 * Admin account command service tests.
 * Locks destructive account controls behind owner-admin auth and append-only audit.
 */
import { describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';

import {
  AdminAccountCommandError,
  blockAccount,
  deactivateAccount,
  forceLogoutAccount,
  listAccountCommandTargets,
  reactivateAccount,
} from '../../services/admin/adminAccountCommandService.mjs';

const owner = { id: 1, role: 'admin', email: 'owner@swanstudios.local' };
const ownerEnv = { OWNER_ADMIN_EMAILS: 'owner@swanstudios.local' };

function makeUser(overrides = {}) {
  const user = {
    id: 44,
    role: 'client',
    email: 'client@example.com',
    isActive: true,
    isLocked: false,
    refreshTokenHash: 'hashed-refresh',
    accountDeactivatedAt: null,
    accountRetentionUntil: null,
    ...overrides,
    updates: [],
    async update(payload, options) {
      this.updates.push({ payload, options });
      Object.assign(this, payload);
      return this;
    },
  };
  return user;
}

function makeModels(target, { auditThrows = false } = {}) {
  const calls = { audits: [], transactions: [] };
  return {
    calls,
    UserModel: {
      async findByPk(id, options) {
        calls.findByPk = { id, options };
        return target;
      },
    },
    AuditModel: {
      async create(payload, options) {
        calls.audits.push({ payload, options });
        if (auditThrows) throw new Error('audit unavailable');
        return payload;
      },
    },
    sequelize: {
      async transaction(callback) {
        const transaction = { id: 'tx-1' };
        calls.transactions.push(transaction);
        return callback(transaction);
      },
    },
  };
}

describe('adminAccountCommandService', () => {
  it('rejects generic admins that are not on the owner allowlist', async () => {
    const target = makeUser();
    const models = makeModels(target);

    await expect(blockAccount({
      actor: { id: 2, role: 'admin', email: 'helper@example.com' },
      targetUserId: target.id,
      reason: 'security test',
      env: ownerEnv,
      ...models,
    })).rejects.toMatchObject({ code: 'OWNER_GATE_DENIED' });
  });

  it('blocks a non-admin account, clears refresh token, and audits the state change', async () => {
    const target = makeUser();
    const models = makeModels(target);

    const result = await blockAccount({
      actor: owner,
      targetUserId: target.id,
      reason: 'compromised account',
      env: ownerEnv,
      ...models,
    });

    expect(result.account).toMatchObject({ id: 44, isLocked: true, isActive: true });
    expect(target.refreshTokenHash).toBeNull();
    expect(models.calls.audits[0].payload).toMatchObject({
      actorUserId: 1,
      targetUserId: 44,
      action: 'account_block',
      reason: 'compromised account',
    });
    expect(models.calls.audits[0].payload.previousState.refreshTokenPresent).toBe(true);
    expect(models.calls.audits[0].payload.nextState.refreshTokenPresent).toBe(false);
  });

  it('deactivates a target account and records the deactivation timestamp', async () => {
    const now = new Date('2026-06-23T19:00:00.000Z');
    const target = makeUser();
    const models = makeModels(target);

    await deactivateAccount({
      actor: owner,
      targetUserId: target.id,
      reason: 'client requested closure',
      env: ownerEnv,
      now: () => now,
      ...models,
    });

    expect(target.isActive).toBe(false);
    expect(target.isLocked).toBe(true);
    expect(target.refreshTokenHash).toBeNull();
    expect(target.accountDeactivatedAt).toBe(now);
    expect(models.calls.audits[0].payload.action).toBe('account_deactivate');
  });

  it('reactivates a deactivated account and clears lock/deactivation fields', async () => {
    const target = makeUser({
      isActive: false,
      isLocked: true,
      accountDeactivatedAt: new Date('2026-06-01T00:00:00.000Z'),
      accountRetentionUntil: new Date('2026-12-01T00:00:00.000Z'),
    });
    const models = makeModels(target);

    await reactivateAccount({
      actor: owner,
      targetUserId: target.id,
      reason: 'account restored',
      env: ownerEnv,
      ...models,
    });

    expect(target).toMatchObject({
      isActive: true,
      isLocked: false,
      accountDeactivatedAt: null,
      accountRetentionUntil: null,
    });
    expect(models.calls.audits[0].payload.action).toBe('account_reactivate');
  });

  it('force-logout clears only refresh tokens and audits the command', async () => {
    const target = makeUser();
    const models = makeModels(target);

    await forceLogoutAccount({
      actor: owner,
      targetUserId: target.id,
      reason: 'QA session reset',
      env: ownerEnv,
      ...models,
    });

    expect(target.refreshTokenHash).toBeNull();
    expect(target.isActive).toBe(true);
    expect(target.isLocked).toBe(false);
    expect(models.calls.audits[0].payload.action).toBe('force_logout');
  });

  it('denies self-targeting and admin targets', async () => {
    await expect(blockAccount({
      actor: owner,
      targetUserId: owner.id,
      reason: 'bad idea',
      env: ownerEnv,
      ...makeModels(makeUser({ id: owner.id })),
    })).rejects.toMatchObject({ code: 'ACCOUNT_COMMAND_SELF_TARGET' });

    await expect(blockAccount({
      actor: owner,
      targetUserId: 7,
      reason: 'admin target',
      env: ownerEnv,
      ...makeModels(makeUser({ id: 7, role: 'admin' })),
    })).rejects.toMatchObject({ code: 'ACCOUNT_COMMAND_ADMIN_TARGET' });
  });

  it('rolls back through the transaction when audit logging fails', async () => {
    const target = makeUser();
    const models = makeModels(target, { auditThrows: true });
    const updateSpy = vi.spyOn(target, 'update');

    await expect(blockAccount({
      actor: owner,
      targetUserId: target.id,
      reason: 'audit must persist',
      env: ownerEnv,
      ...models,
    })).rejects.toBeInstanceOf(AdminAccountCommandError);

    expect(updateSpy).toHaveBeenCalled();
    expect(models.calls.transactions).toHaveLength(1);
  });

  it('escapes wildcard search terms in the owner command target query', async () => {
    const UserModel = { findAll: vi.fn().mockResolvedValue([]) };

    await listAccountCommandTargets({
      actor: owner,
      query: { role: 'client', search: '%_\\' },
      env: ownerEnv,
      UserModel,
    });

    const where = UserModel.findAll.mock.calls[0][0].where;
    const firstNamePattern = where[Op.or][0].firstName[Op.iLike];
    expect(firstNamePattern).toBe('%\\%\\_\\\\%');
  });

  it('lists owner-gated command targets with inactive and locked state visible', async () => {
    const targetRows = [
      makeUser({ id: 44, firstName: 'Active', lastName: 'Client', username: 'active.client', email: 'active@example.test' }),
      makeUser({ id: 45, firstName: 'Locked', lastName: 'Client', username: 'locked.client', isLocked: true }),
      makeUser({ id: 46, firstName: 'Former', lastName: 'Client', username: 'former.client', isActive: false }),
    ];
    const UserModel = {
      findAll: vi.fn().mockResolvedValue(targetRows),
    };

    const result = await listAccountCommandTargets({
      actor: owner,
      query: { role: 'all', status: 'all', search: 'client', limit: '500' },
      env: ownerEnv,
      UserModel,
    });

    const query = UserModel.findAll.mock.calls[0][0];
    expect(query.limit).toBe(75);
    expect(query.attributes).not.toContain('password');
    expect(query.attributes).not.toContain('refreshTokenHash');
    expect(JSON.stringify(query.where)).not.toContain('admin');
    expect(result.targets).toEqual([
      expect.objectContaining({ id: 44, displayName: 'Active Client', canImpersonate: true }),
      expect.objectContaining({ id: 45, displayName: 'Locked Client', isLocked: true, canImpersonate: false }),
      expect.objectContaining({ id: 46, displayName: 'Former Client', isActive: false, canImpersonate: false }),
    ]);
    expect(result.targets[0]).not.toHaveProperty('refreshTokenHash');
  });
});
