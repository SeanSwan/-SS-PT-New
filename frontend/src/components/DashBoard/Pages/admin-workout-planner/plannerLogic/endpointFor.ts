/** @since S14 — extracted pure logic. NOT WIRED until S15. */
export const plannerScopes = ['single', 'multi_week'] as const;
export type PlannerScope = typeof plannerScopes[number];
export type PlannerEndpoint = '/api/workout-builder/generate' | '/api/workout-builder/plan';
const endpoints = {
  single: '/api/workout-builder/generate',
  multi_week: '/api/workout-builder/plan',
} as const satisfies Record<PlannerScope, PlannerEndpoint>;
export const endpointFor = (scope: PlannerScope): PlannerEndpoint => {
  const endpoint = endpoints[scope];
  if (endpoint === undefined) throw new Error(`endpointFor: unmapped scope ${String(scope)}`);
  return endpoint;
};
