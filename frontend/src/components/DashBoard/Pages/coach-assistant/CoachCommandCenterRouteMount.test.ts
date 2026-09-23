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

const surfacePath = resolve(dirname(fileURLToPath(import.meta.url)), '../coach-workspace/CoachSurfaceRoute.tsx');

describe('Coach Command Center route mounts', () => {
  // RE-ANCHORED (brain-v4): /coach-assistant now mounts CoachSurfaceRoute, which
  // renders the v4 workspace by default and this command center behind the flag.
  // The intent of the original assertion — the client route never falls back to
  // the retired SwanCoachAssistantPage — is kept, for every role.
  for (const role of ['client', 'trainer', 'admin'] as const) {
    it(`mounts the ${role} Coach route on the shared surface switch, never the retired assistant page`, () => {
      const coachRoute = routeBlockFor(role).match(/\{ path: '\/coach-assistant'[^}]+}/)?.[0] || '';
      expect(coachRoute).toContain('component: CoachSurfaceRoute');
      expect(coachRoute).not.toContain('SwanCoachAssistantPage');
    });
  }

  it('the surface switch can only render the v4 workspace or this command center', () => {
    const source = readFileSync(surfacePath, 'utf8');
    expect(source).toContain("import('./CoachWorkspacePage')");
    expect(source).toContain("import('../coach-assistant/CoachCommandCenterPage')");
    expect(source).not.toContain('SwanCoachAssistantPage');
  });
});
