/**
 * ============================================================================
 * FILE: userTimeZoneSchema.test.mjs
 * PURPOSE: Lock the persisted client IANA timezone and account-default marker.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { describe, expect, it, vi } from 'vitest';

const migration = await import('../../migrations/20260715013000-add-user-time-zone.cjs');
const Sequelize = {
  STRING: vi.fn((length) => ({ key: 'STRING', options: { length } })),
  BOOLEAN: { key: 'BOOLEAN' },
};

const buildQueryInterface = () => {
  const transaction = { id: 'user-time-zone-migration' };
  return {
    transaction,
    queryInterface: {
      describeTable: vi.fn(async () => ({ id: {}, role: {} })),
      addColumn: vi.fn(async () => undefined),
      changeColumn: vi.fn(async () => undefined),
      removeColumn: vi.fn(async () => undefined),
      sequelize: {
        query: vi.fn(async () => undefined),
        transaction: vi.fn(async (callback) => callback(transaction)),
      },
    },
  };
};

describe('User timezone schema', () => {
  it('defines a validated account-default timezone and configured marker', async () => {
    const { default: User } = await import('../../models/User.mjs');
    const attributes = User.getAttributes();

    expect(attributes.timeZone.type.options.length).toBe(64);
    expect(attributes.timeZone.allowNull).toBe(false);
    expect(attributes.timeZone.defaultValue).toBe('America/Los_Angeles');
    expect(attributes.timeZoneConfigured.type.key).toBe('BOOLEAN');
    expect(attributes.timeZoneConfigured.defaultValue).toBe(false);
    expect(() => attributes.timeZone.validate.isIanaTimeZone('America/New_York')).not.toThrow();
    expect(() => attributes.timeZone.validate.isIanaTimeZone('Not/A_TimeZone')).toThrow();
  });

  it('adds both fields, backfills the account default, then enforces non-null', async () => {
    const { queryInterface, transaction } = buildQueryInterface();

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      'Users',
      'timeZone',
      expect.objectContaining({ allowNull: true }),
      { transaction },
    );
    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      'Users',
      'timeZoneConfigured',
      expect.objectContaining({ allowNull: false, defaultValue: false }),
      { transaction },
    );
    const backfillSql = queryInterface.sequelize.query.mock.calls[0][0];
    expect(backfillSql).toContain('UPDATE "Users"');
    expect(backfillSql).toContain('"timeZone"');
    expect(queryInterface.changeColumn).toHaveBeenCalledWith(
      'Users',
      'timeZone',
      expect.objectContaining({
        allowNull: false,
        defaultValue: 'America/Los_Angeles',
      }),
      { transaction },
    );
  });

  it('removes only the two additive timezone fields on rollback', async () => {
    const { queryInterface, transaction } = buildQueryInterface();
    queryInterface.describeTable.mockResolvedValue({
      id: {},
      timeZone: {},
      timeZoneConfigured: {},
    });

    await migration.down(queryInterface);

    expect(queryInterface.removeColumn).toHaveBeenNthCalledWith(
      1,
      'Users',
      'timeZoneConfigured',
      { transaction },
    );
    expect(queryInterface.removeColumn).toHaveBeenNthCalledWith(
      2,
      'Users',
      'timeZone',
      { transaction },
    );
  });
});