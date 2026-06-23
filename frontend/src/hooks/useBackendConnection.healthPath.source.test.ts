import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sourcePath = resolve(dirname(fileURLToPath(import.meta.url)), 'useBackendConnection.tsx');
const source = readFileSync(sourcePath, 'utf8');

describe('useBackendConnection health path', () => {
  it('checks the API health endpoint that production static hosting forwards to the backend', () => {
    expect(source).toContain("const HEALTH_CHECK_PATH = '/api/health';");
    expect(source).toContain('apiInstance.get(HEALTH_CHECK_PATH)');
    expect(source).toContain('handleApiError(error, HEALTH_CHECK_PATH)');
    expect(source).not.toContain("apiInstance.get('/health')");
    expect(source).not.toContain("handleApiError(error, '/health')");
  });
});