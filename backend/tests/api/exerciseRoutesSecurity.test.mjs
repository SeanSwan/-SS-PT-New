import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');

const routeSource = readBackend('../../routes/exerciseRoutes.mjs');

describe('exercise routes security hardening', () => {
  it('locks the live exercise API mount and active frontend consumers', () => {
    const coreRoutesSource = readBackend('../../core/routes.mjs');
    const loggerSearchSource = readFrontend('src/components/WorkoutLogger/useExerciseSearch.ts');
    const teachModeSource = readFrontend('src/features/teach-mode/hooks/useExerciseTeachData.ts');
    const adminExerciseSource = readFrontend('src/components/DashBoard/Pages/admin-exercises/components/ExerciseLibraryManager.tsx');

    expect(coreRoutesSource).toContain("app.use('/api/exercises', exerciseRoutes)");
    expect(loggerSearchSource).toContain("api.get('/api/exercises/library')");
    expect(teachModeSource).toContain('`/api/exercises/${id}/teach-mode`');
    expect(adminExerciseSource).toContain("authAxios.get('/api/exercises/all')");
  });

  it('does not echo raw exception details from exercise responses', () => {
    expect(routeSource).toContain('const INTERNAL_ERROR =');
    expect(routeSource).toContain('const sendInternalError =');
    expect(routeSource).not.toContain("error: process.env.NODE_ENV === 'development' ? error.message : undefined");
  });

  it('strictly bounds numeric exercise query filters', () => {
    expect(routeSource).toContain('const normalizedLimit = parseBoundedPositiveInteger(limit, 20, 100);');
    expect(routeSource).toContain('const normalizedDifficulty = parseBoundedPositiveInteger(difficulty, null, 1000);');
    expect(routeSource).toContain('const normalizedLimit = parseBoundedPositiveInteger(limit, 50, 500);');
    expect(routeSource).toContain('limit: normalizedLimit');
    expect(routeSource).not.toContain('parseInt(');
  });
});
