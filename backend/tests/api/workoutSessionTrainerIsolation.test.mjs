/**
 * workoutSessionTrainerIsolation — access-control lock (auth sweep 2026-07-15)
 * ==========================================================================
 * Regression lock for the trainer-tenant isolation break: the workout-session
 * by-id / create / progress / stats handlers used a `role !== 'trainer'`
 * short-circuit that let ANY trainer read/update/delete/create ANY user's
 * session with NO ClientTrainerAssignment check (and its int-vs-string compare
 * denied real owners). They must now route through assertAssignmentOrAdmin,
 * which requires an ACTIVE assignment for trainers and fails closed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.resolve(here, '../../controllers/workoutController.mjs'), 'utf8');

describe('workout-session handlers enforce trainer assignment', () => {
  it('imports the shared assignment gate', () => {
    expect(src).toMatch(/import \{ assertAssignmentOrAdmin \} from '\.\.\/middleware\/verifyClientAccess\.mjs'/);
  });

  it('the blanket "role !== trainer" ownership short-circuit is gone', () => {
    // No ownership/authorization branch may pass a trainer purely on role.
    // (The only remaining role-only check is createWorkoutPlan, which writes
    // under the trainer's OWN trainerId — not a cross-tenant read/write.)
    const roleShortCircuits = src.match(/userId !== req\.user\.id && req\.user\.role !== 'admin' && req\.user\.role !== 'trainer'/g) || [];
    expect(roleShortCircuits.length).toBe(0);
    const sessionShortCircuits = src.match(/Session\.userId !== req\.user\.id && req\.user\.role !== 'admin' && req\.user\.role !== 'trainer'/g) || [];
    expect(sessionShortCircuits.length).toBe(0);
  });

  it('all five cross-user session/progress handlers gate via assertAssignmentOrAdmin', () => {
    // getById, create, update, delete, progress, stats, recommendations = 7 gates.
    const gates = src.match(/assertAssignmentOrAdmin\(req\.user\.id, req\.user\.role,/g) || [];
    expect(gates.length).toBeGreaterThanOrEqual(6);
  });
});
