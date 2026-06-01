import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const source = readFileSync(resolve(__dirname, './BillingSessionsCard.tsx'), 'utf8');
const serviceSource = readFileSync(resolve(__dirname, '../../../../../services/adminClientService.ts'), 'utf8');

describe('BillingSessionsCard client source policy', () => {
  it('self-defends against paid-credit actions for free-tracking clients', () => {
    expect(serviceSource).toContain('clientSource?: ClientSource;');
    expect(source).toContain('isNonDeductingClientSource');
    expect(source).toContain('const isNonDeductingClient = isNonDeductingClientSource(data?.client?.clientSource);');
    expect(source).toContain('Workout Logger Tracking');
    expect(source).toContain('{!isNonDeductingClient && (');
    expect(source).toContain('disabled={isNonDeductingClient || !data?.sessionsRemaining || data.sessionsRemaining === 0}');
  });
});
