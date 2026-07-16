/**
 * ============================================================================
 * FILE: trainingPlanProjectionMount.test.mjs
 * PURPOSE: Lock the literal route mount and fail-closed deployment flags.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8')
  .replace(/\r\n/g, '\n');

describe('training plan projection production mount', () => {
  it('mounts one distinct top-level route before appointment routes', () => {
    const routes = read('backend/core/routes.mjs');
    const projectionMount = "app.use('/api/training-plan-projections', trainingPlanProjectionRoutes);";
    const sessionMount = "app.use('/api/sessions', sessionsRoutes);";

    expect(routes).toContain("import trainingPlanProjectionRoutes from '../routes/trainingPlanProjectionRoutes.mjs';");
    expect(routes.match(/app\.use\('\/api\/training-plan-projections'/g)).toHaveLength(1);
    expect(routes.indexOf(projectionMount)).toBeGreaterThan(0);
    expect(routes.indexOf(projectionMount)).toBeLessThan(routes.indexOf(sessionMount));
  });

  it('documents local flags as off and enables both production halves explicitly', () => {
    const envExample = read('.env.example');
    const render = read('render.yaml');

    expect(envExample).toContain('TRAINING_PLAN_SCHEDULE_PROJECTIONS=false');
    expect(envExample).toContain('VITE_TRAINING_PLAN_SCHEDULE_PROJECTIONS=false');
    expect(render).toContain('- key: TRAINING_PLAN_SCHEDULE_PROJECTIONS\n        value: true');
    expect(render.match(/- key: VITE_TRAINING_PLAN_SCHEDULE_PROJECTIONS\n\s+value: true/g))
      .toHaveLength(2);
  });
});
