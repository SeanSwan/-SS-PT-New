/**
 * clientResolverAccess.test.mjs
 * =============================
 * Access-control and log-safety coverage for the command-lane client resolver.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const { default: logger } = await import('../../utils/logger.mjs');
const { resolveClient } = await import('../../services/ai/clientResolver.mjs');

function fakeSequelize(handler) {
  const calls = [];
  return {
    calls,
    async query(sql, options = {}) {
      calls.push({ sql, options });
      return handler(sql, options);
    },
  };
}

describe('clientResolver access and log safety', () => {
  it('scopes direct id lookup to active trainer assignments', async () => {
    const db = fakeSequelize(() => []);

    const result = await resolveClient('#42', db, { trainerId: 7 });

    expect(result).toMatchObject({
      resolved: null,
      suggestions: [],
      error: 'No accessible active client found with that ID.',
    });
    expect(db.calls[0].sql).toContain('client_trainer_assignments');
    expect(db.calls[0].sql).toContain('"isActive" = true');
    expect(db.calls[0].options.replacements).toMatchObject({ id: 42, trainerId: 7 });
  });

  it('does not log raw client references when fuzzy lookup is truncated', async () => {
    const clients = Array.from({ length: 50 }, (_entry, index) => ({
      id: index + 1,
      firstName: `Client${index}`,
      lastName: 'Roster',
      email: `client${index}@example.test`,
      isActive: true,
      version: 1,
    }));
    const db = fakeSequelize((sql) => (sql.includes('FROM "Users"') ? clients : []));

    await resolveClient('Marcus Private Gym Client', db, { trainerId: 7 });

    expect(db.calls[0].sql).toContain('client_trainer_assignments');
    expect(db.calls[0].options.replacements).toMatchObject({ trainerId: 7 });
    expect(logger.warn).toHaveBeenCalled();
    expect(vi.mocked(logger.warn).mock.calls[0]?.[1]).toMatchObject({ trainerId: 7, refLength: 25 });
    expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toMatch(/Marcus|Private|Gym/i);
  });
});
