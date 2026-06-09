import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/clientDataRoutes.mjs'), 'utf8');
const normalizeSource = (source) => source.replace(/\r\n/g, '\n');
const controllerSource = normalizeSource(readFileSync(resolve(__dirname, '../../controllers/clientOnboardingController.mjs'), 'utf8'));
const servicePath = resolve(__dirname, '../../services/clientDataOverviewService.mjs');
const serviceSource = existsSync(servicePath)
  ? normalizeSource(readFileSync(servicePath, 'utf8'))
  : '';
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('client data overview privacy', () => {
  it('keeps overview reads behind assignment-or-self access', () => {
    expect(coreRoutesSource).toContain("app.use('/api/client-data', clientDataRoutes)");
    expect(routeSource).toContain("import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';");
    expect(routeSource).toContain("router.get('/overview/:userId', protect, verifyClientAccessByUserId({ paramName: 'userId' }), getClientDataOverview)");
  });

  it('does not expose internal trainer-note metadata to client-role requests', () => {
    expect(serviceSource).toContain("const includeTrainerNoteSummary = requesterRole !== 'client';");
    expect(serviceSource).toContain('ClientNote.count({ where: { userId: targetUserId } })');
    expect(serviceSource).toContain(': Promise.resolve(0)');
    expect(serviceSource).toContain('ClientNote.findOne({');
    expect(serviceSource).toContain(': Promise.resolve(null)');
  });

  it('keeps overview data assembly outside the route controller', () => {
    expect(controllerSource).toContain("from '../services/clientDataOverviewService.mjs'");
    expect(controllerSource).not.toContain('ClientOnboardingQuestionnaire.findOne({\n        where: { userId: targetUserId },');
    expect(controllerSource).not.toContain('const nutritionSummary = nutritionPlan');
  });
});
