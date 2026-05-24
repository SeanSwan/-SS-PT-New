import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/clientDataRoutes.mjs'), 'utf8');
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/clientOnboardingController.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('client data overview privacy', () => {
  it('keeps overview reads behind assignment-or-self access', () => {
    expect(coreRoutesSource).toContain("app.use('/api/client-data', clientDataRoutes)");
    expect(routeSource).toContain("import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';");
    expect(routeSource).toContain("router.get('/overview/:userId', protect, verifyClientAccessByUserId({ paramName: 'userId' }), getClientDataOverview)");
  });

  it('does not expose internal trainer-note metadata to client-role requests', () => {
    expect(controllerSource).toContain("const includeTrainerNoteSummary = req.user?.role !== 'client';");
    expect(controllerSource).toContain('includeTrainerNoteSummary\n        ? ClientNote.count');
    expect(controllerSource).toContain(': Promise.resolve(0)');
    expect(controllerSource).toContain('includeTrainerNoteSummary\n        ? ClientNote.findOne');
    expect(controllerSource).toContain(': Promise.resolve(null)');
  });
});
