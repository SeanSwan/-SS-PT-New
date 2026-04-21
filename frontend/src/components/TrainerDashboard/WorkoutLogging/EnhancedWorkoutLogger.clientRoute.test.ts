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

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const SOURCE = stripComments(RAW_SOURCE);

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
    expect(SOURCE).toMatch(/user\?\.role\s*===\s*['"]admin['"]/);
    expect(SOURCE).toMatch(/\/dashboard\/admin\/client-management/);
    expect(SOURCE).toMatch(/\/dashboard\/trainer\/clients/);
  });

  it('does not hard-code /dashboard/trainer/clients as the sole navigation target', () => {
    // Before Phase 17, three navigate() calls hard-coded /dashboard/trainer/clients.
    // After Phase 17, navigations go through backToClientsPath.
    const hardCodedTrainerNavs = SOURCE.match(/navigate\(\s*['"]\/dashboard\/trainer\/clients['"]/g) ?? [];
    expect(hardCodedTrainerNavs.length).toBe(0);
  });

  // ── Phase 17.1 locks ────────────────────────────────────────────────
  // Codex's follow-up review caught that successful /info loads were
  // still routing real users through stale demo placeholders + a
  // hard-coded "Back to Demo" nav button. These locks prevent a future
  // edit from regressing to those behaviors.

  it('Phase 17.1: /info success auto-mounts the real WorkoutLogger (setUseOriginalLogger(true))', () => {
    expect(SOURCE).toMatch(/setUseOriginalLogger\(\s*true\s*\)/);
  });

  it('Phase 17.1: useOriginalLogger branch back button is role-aware for real clients, "Back to Demo" only for demo fallback', () => {
    // Locks the ternary: isDemoFallback ? "Back to Demo" : backToClientsLabel
    expect(SOURCE).toMatch(/isDemoFallback\s*\?\s*['"]Back to Demo['"]\s*:\s*backToClientsLabel/);
  });

  it('Phase 17.1: the stale "Workout Logger Ready / Start Demo Workout" placeholder block is gone', () => {
    // After Phase 17.1, real-client auto-mount makes this branch unreachable.
    // Removing the copy prevents admins/trainers from ever seeing demo-branded
    // placeholder text after a successful client load.
    expect(SOURCE).not.toMatch(/Workout Logger Ready/);
    expect(SOURCE).not.toMatch(/Start Demo Workout/);
  });
});
