/**
 * Launch audit lane 5 (2026-08-03) — trainer dashboard.
 *
 * REGRESSION: GET /api/workout-forms/:id/summary loaded the form with a bare
 * `findByPk(req.params.id)` under `protect, trainerOrAdminOnly`. Any trainer
 * could read another trainer's `trainerNotes`, `clientSummary` and the full
 * exercise/volume/RPE breakdown for any client by guessing a form id — while
 * the sibling `GET /:id` already pinned trainers to their own forms.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const routeSource = readFileSync(
  resolve(__dirname, '../../routes/dailyWorkoutFormRoutes.mjs'),
  'utf8',
);

const summaryRoute = (() => {
  const start = routeSource.indexOf("router.get('/:id/summary'");
  expect(start).toBeGreaterThan(-1);
  const next = routeSource.indexOf('router.', start + 10);
  return routeSource.slice(start, next === -1 ? routeSource.length : next);
})();

describe('GET /api/workout-forms/:id/summary trainer scoping', () => {
  it('scopes trainers to their own forms', () => {
    expect(summaryRoute).toContain("if (req.user.role === 'trainer')");
    expect(summaryRoute).toContain('whereCondition.trainerId = req.user.id;');
    expect(summaryRoute).toContain('DailyWorkoutForm.findOne({ where: whereCondition })');
  });

  it('no longer loads any form by primary key alone', () => {
    expect(summaryRoute).not.toContain('DailyWorkoutForm.findByPk(req.params.id)');
  });

  it('applies the scope before reading trainerNotes off the record', () => {
    const scopeIndex = summaryRoute.indexOf('whereCondition.trainerId');
    // Anchor on the destructure statement, not the bare word — prose in the
    // route comment mentions trainerNotes and would satisfy a loose match.
    const readIndex = summaryRoute.indexOf('const { formData, trainerNotes');
    expect(scopeIndex).toBeGreaterThan(-1);
    expect(readIndex).toBeGreaterThan(scopeIndex);
  });

  it('keeps the sibling GET /:id scoping it was modeled on', () => {
    expect(routeSource).toContain("if (requestingUserRole === 'trainer') {");
    expect(routeSource).toContain('whereCondition.trainerId = requestingUserId;');
  });
});
