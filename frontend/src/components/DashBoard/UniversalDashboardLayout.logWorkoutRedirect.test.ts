import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const layoutSource = readFileSync(resolve(__dirname, './UniversalDashboardLayout.tsx'), 'utf8');

describe('UniversalDashboardLayout admin /log-workout merge into Clients & Team', () => {
  it('defines an admin log-workout redirect into the canonical Clients & Team hub logger', () => {
    expect(layoutSource).toContain('const AdminLogWorkoutRedirect');
    // Preserves incoming deep-link query and targets the hub training -> logger section
    expect(layoutSource).toContain("params.set('tab', 'training')");
    expect(layoutSource).toContain("params.set('trainingSection', 'logger')");
    expect(layoutSource).toContain('/dashboard/admin/client-management?${params.toString()}');
  });

  it('points the admin /log-workout route at the redirect, not the standalone logger', () => {
    expect(layoutSource).toContain(
      "path: '/log-workout', component: AdminLogWorkoutRedirect",
    );
  });

  it('leaves the trainer and client loggers intact (admin merge must not touch other roles)', () => {
    // Trainer keeps EnhancedWorkoutLogger; client keeps WorkoutLogger.
    expect(layoutSource).toContain(
      "path: '/log-workout', component: EnhancedWorkoutLogger",
    );
    expect(layoutSource).toContain("path: '/log-workout', component: WorkoutLogger");
  });
});
