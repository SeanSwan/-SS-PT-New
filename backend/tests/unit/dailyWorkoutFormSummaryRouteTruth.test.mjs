/**
 * dailyWorkoutFormRoutes summary truth locks
 * ==========================================
 *
 * GET /api/workout-forms/:id/summary is a mounted workout-form sibling route.
 * Its auto-generated summary must average only rated sets across the whole
 * workout; unrated exercises are missing data, not zero-RPE exercises.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dailyWorkoutFormRoutes from '../../routes/dailyWorkoutFormRoutes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROUTE_SOURCE = readFileSync(
  resolve(__dirname, '../../routes/dailyWorkoutFormRoutes.mjs'),
  'utf8',
);

function findLayer(method, path) {
  return dailyWorkoutFormRoutes.stack.find(
    (layer) =>
      layer.route &&
      layer.route.path === path &&
      layer.route.methods &&
      layer.route.methods[method.toLowerCase()],
  );
}

function summaryRouteSlice() {
  const start = ROUTE_SOURCE.indexOf("router.get('/:id/summary'");
  expect(start).toBeGreaterThan(0);
  return ROUTE_SOURCE.slice(start);
}

describe('dailyWorkoutFormRoutes summary route', () => {
  it('mounts GET /:id/summary under the workout-forms router', () => {
    expect(findLayer('get', '/:id/summary')).toBeTruthy();
  });

  it('averages rated sets flat across the workout, not per exercise with zero fillers', () => {
    const slice = summaryRouteSlice();

    expect(slice).toMatch(/allRpes\s*=\s*exercises[\s\S]{0,220}\.flatMap/);
    expect(slice).toMatch(/avgRpe\s*=\s*allRpes\.length\s*>\s*0[\s\S]{0,160}:\s*null/);
    expect(slice).toMatch(/allRpes\.reduce\([\s\S]*?\)\s*\/\s*allRpes\.length/);
    expect(slice).not.toMatch(/rpes\.reduce\([\s\S]{0,120}\/\s*Math\.max\(rpes\.length,\s*1\)/);
    expect(slice).not.toMatch(/\/\s*Math\.max\(exercises\.length,\s*1\)/);
  });

  it('omits the RPE summary line and returns stats.avgRpe null when no RPE was rated', () => {
    const slice = summaryRouteSlice();

    expect(slice).toMatch(/avgRpe\s*!==\s*null[\s\S]{0,120}Average intensity \(RPE\)/);
    expect(slice).toMatch(/avgRpe:\s*avgRpe\s*!==\s*null\s*\?\s*Math\.round\(avgRpe \* 10\) \/ 10\s*:\s*null/);
  });
});
