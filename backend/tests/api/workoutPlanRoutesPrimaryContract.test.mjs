import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const routeSource = readFileSync(resolve(__dirname, '../../routes/workoutPlanRoutes.mjs'), 'utf8');
const primaryRouteStart = routeSource.indexOf("  '/:id/primary',");
const primaryRouteEnd = routeSource.indexOf(');', primaryRouteStart);
const primaryRouteSource = routeSource.slice(primaryRouteStart, primaryRouteEnd);

describe('workout plan primary arc route contract', () => {
  it('treats legacy primary as audited activation with status as sole authority', () => {
    expect(primaryRouteStart).toBeGreaterThan(-1);
    expect(primaryRouteEnd).toBeGreaterThan(primaryRouteStart);
    expect(primaryRouteSource).toContain('workoutPlanActivateHandler');
    expect(primaryRouteSource).not.toContain('isPrimaryPlan');
    expect(primaryRouteSource).not.toContain('metadata.primary');
  });
});