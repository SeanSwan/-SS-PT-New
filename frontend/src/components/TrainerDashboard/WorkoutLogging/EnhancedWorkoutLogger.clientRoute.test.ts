/**
 * Phase 17 (2026-04-20) — EnhancedWorkoutLogger source-text route lock
 * ====================================================================
 * Before Phase 17 the admin/trainer `/dashboard/{role}/log-workout`
 * surface hit `/api/client-trainer-assignments/client/:id`, which is
 * `adminOnly` at the backend and silently 403'd for trainer accounts.
 * The logger then fell back to demo mode (demoClient) and no real
 * workout could be logged against the target client.
 *
 * The Phase 17 fix (commit Phase 17 runtime) swaps the URL to the
 * Codex-approved Option 2 endpoint `/api/workout-forms/client/:id/info`,
 * which is `trainerOrAdminOnly` and matches the canonical pathway
 * already used by `WorkoutLogger.tsx` + `EnhancedClientProgressView.tsx`.
 *
 * This test is a **source-text lock**, mirroring the pattern in
 * `WorkoutLogger.clientRoute.test.ts`. It does not mount the 900-line
 * component or exercise its hook stack. It reads the component source
 * on disk and asserts the specific regression-class pattern: the new
 * endpoint must be present and the old one must not.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RAW_SOURCE = readFileSync(
  resolve(__dirname, './EnhancedWorkoutLogger.tsx'),
  'utf8',
);
const RAW_LOGIC_SOURCE = readFileSync(
  resolve(__dirname, './EnhancedWorkoutLogger.logic.ts'),
  'utf8',
);
const RAW_VIEW_SOURCE = readFileSync(
  resolve(__dirname, './EnhancedWorkoutLogger.view.tsx'),
  'utf8',
);

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const SOURCE = stripComments(RAW_SOURCE);
const LOGIC_SOURCE = stripComments(RAW_LOGIC_SOURCE);
const VIEW_SOURCE = stripComments(RAW_VIEW_SOURCE);
const SURFACE_SOURCE = `${SOURCE}\n${VIEW_SOURCE}`;

describe('EnhancedWorkoutLogger source-text route lock (Phase 17)', () => {
  it('calls the canonical /api/workout-forms/client/:clientId/info endpoint', () => {
    expect(SOURCE).toMatch(/authAxios\.get\(\s*`\/api\/workout-forms\/client\/\$\{clientId\}\/info`/);
  });

  it('does NOT call the retired adminOnly /api/client-trainer-assignments/client/:id endpoint', () => {
    // This endpoint 403'd for trainer accounts and silently dropped the
    // logger into demo mode. Phase 17 removed it.
    expect(SOURCE).not.toMatch(/\/api\/client-trainer-assignments\/client\//);
  });

  it('derives backToClientsPath from user.role (role-aware navigation)', () => {
    expect(SOURCE).toMatch(/buildLoggerRouteContext\(\{/);
    expect(SOURCE).toMatch(/userRole:\s*user\?\.role/);
    expect(LOGIC_SOURCE).toMatch(/userRole\s*===\s*['"]admin['"]/);
    expect(LOGIC_SOURCE).toMatch(/\/dashboard\/admin\/client-management/);
    expect(LOGIC_SOURCE).toMatch(/\/dashboard\/trainer\/clients/);
  });

  it('does not hard-code /dashboard/trainer/clients as the sole navigation target', () => {
    // Before Phase 17, three navigate() calls hard-coded /dashboard/trainer/clients.
    // After Phase 17, navigations go through backToClientsPath.
    const hardCodedTrainerNavs = SOURCE.match(/navigate\(\s*['"]\/dashboard\/trainer\/clients['"]/g) ?? [];
    expect(hardCodedTrainerNavs.length).toBe(0);
  });

  it('honors any dashboard-local returnTo after validation', () => {
    expect(SOURCE).toMatch(
      /import\s*\{[\s\S]*buildLoggerRouteContext[\s\S]*normalizeDashboardReturnTo[\s\S]*parseLoggerClientId[\s\S]*parseLoggerSessionId[\s\S]*\}\s*from '\.\/EnhancedWorkoutLogger\.logic'/
    );
    expect(LOGIC_SOURCE).toMatch(/export const normalizeDashboardReturnTo =/);
    expect(LOGIC_SOURCE).toMatch(/value\.startsWith\('\/dashboard\/'\)/);
    expect(RAW_LOGIC_SOURCE).toMatch(/value\.startsWith\('\/\/'\)/);
    expect(SOURCE).toMatch(/const requestedReturnTo = normalizeDashboardReturnTo\(searchParams\.get\('returnTo'\)\)/);
    expect(LOGIC_SOURCE).toMatch(/workflowReturnPath: requestedReturnTo \?\? backToClientsPath/);
    expect(SOURCE).toMatch(/navigate\(workflowReturnPath/);
  });

  it('uses source only for contextual back-button copy, not for returnTo authorization', () => {
    expect(SOURCE).toMatch(/source:\s*searchParams\.get\('source'\)/);
    expect(LOGIC_SOURCE).toMatch(/'master-schedule': 'Back to Schedule'/);
    expect(LOGIC_SOURCE).toMatch(/'clients-team': 'Back to Client Hub'/);
    expect(LOGIC_SOURCE).toMatch(/getSourceReturnLabel\(requestedReturnTo, source\) \?\? getDefaultBackLabel/);
  });

  it('passes master-schedule sessionId into the real WorkoutLogger', () => {
    expect(LOGIC_SOURCE).toMatch(/export const parseLoggerSessionId =/);
    expect(LOGIC_SOURCE).toMatch(/export const parseLoggerSessionDate =/);
    expect(SOURCE).toMatch(/const scheduledSessionId = parseLoggerSessionId\(searchParams\.get\('sessionId'\)\)/);
    expect(SOURCE).toMatch(/const scheduledSessionDate = parseLoggerSessionDate\(searchParams\.get\('sessionDate'\)\)/);
    expect(SURFACE_SOURCE).toMatch(/scheduledSessionId=\{scheduledSessionId\}/);
    expect(SURFACE_SOURCE).toMatch(/scheduledSessionDate=\{scheduledSessionDate\}/);
  });

  it('passes a strictly parsed numeric client id into WorkoutLogger', () => {
    expect(LOGIC_SOURCE).toMatch(/export const parseLoggerClientId =/);
    expect(SOURCE).toMatch(/const routeClientId = parseLoggerClientId\(urlClientId\)/);
    expect(SOURCE).toMatch(/const activeClientId = parseLoggerClientId\(activeClient\?\.id\)/);
    expect(SURFACE_SOURCE).not.toMatch(/clientId=\{parseInt\(client\.id\)/);
    expect(SURFACE_SOURCE).toMatch(/clientId=\{client\.id\}/);
  });

  it('uses completion copy that is truthful for deducted and non-deducted clients', () => {
    expect(SOURCE).not.toMatch(/Session deducted and progress updated/);
    expect(SOURCE).not.toMatch(/Will Deduct/);
    expect(SOURCE).not.toMatch(/In real use, this would deduct a session/);
    expect(SOURCE).not.toMatch(/handleWorkoutComplete\(\{\}\)/);
    expect(SOURCE).toMatch(/buildLoggerCompletionResult\(\{/);
    expect(SOURCE).toMatch(/toast\(completion\.toast\)/);
    expect(SOURCE).toMatch(/state:\s*completion\.navigationState/);
    expect(LOGIC_SOURCE).toMatch(/Workout saved and progress updated/);
    expect(SOURCE).toMatch(/Client workout data could not be loaded/);
  });

  // ── Phase 17.1 locks ────────────────────────────────────────────────
  // Codex's follow-up review caught that successful /info loads were
  // still routing real users through stale demo placeholders + a
  // hard-coded "Back to Demo" nav button. These locks prevent a future
  // edit from regressing to those behaviors.

  it('Phase 17.1: /info success auto-mounts the real WorkoutLogger (setUseOriginalLogger(true))', () => {
    expect(SOURCE).toMatch(/setUseOriginalLogger\(\s*true\s*\)/);
  });

  it('API failure does not seed demo clients or enter demo mode', () => {
    expect(SOURCE).not.toMatch(/setClient\(\s*demoClient\s*\)/);
    expect(SOURCE).not.toMatch(/setShowDemo\(\s*true\s*\)/);
  });

  it('Phase 17.1: the stale "Workout Logger Ready / Start Demo Workout" placeholder block is gone', () => {
    // After Phase 17.1, real-client auto-mount makes this branch unreachable.
    // Removing the copy prevents admins/trainers from ever seeing demo-branded
    // placeholder text after a successful client load.
    expect(SOURCE).not.toMatch(/Workout Logger Ready/);
    expect(SOURCE).not.toMatch(/Start Demo Workout/);
  });

  it('removes the dead demo workout branch from the real-client logger surface', () => {
    expect(SOURCE).not.toMatch(/const demoExercises/);
    expect(SOURCE).not.toMatch(/const demoClient/);
    expect(SOURCE).not.toMatch(/showDemo/);
    expect(SOURCE).not.toMatch(/Demo Mode/);
    expect(SOURCE).not.toMatch(/Complete Demo Workout/);
  });
});
