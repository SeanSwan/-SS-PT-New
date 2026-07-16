/**
 * ============================================================================
 * FILE: workoutPlanUuidRouteContract.test.mjs
 * PURPOSE: Prevent numeric coercion of authoritative WorkoutPlan UUID keys.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Locks route and approved-edit callers to normalized UUID
 * plan identities so valid plans cannot become NaN or truncated integers.
 * HOW IT FITS IN THE APP: Browser/staff/Coach plan IDs -> UUID parser -> ORM.
 * KEY DECISIONS: Numeric legacy IDs fail closed; client user IDs stay integers.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { normalizeWorkoutPlanId } from '../../services/workoutPlanRouteHelpers.mjs';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (relativePath) => fs.readFileSync(path.join(backend, relativePath), 'utf8');
const PLAN_ID = '6ea7806d-36c8-4307-bd5d-6b04b68be849';

describe('WorkoutPlan UUID caller contract', () => {
  it('normalizes UUID keys and rejects numeric or malformed identities', () => {
    expect(normalizeWorkoutPlanId(`  ${PLAN_ID.toUpperCase()}  `)).toBe(PLAN_ID);
    expect(normalizeWorkoutPlanId('71')).toBeNull();
    expect(normalizeWorkoutPlanId('not-a-plan')).toBeNull();
  });

  it('keeps route and Coach callers away from numeric plan coercion', () => {
    const planRoutes = read('routes/workoutPlanRoutes.mjs');
    const clientRoutes = read('routes/clientWorkoutRoutes.mjs');
    const coachApproval = read('services/ai/coachPlanEditApprovalService.mjs');

    expect(planRoutes).not.toMatch(/parseInt\((?:req\.body\?\.(?:planAId|planBId)|planAId|planBId|req\.params\.id)/);
    expect(planRoutes).toContain('normalizeWorkoutPlanId');
    expect(clientRoutes).not.toContain('numericPlanId');
    expect(clientRoutes).toContain('normalizeWorkoutPlanId(req.params.planId)');
    expect(coachApproval).not.toContain('id: Number(payload.planId)');
    expect(coachApproval).toContain('id: planId');
  });
});