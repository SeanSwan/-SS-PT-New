import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { mapServiceError } from '../../routes/sessionDeductionRoute.helpers.mjs';
import { IDEMPOTENCY_INDEX_NAME } from '../../utils/paymentRecovery.constants.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const deductionRouteSource = readFileSync(
  resolve(__dirname, '../../routes/sessionDeductionRoutes.mjs'),
  'utf8'
);
const metricsRouteSource = readFileSync(
  resolve(__dirname, '../../routes/sessionMetricsRoutes.mjs'),
  'utf8'
);

describe('session billing error disclosure guards', () => {
  it('maps service errors to safe public messages without echoing raw server text', () => {
    const error = new Error('raw DB detail: client 42 missing stripe owner');
    error.code = 'CLIENT_NOT_FOUND';

    expect(mapServiceError(error)).toEqual({
      statusCode: 404,
      errorCode: 'CLIENT_NOT_FOUND',
      message: 'Client was not found.'
    });
  });

  it('maps idempotency constraint errors to a safe public duplicate message', () => {
    const error = {
      name: 'SequelizeUniqueConstraintError',
      message: 'idx_orders_idempotency_key duplicate raw database detail',
      original: { constraint: IDEMPOTENCY_INDEX_NAME },
      errors: []
    };

    expect(mapServiceError(error)).toEqual({
      statusCode: 409,
      errorCode: 'DUPLICATE_IDEMPOTENCY_KEY',
      message: 'This payment recovery request was already processed.'
    });
  });

  it('does not send raw service error messages through deduction responses', () => {
    expect(deductionRouteSource).not.toMatch(/mapped\.statusCode,\s*error\.message/);
    expect(deductionRouteSource).toContain('mapped.message');
  });

  it('does not send raw trainer metrics errors through public JSON responses', () => {
    expect(metricsRouteSource).not.toContain('message: error.message');
    expect(metricsRouteSource).not.toMatch(/res\.status\(\d+\)\.json\(\{[\s\S]*error: error\.message/);
    expect(metricsRouteSource).toContain('Trainer metrics are restricted to the assigned trainer or admin users.');
    expect(metricsRouteSource).toContain('Server error fetching trainer today sessions');
  });
});
