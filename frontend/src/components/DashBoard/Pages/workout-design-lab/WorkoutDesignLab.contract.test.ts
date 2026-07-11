import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (name: string) => readFileSync(resolve(__dirname, name), 'utf8');

describe('Workout Design Lab contract', () => {
  it('offers eight concepts split between Swan and wild directions', () => {
    const concepts = read('./workoutDesignConcepts.ts');
    expect(concepts.match(/id: '/g)).toHaveLength(8);
    expect(concepts.match(/family: 'swan'/g)).toHaveLength(4);
    expect(concepts.match(/family: 'wild'/g)).toHaveLength(4);
  });

  it('mounts the lab in the System navigation section', () => {
    const components = read('../../UniversalDashboardLayout.routeComponents.tsx');
    const routes = read('../../UniversalDashboardLayout.routes.tsx');
    const tabs = read('../../../../config/dashboard-tabs.ts');
    expect(components).toContain("export const WorkoutDesignLabPage = React.lazy(() => import('./Pages/workout-design-lab/WorkoutDesignLabPage'))");
    expect(routes).toContain("path: '/workout-design-lab', component: WorkoutDesignLabPage");
    expect(tabs).toContain("prefix: '/dashboard/admin/workout-design-lab'");
  });

  it('keeps the prototypes read-only and grounded in the shared Rolodex contract', () => {
    const page = read('./WorkoutDesignLabPage.tsx');
    expect(page).toContain('Prototype only — no client data is written');
    expect(page).toContain('/api/exercises/library');
    expect(page).toContain('Review & log session');
  });
});
