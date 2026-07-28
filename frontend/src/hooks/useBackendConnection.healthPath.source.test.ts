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

  it('keeps production health polling simple and resilient to one transient closed connection', () => {
    expect(source).toContain('const TRANSIENT_HEALTH_FAILURE_LIMIT = 2;');
    expect(source).toContain('const retryCountRef = useRef(0);');
    expect(source).toContain('const consecutiveHealthFailuresRef = useRef(0);');
    expect(source).toContain("Accept: 'application/json'");
    expect(source).not.toContain("'Content-Type': 'application/json'");
    expect(source).toContain('Transient backend health check failed');
    expect(source).toContain('failureCount < TRANSIENT_HEALTH_FAILURE_LIMIT');
    expect(source).toContain('consecutiveHealthFailuresRef.current = 0;');
  });
});
