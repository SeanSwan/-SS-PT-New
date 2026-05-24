import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const servicePath = join(__dirname, '..', 'services', 'enhanced-progress-analytics-service.ts');

describe('enhanced progress analytics truth contract', () => {
  it('does not fabricate analytics, goals, mutations, or predictions on API failure', () => {
    const source = readFileSync(servicePath, 'utf8');

    expect(source).not.toMatch(/getMock/i);
    expect(source).not.toMatch(/Return .*mock/i);
    expect(source).not.toMatch(/Simulate successful/i);
    expect(source).not.toMatch(/goal-\$\{Date\.now\(\)\}/);
    expect(source).not.toMatch(/goalCompletionPredictions:\s*\{\}/);
    expect(source).toContain('throwServiceError');
  });
});
