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
});
