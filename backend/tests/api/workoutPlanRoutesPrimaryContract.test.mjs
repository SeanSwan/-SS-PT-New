import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const routeSource = readFileSync(resolve(__dirname, '../../routes/workoutPlanRoutes.mjs'), 'utf8');
const primaryRouteStart = routeSource.indexOf("router.put('/:id/primary'");
const primaryRouteEnd = routeSource.indexOf('const lockClientPlanRows', primaryRouteStart);
const primaryRouteSource = routeSource.slice(primaryRouteStart, primaryRouteEnd);

describe('workout plan primary arc route contract', () => {
  it('rejects draft or paused plans instead of marking them primary but invisible to clients', () => {
    expect(primaryRouteStart).toBeGreaterThan(-1);
    expect(primaryRouteEnd).toBeGreaterThan(primaryRouteStart);
    expect(primaryRouteSource).toContain("primaryStatus !== 'active'");
    expect(primaryRouteSource).toContain('Use the activate endpoint');
    expect(primaryRouteSource.indexOf("primaryStatus !== 'active'")).toBeLessThan(
      primaryRouteSource.indexOf('const siblings'),
    );
  });
});