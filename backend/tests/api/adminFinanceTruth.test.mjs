import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('admin finance truth contract', () => {
  it('does not synthesize payment method breakdown from fixed percentages', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/admin/adminFinanceRoutes.mjs'), 'utf8');

    expect(source).not.toContain('transactionCount * 0.85');
    expect(source).not.toContain('transactionCount * 0.12');
    expect(source).not.toContain('transactionCount * 0.03');
    expect(source).toContain("source: 'not_tracked'");
  });

  it('does not decorate admin finance trainer rows with fake profile metrics', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/admin/adminFinanceRoutes.mjs'), 'utf8');

    expect(source).not.toContain("certifications: ['NASM-CPT']");
    expect(source).not.toContain('rating: 4.5');
    expect(source).not.toContain("location: 'Studio'");
    expect(source).toContain("verificationSource: 'not_tracked'");
  });

  it('does not expose raw finance route errors to admin clients', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/admin/adminFinanceRoutes.mjs'), 'utf8');

    expect(source).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(source).toContain('function sendInternalError(res, message)');
    expect(source).not.toContain("process.env.NODE_ENV === 'development' ? error.message");
    expect(source).not.toContain('error: error.message');
  });

  it('validates active finance queries before model access', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/admin/adminFinanceRoutes.mjs'), 'utf8');

    expect(source).toContain("router.get('/overview', validateTimeRangeQuery");
    expect(source).toContain("router.get('/transactions', validateTransactionsQuery");
    expect(source).toContain("router.get('/metrics', validateTimeRangeQuery");
    expect(source).toContain("router.get('/notifications', validateNotificationsQuery");
    expect(source).toContain("router.get('/export', validateExportQuery");
    expect(source).toContain("query('sortBy').optional().isIn(TRANSACTION_SORT_FIELDS)");
    expect(source).toContain("query('limit').optional().isInt({ min: 1, max: 100 })");
  });

  it('makes finance exports honor the dashboard time range', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/admin/adminFinanceRoutes.mjs'), 'utf8');

    expect(source).toContain("const { format = 'json', startDate, endDate, type = 'transactions', timeRange } = req.query");
    expect(source).toContain("query('timeRange').optional().isIn(TIME_RANGES)");
    expect(source).toContain('[Op.gte]: getTimeRangeStart(timeRange)');
    expect(source).toContain('dateRange: { startDate, endDate, timeRange }');
  });
});
