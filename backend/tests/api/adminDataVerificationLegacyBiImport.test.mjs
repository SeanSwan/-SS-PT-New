import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const source = readFileSync(resolve(__dirname, '../../routes/adminDataVerificationRoutes.mjs'), 'utf8');

describe('admin data verification route imports', () => {
  it('does not initialize the legacy mock-heavy BI service on the verification route', () => {
    expect(source).not.toContain('BusinessIntelligenceService.mjs');
    expect(source).not.toContain('businessIntelligenceService');
    expect(source).toContain("from '../services/analytics/StripeAnalyticsService.mjs'");
  });

  it('keeps admin verification failures sanitized and time ranges strict', () => {
    expect(source).toContain("const INTERNAL_ERROR = 'internal_error'");
    expect(source).toContain('resolveTimeRangeDays');
    expect(source).toContain('timeRange must be one of: 7d, 30d');
    expect(source).not.toContain("process.env.NODE_ENV === 'development' ? error.message");
    expect(source).not.toContain("parseInt(timeRange.replace('d', ''))");
  });
});
