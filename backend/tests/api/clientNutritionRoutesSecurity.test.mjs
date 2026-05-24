import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');

const routeSource = readBackend('../../routes/clientNutritionRoutes.mjs');

describe('client nutrition routes security hardening', () => {
  it('locks the mounted nutrition API and active frontend consumers', () => {
    const coreRoutesSource = readBackend('../../core/routes.mjs');
    const hookSource = readFrontend('src/hooks/useNutritionPlan.ts');
    const builderSource = readFrontend('src/components/Admin/NutritionPlanBuilder.tsx');

    expect(coreRoutesSource).toContain("app.use('/api/nutrition', clientNutritionRoutes)");
    expect(hookSource).toContain("apiService.get(`/api/nutrition/${userId}/current`)");
    expect(builderSource).toContain('apiService.post(`/api/nutrition/${numericClientId}`, payload)');
    expect(routeSource).toContain("router.get('/:userId/current', protect");
    expect(routeSource).toContain("router.post('/:userId', protect");
    expect(routeSource).toContain('ensureClientAccess(req, req.params.userId)');
  });

  it('does not echo raw exception details from nutrition responses', () => {
    expect(routeSource).toContain("const INTERNAL_ERROR = 'Internal server error';");
    expect(routeSource).toContain('const sendInternalError =');
    expect(routeSource).not.toContain('error: error.message');
  });
});
