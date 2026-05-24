import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = readFileSync(resolve(process.cwd(), 'src/hooks/useSocket.ts'), 'utf8');

describe('useSocket messaging namespace contract', () => {
  it('connects real-time messaging clients to the messaging namespace', () => {
    expect(SOURCE).toContain('`${getSocketUrl()}/messaging`');
  });

  it('normalizes trailing slashes before appending the namespace', () => {
    expect(SOURCE).toContain("replace(/\\/$/, '')");
  });

  it('prefers the explicit socket origin before API base fallbacks', () => {
    expect(SOURCE).toContain('import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_BACKEND_URL');
    expect(SOURCE.indexOf('VITE_SOCKET_URL')).toBeLessThan(SOURCE.indexOf('VITE_API_BASE_URL'));
  });
});
