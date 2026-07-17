import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import User from '../../models/User.mjs';
import { TRAINER_LIST_ATTRIBUTES } from '../../routes/admin/adminFinanceRoutes.mjs';

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

  it('computes transaction summary from the full filtered result instead of the current page', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/admin/adminFinanceRoutes.mjs'), 'utf8');
    expect(source).toContain('const transactionSummary = await ShoppingCart.findOne({');
    expect(source).not.toContain('pendingPayments: transactions.filter');
  });

  it('counts each active customer once even when they have multiple completed carts', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/admin/adminFinanceRoutes.mjs'), 'utf8');
    expect(source).toContain('const activeCustomers = await User.count({');
    expect(source).toContain('distinct: true,');
    expect(source).toContain("col: 'User.id',");
  });

  // Regression: /trainers selected 'lastLoginAt', which the User model does not declare.
  // Sequelize emitted it as a raw column, Postgres threw 42703, and the route 500'd —
  // collapsing the whole admin Client-Trainer Assignments workspace.
  it('selects only real User attributes for the admin trainer list', () => {
    const declared = Object.keys(User.rawAttributes);
    const drifted = TRAINER_LIST_ATTRIBUTES.filter(attr => !declared.includes(attr));

    expect(drifted).toEqual([]);
  });

it('prefers activity, then login, then profile-update time for trainer lastActive', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/admin/adminFinanceRoutes.mjs'), 'utf8');
    expect(TRAINER_LIST_ATTRIBUTES).toEqual(expect.arrayContaining(['lastActive', 'lastLogin', 'updatedAt']));
    expect(source).toContain('lastActive: trainer.lastActive || trainer.lastLogin || trainer.updatedAt,');
  });
});
