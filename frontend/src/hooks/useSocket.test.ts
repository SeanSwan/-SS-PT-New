import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = readFileSync(resolve(process.cwd(), 'src/hooks/useSocket.ts'), 'utf8');
const RESOLVER_SOURCE = readFileSync(resolve(process.cwd(), 'src/utils/realtimeSocketUrl.ts'), 'utf8');

describe('useSocket messaging namespace contract', () => {
  it('connects real-time messaging clients to the messaging namespace', () => {
    expect(SOURCE).toContain('`${getSocketUrl()}/messaging`');
  });

  it('normalizes trailing slashes before appending the namespace', () => {
    expect(RESOLVER_SOURCE).toContain("replace(/\\/$/, '')");
  });

  it('prefers the explicit socket origin before API base fallbacks', () => {
    expect(SOURCE).toContain("import { resolveRealtimeSocketUrl } from '@/utils/realtimeSocketUrl'");
    expect(SOURCE).toContain('resolveRealtimeSocketUrl()');
    expect(RESOLVER_SOURCE.indexOf('VITE_SOCKET_URL')).toBeLessThan(RESOLVER_SOURCE.indexOf('VITE_BACKEND_URL'));
    expect(RESOLVER_SOURCE.indexOf('VITE_BACKEND_URL')).toBeLessThan(RESOLVER_SOURCE.indexOf('VITE_API_BASE_URL'));
  });
});
