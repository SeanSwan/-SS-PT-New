/**
 * ============================================================================
 * FILE: trainingPlanTimeZoneWiring.test.mjs
 * PURPOSE: Lock timezone truth across mounted reads, writes, profile, and CORS.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path) => readFileSync(resolve(repoRoot, path), 'utf8');

describe('training plan timezone wiring', () => {
  it('routes client and staff current-plan reads through one date resolver', () => {
    const clientRoutes = read('backend/routes/clientWorkoutRoutes.mjs');
    const planRoutes = read('backend/routes/workoutPlanRoutes.mjs');

    expect(clientRoutes).toContain('resolveClientTrainingDateContext');
    expect(clientRoutes).toContain('trainingDateContext');
    expect(planRoutes).toContain('resolveClientTrainingDateContext');
    expect(planRoutes).toContain("getModel('User')");
    expect(planRoutes).toContain('trainingDateContext');
  });

  it('uses the same client-local date in manual and AI assignment verification', () => {
    const manualRoute = read('backend/routes/dailyWorkoutFormRoutes.mjs');
    const aiService = read('backend/services/workout/aiWorkoutPlannedAssignmentService.mjs');
    const aiCaller = read('backend/services/workout/aiWorkoutDailyFormService.mjs');

    expect(manualRoute).toContain('resolveClientTrainingDateContext');
    expect(manualRoute).toContain('storedTimeZone: clientTimeZone');
    expect(aiService).toContain('resolveClientTrainingDateContext');
    expect(aiCaller).toContain('clientTimeZone: client.timeZone');
    expect(aiCaller).toContain('clientTimeZoneConfigured: client.timeZoneConfigured');
    expect(manualRoute).toContain('workoutDateIso > trainingDateContext.localDate');
    expect(aiCaller).toContain('workoutDateIso > trainingDateContext.localDate');
    expect(manualRoute.match(/const today = trainingDateContext.localDate/g)?.length || 0).toBeGreaterThanOrEqual(2);
  });

  it('allows only validated timezone profile updates and marks them configured', () => {
    const profile = read('backend/controllers/profileController.mjs');

    expect(profile).toContain('normalizeClientTimeZoneUpdate');
    expect(profile.match(/'timeZone'/g)?.length || 0).toBeGreaterThanOrEqual(2);
    expect(profile.match(/timeZoneConfigured = true/g)?.length || 0).toBeGreaterThanOrEqual(2);
  });

  it('sends the browser timezone and permits the header through every CORS layer', () => {
    const apiFactory = read('frontend/src/services/apiClientFactory.ts');
    const cors = read('backend/core/app.mjs');

    expect(apiFactory).toContain("config.headers['X-Client-Timezone']");
    expect(cors.match(/X-Client-Timezone/g)?.length || 0).toBeGreaterThanOrEqual(3);
  });
});