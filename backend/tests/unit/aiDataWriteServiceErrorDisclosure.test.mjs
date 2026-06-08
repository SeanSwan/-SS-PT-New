/**
 * AI data-write disclosure regression tests.
 *
 * Guards Swan Coach write results against raw exception text leaking back to
 * command/proposal callers when a database-backed write fails.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const logger = (await import('../../utils/logger.mjs')).default;
const { processAIDataUpdates } = await import('../../services/aiDataWriteService.mjs');

describe('aiDataWriteService error disclosure', () => {
  it('returns stable public failure details instead of raw writer exception text', async () => {
    const sequelize = {
      query: vi.fn(async () => {
        throw new Error('postgres://private-host/swan rejected sean@example.com');
      }),
      QueryTypes: { INSERT: 'INSERT' },
    };

    const result = await processAIDataUpdates(42, [{
      type: 'goal',
      data: { title: 'Confidential Strength Goal' },
    }], 7, sequelize);

    expect(result).toEqual({
      successful: 0,
      errors: [{
        type: 'goal',
        code: 'AI_DATA_WRITE_FAILED',
        message: 'Swan Coach could not apply that update. No data was changed.',
      }],
    });
    expect(JSON.stringify(result)).not.toContain('postgres://private-host');
    expect(JSON.stringify(result)).not.toContain('sean@example.com');
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('postgres://private-host');
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('sean@example.com');
  });
});
