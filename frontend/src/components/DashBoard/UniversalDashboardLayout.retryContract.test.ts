import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = readFileSync(resolve(__dirname, './UniversalDashboardLayout.tsx'), 'utf8');

describe('UniversalDashboardLayout retry contract', () => {
  it('retries dashboard initialization without a hard page reload', () => {
    expect(source).not.toContain('window.location.reload()');
    expect(source).toContain('const [retryInitNonce, setRetryInitNonce]');
    expect(source).toContain('handleRetryInitialization');
    expect(source).toContain('setRetryInitNonce(prev => prev + 1)');
    expect(source).toContain('}, [user, userRole, dispatch, isValidRole, retryInitNonce]);');
  });
});
