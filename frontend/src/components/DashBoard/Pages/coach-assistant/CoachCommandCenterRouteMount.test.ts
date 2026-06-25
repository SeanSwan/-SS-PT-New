import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const layoutPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../UniversalDashboardLayout.routes.tsx',
);

function routeBlockFor(role: 'client' | 'trainer' | 'admin'): string {
  const source = readFileSync(layoutPath, 'utf8').replace(/\r\n/g, '\n');
  const roleMarker = `  ${role}: {\n    routes: [`;
  const start = source.indexOf(roleMarker);
  expect(start).toBeGreaterThan(0);
  const endMarker = role === 'client' ? '\n  },\n};' : role === 'admin' ? '\n  },\n  trainer:' : '\n  },\n  client:';
  const end = source.indexOf(endMarker, start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('Coach Command Center route mounts', () => {
  it('mounts the client Coach route on the client-safe command center shell', () => {
    const clientRoutes = routeBlockFor('client');
    const coachRoute = clientRoutes.match(/\{ path: '\/coach-assistant'[^}]+}/)?.[0] || '';

    expect(coachRoute).toContain('component: CoachCommandCenterPage');
    expect(coachRoute).not.toContain('SwanCoachAssistantPage');
  });
});
