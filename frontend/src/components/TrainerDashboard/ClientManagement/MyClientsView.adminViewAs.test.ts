/**
 * Phase 18.A (2026-04-20) — MyClientsView admin-view-as source-text lock
 * =======================================================================
 * Locks the role-branched adapter so future edits cannot silently regress:
 *   - Admin-view-as path MUST go through `useGlobalClient().clientList`
 *     (no direct /api/client-trainer-assignments/trainer/${user.id} call
 *     for admin users).
 *   - Trainer path MUST remain on the existing assignment endpoint so
 *     real trainer accounts continue to see only their assigned clients.
 *   - Admin adapter MUST use deterministic progress fallbacks
 *     (overallProgress: 0, recentTrend: 'stable') per Codex ROUND 1.
 *   - Admin adapter MUST NOT use Math.random() for progress values.
 *
 * Source-text lock style (matches Phase 17.1 clientRoute.test.ts) avoids
 * pulling in MyClientsView's 1000-line render stack just to prove the
 * wiring. Behavior coverage for the banner lives in
 * ViewAsBanner.test.tsx.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RAW_SOURCE = readFileSync(
  resolve(__dirname, './MyClientsView.tsx'),
  'utf8',
);
const RAW_LOGIC_SOURCE = readFileSync(
  resolve(__dirname, './MyClientsView.logic.ts'),
  'utf8',
);
const RAW_HOOK_SOURCE = readFileSync(
  resolve(__dirname, './useTrainerClients.ts'),
  'utf8',
);

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const SOURCE = stripComments(RAW_SOURCE);
const LOGIC_SOURCE = stripComments(RAW_LOGIC_SOURCE);
const HOOK_SOURCE = stripComments(RAW_HOOK_SOURCE);

describe('MyClientsView — Phase 18.A admin-view-as source-text lock', () => {
  it('imports useGlobalClient', () => {
    expect(HOOK_SOURCE).toMatch(/import\s*\{[^}]*useGlobalClient[^}]*\}\s*from\s*['"][^'"]*context\/GlobalClientContext['"]/);
  });

  it('derives isAdminViewAs from user.role === "admin"', () => {
    expect(HOOK_SOURCE).toMatch(/isAdminViewAs\s*=\s*user\?\.role\s*===\s*['"]admin['"]/);
  });

  it('admin path maps clientList into ClientAssignment[] before the trainer endpoint is called', () => {
    // Admin branch must appear BEFORE the trainer-endpoint authAxios.get in loadClients.
    const adminBranchIdx = HOOK_SOURCE.search(/if\s*\(\s*isAdminViewAs\s*\)/);
    const trainerCallIdx = HOOK_SOURCE.search(/authAxios\.get\(\s*`\/api\/client-trainer-assignments\/trainer\/\$\{user\.id\}`/);

    expect(adminBranchIdx).toBeGreaterThan(-1);
    expect(trainerCallIdx).toBeGreaterThan(-1);
    expect(adminBranchIdx).toBeLessThan(trainerCallIdx);
  });

  it('admin path reads clientList (from useGlobalClient) and calls .map() on it', () => {
    // The adapter must iterate the global client list — not fetch trainer assignments.
    expect(HOOK_SOURCE).toMatch(/clientList\s+as\s+AdminClient\[\]/);
    expect(HOOK_SOURCE).toMatch(/\.map\(adaptAdminClient\)/);
  });

  it('admin adapter uses deterministic progress defaults (overallProgress: 0, recentTrend: "stable")', () => {
    // Both literals must appear — they are Codex ROUND 1 non-negotiables for the admin path.
    expect(HOOK_SOURCE).toMatch(/overallProgress:\s*0/);
    expect(HOOK_SOURCE).toMatch(/recentTrend:\s*['"]stable['"]/);
  });

  it('admin adapter preserves workout proof from the global admin client list', () => {
    expect(HOOK_SOURCE).toMatch(/totalSessionsCompleted:\s*client\.totalWorkouts\s*\?\?\s*0/);
    expect(HOOK_SOURCE).toMatch(/lastSessionDate:\s*client\.lastWorkoutDate/);
    expect(HOOK_SOURCE).toMatch(/nextSessionDate:\s*client\.nextSessionDate/);
  });

  it('does not invent randomized progress values for real clients', () => {
    const randomMatches = `${SOURCE}\n${HOOK_SOURCE}`.match(/Math\.random\(\)/g) ?? [];
    expect(randomMatches).toEqual([]);
  });

  it('does not seed fake trainer goals while waiting for a real goals API', () => {
    expect(`${SOURCE}\n${HOOK_SOURCE}`).not.toMatch(/current:\s*3/);
    expect(`${SOURCE}\n${HOOK_SOURCE}`).not.toMatch(/completed:\s*8/);
  });

  it('trainer endpoint call is still present for real trainer accounts', () => {
    // Regression guard: the existing trainer endpoint must not be accidentally
    // removed. Real trainer users still depend on it.
    expect(HOOK_SOURCE).toMatch(/authAxios\.get\(\s*`\/api\/client-trainer-assignments\/trainer\/\$\{user\.id\}`/);
  });

  it('plan quick action routes to the canonical trainer workout planner instead of a coming-soon toast', () => {
    expect(SOURCE).toMatch(/navigate\(\s*`\/dashboard\/trainer\/workout-planner\?clientId=\$\{clientId\}&source=my-clients`\s*\)/);
    expect(SOURCE).not.toMatch(/Client messaging system is in development/);
  });

  it('supports the trainer client-pick intent for sidebar Log Workout routing', () => {
    expect(SOURCE).toMatch(/useSearchParams\(\)/);
    expect(LOGIC_SOURCE).toMatch(/intent\s*===\s*['"]log_workout['"]/);
    expect(SOURCE).toMatch(/handleOpenClient/);
    expect(SOURCE).toMatch(/handleLogWorkout\(clientId\)/);
  });

  it('trainer Log Workout routing auto-loads today assigned plan', () => {
    expect(SOURCE).toMatch(/\/dashboard\/trainer\/log-workout\?clientId=\$\{clientId\}&loadPlan=today/);
  });

  it('loadClients useCallback deps include the admin-view-as inputs', () => {
    // The deps array must include the three new admin-path dependencies so
    // stale closures don't re-use a prior clientList after role/context changes.
    expect(HOOK_SOURCE).toMatch(/\}, \[[^\]]*isAdminViewAs[^\]]*\]\)/);
    expect(HOOK_SOURCE).toMatch(/\}, \[[^\]]*clientList[^\]]*\]\)/);
    expect(HOOK_SOURCE).toMatch(/\}, \[[^\]]*loadingGlobalClients[^\]]*\]\)/);
  });

  it('admin adapter builds pseudo-assignment IDs prefixed with admin-viewas-', () => {
    // Namespace pseudo-assignment IDs so they are distinguishable from real
    // ClientTrainerAssignment row IDs during debugging.
    expect(HOOK_SOURCE).toMatch(/admin-viewas-/);
  });

  it('admin adapter preserves clientSource so Move Fitness clients do not appear as paid session debt', () => {
    expect(HOOK_SOURCE).toMatch(/clientSource:\s*client\.clientSource/);
  });
});
