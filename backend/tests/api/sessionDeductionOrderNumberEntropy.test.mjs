import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('session deduction recovery order number entropy', () => {
  it('uses the shared crypto order number helper for recovery orders', () => {
    const serviceSource = readFileSync(resolve(__dirname, '../../services/sessionDeductionService.mjs'), 'utf8');
    const helperSource = readFileSync(resolve(__dirname, '../../utils/orderNumber.mjs'), 'utf8');

    expect(serviceSource).toContain("from '../utils/orderNumber.mjs'");
    expect(serviceSource).toContain('generateRecoveryOrderNumber');
    expect(serviceSource).not.toContain('Math.random');
    expect(helperSource).toContain('generateRecoveryOrderNumber');
    expect(helperSource).toContain('randomBytes');
  });
});
