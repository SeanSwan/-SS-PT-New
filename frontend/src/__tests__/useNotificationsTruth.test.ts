import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const hookPath = join(__dirname, '..', 'hooks', 'useNotifications.ts');
const centerPath = join(__dirname, '..', 'hooks', 'useNotificationCenter.ts');

describe('useNotifications production truth contract', () => {
  it('delegates to the shared notification center without demo data or direct API drift', () => {
    const source = readFileSync(hookPath, 'utf8');
    const centerSource = readFileSync(centerPath, 'utf8');
    const combinedSource = `${source}\n${centerSource}`;

    expect(combinedSource).not.toMatch(/mockNotifications/);
    expect(combinedSource).not.toMatch(/demo purposes/i);
    expect(combinedSource).not.toMatch(/Simulate real-time notifications/i);
    expect(combinedSource).not.toMatch(/Math\.random/);
    expect(combinedSource).not.toMatch(/setTimeout/);
    expect(combinedSource).not.toMatch(/setInterval/);
    expect(centerSource).toContain('/api/notifications');
    expect(source).toContain('useNotificationCenter({ fetchOnMount: true');
    expect(source).not.toContain("apiService.get<NotificationsPayload>('/api/notifications')");
    expect(source).not.toContain('apiService.patch');
  });
});
