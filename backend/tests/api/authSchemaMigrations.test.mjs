import { describe, expect, it, vi } from 'vitest';
import identityMigrationModule from '../../migrations/20260729163000-create-auth-identities.cjs';
import magicMigrationModule from '../../migrations/20260729163100-create-magic-login-tokens.cjs';

const Sequelize = {
  INTEGER: 'INTEGER',
  DATE: 'DATE',
  STRING: (length) => `STRING(${length})`,
  fn: vi.fn((name) => ({ fn: name })),
};
const queryInterface = () => ({
  createTable: vi.fn().mockResolvedValue(undefined),
  addConstraint: vi.fn().mockResolvedValue(undefined),
  addIndex: vi.fn().mockResolvedValue(undefined),
  dropTable: vi.fn().mockResolvedValue(undefined),
});

describe('authentication schema migrations', () => {
  it('creates provider identities with immutable-subject and per-user/provider uniqueness', async () => {
    const qi = queryInterface();
    await identityMigrationModule.up(qi, Sequelize);
    expect(qi.createTable).toHaveBeenCalledWith('auth_identities', expect.objectContaining({
      userId: expect.objectContaining({ references: { model: 'Users', key: 'id' } }),
      providerSubject: expect.objectContaining({ allowNull: false }),
    }));
    expect(qi.addConstraint).toHaveBeenCalledWith('auth_identities', expect.objectContaining({
      fields: ['provider', 'providerSubject'], type: 'unique',
    }));
    expect(qi.addConstraint).toHaveBeenCalledWith('auth_identities', expect.objectContaining({
      fields: ['userId', 'provider'], type: 'unique',
    }));
  });

  it('creates hashed one-time login credentials without a raw-token column', async () => {
    const qi = queryInterface();
    await magicMigrationModule.up(qi, Sequelize);
    const [, columns] = qi.createTable.mock.calls[0];
    expect(qi.createTable).toHaveBeenCalledWith('magic_login_tokens', expect.any(Object));
    expect(columns).toHaveProperty('tokenHash');
    expect(columns).not.toHaveProperty('token');
    expect(columns).toHaveProperty('expiresAt');
    expect(columns).toHaveProperty('consumedAt');
    expect(qi.addIndex).toHaveBeenCalledWith('magic_login_tokens', ['userId'], expect.objectContaining({
      unique: true,
      where: { consumedAt: null },
    }));  });
});