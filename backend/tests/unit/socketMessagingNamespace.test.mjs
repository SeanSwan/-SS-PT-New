import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOCKET_SRC = readFileSync(resolve(process.cwd(), 'socket/socket.mjs'), 'utf8');
const STARTUP_SRC = readFileSync(resolve(process.cwd(), 'core/startup.mjs'), 'utf8');

describe('messaging socket namespace source contract', () => {
  it('uses the primary socket manager instead of creating a second server', () => {
    expect(SOCKET_SRC).toMatch(/getManagedSocketIO\(\)/);
    expect(SOCKET_SRC).toMatch(/managedIO\.of\(['"]\/messaging['"]\)/);
    expect(SOCKET_SRC).not.toMatch(/new\s+Server\(/);
  });

  it('queries the canonical Users table with quoted casing', () => {
    expect(SOCKET_SRC).toMatch(/FROM\s+"Users"/);
    expect(SOCKET_SRC).not.toMatch(/FROM\s+users\b/);
  });

  it('initializes the primary socket manager before server.mjs adds messaging handlers', () => {
    expect(STARTUP_SRC).toMatch(/initSocketIO\(httpServer\)/);
  });
});
