import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const hookPath = join(__dirname, '..', 'hooks', 'useNotifications.ts');

describe('useNotifications production truth contract', () => {
  it('does not seed mock notifications or random demo events', () => {
    const source = readFileSync(hookPath, 'utf8');

    expect(source).not.toMatch(/mockNotifications/);
    expect(source).not.toMatch(/demo purposes/i);
    expect(source).not.toMatch(/Simulate real-time notifications/i);
    expect(source).not.toMatch(/Math\.random/);
    expect(source).not.toMatch(/setTimeout/);
    expect(source).not.toMatch(/setInterval/);
    expect(source).toContain("'/api/notifications'");
  });
});
