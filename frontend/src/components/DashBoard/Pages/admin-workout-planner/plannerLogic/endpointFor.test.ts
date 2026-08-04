import { describe, expect, it } from 'vitest';
import { endpointFor, plannerScopes } from './endpointFor';
describe('endpointFor', () => {
  it('maps each documented scope exactly', () => {
    expect(endpointFor('single')).toBe('/api/workout-builder/generate');
    expect(endpointFor('multi_week')).toBe('/api/workout-builder/plan');
  });
  it.each(plannerScopes)('is deterministic for %s', scope => expect(endpointFor(scope)).toBe(endpointFor(scope)));
});
