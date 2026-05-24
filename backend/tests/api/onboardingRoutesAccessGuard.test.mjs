import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/onboardingRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('onboarding route access guard', () => {
  it('keeps client master prompt reads limited to admin, assigned trainer, or self', () => {
    expect(coreRoutesSource).toContain("app.use('/api/onboarding', onboardingRoutes)");
    expect(routeSource).toContain("import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';");
    expect(routeSource).toContain("router.get('/:userId'");
    expect(routeSource).toContain("verifyClientAccessByUserId({ paramName: 'userId' })");
    expect(routeSource).toContain('Admin, assigned trainer, or the client themselves');
    expect(routeSource).not.toContain('Admin and trainers can access any');
  });
});
