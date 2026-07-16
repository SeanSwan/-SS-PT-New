import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/AdminScheduleIntegration.tsx'),
  'utf8'
);

describe('AdminScheduleIntegration retry contract', () => {
  it('retries schedule initialization locally instead of reloading the page', () => {
    expect(SOURCE).not.toContain('window.location.reload()');
    expect(SOURCE).toContain('const [retryNonce, setRetryNonce]');
    expect(SOURCE).toContain('setRetryNonce(prevNonce => prevNonce + 1)');
    expect(SOURCE).toContain('}, [hasAdminPermissions, retryNonce]);');
  });
});
