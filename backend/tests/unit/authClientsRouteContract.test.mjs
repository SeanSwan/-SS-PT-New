import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'routes/userManagementRoutes.mjs'), 'utf8');

describe('/api/auth/clients route contract', () => {
  it('returns clientSource with admin client rows so planner/export surfaces can honor source policy', () => {
    expect(source).toContain("router.get('/clients'");
    expect(source).toContain("'availableSessions'");
    expect(source).toContain("'clientSource'");
    expect(source).toContain("'canGenerateWorkoutPlans'");
  });
});
