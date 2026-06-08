import { describe, expect, it } from 'vitest';

import { normalizeProtectedPlanPdfUrl } from './workoutPlanPdfUrl';

describe('workoutPlanPdfUrl', () => {
  it('normalizes only authenticated workout-plan PDF proxy paths', () => {
    expect(normalizeProtectedPlanPdfUrl('/api/workout-plans/plan-6m/pdf/content.pdf'))
      .toBe('/api/workout-plans/plan-6m/pdf/content.pdf');

    expect(normalizeProtectedPlanPdfUrl('/uploads/workout-plans/42/plan.pdf')).toBeNull();
    expect(normalizeProtectedPlanPdfUrl('https://cdn.swanstudios.com/plans/plan.pdf')).toBeNull();
    expect(normalizeProtectedPlanPdfUrl('/api/workout-plans/plan-6m/pdf/content.pdf?download=1')).toBeNull();
    expect(normalizeProtectedPlanPdfUrl('/api/workout-plans/plan-6m/pdf/content.pdf#page=2')).toBeNull();
    expect(normalizeProtectedPlanPdfUrl('//swanstudios.com/api/workout-plans/plan/pdf/content.pdf')).toBeNull();
    expect(normalizeProtectedPlanPdfUrl('/api/workout-plans/plan-6m/pdf/content.pdf\r\nSet-Cookie: leak=1')).toBeNull();
    expect(normalizeProtectedPlanPdfUrl(null)).toBeNull();
  });
});
