import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const onboardingCommandsSource = readFileSync(
  resolve(__dirname, '../../services/ai/commandRegistry/onboardingCommands.mjs'),
  'utf8',
);
const commandRegistrySource = readFileSync(
  resolve(__dirname, '../../services/ai/commandRegistry/index.mjs'),
  'utf8',
);
const routeSource = readFileSync(resolve(__dirname, '../../routes/adminOnboardingRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('AI onboarding command path truth', () => {
  it('keeps Swan Coach onboarding commands aligned to mounted admin onboarding routes', () => {
    expect(commandRegistrySource).toContain("import { register as registerOnboarding } from './onboardingCommands.mjs'");
    expect(commandRegistrySource).toContain('registerOnboarding()');
    expect(coreRoutesSource).toContain("app.use('/api/admin', adminOnboardingRoutes)");
    expect(routeSource).toContain("router.post('/baseline-measurements'");
    expect(routeSource).toContain("router.post('/clients/:clientId/onboarding'");
    expect(routeSource).toContain("router.get('/clients/:clientId/onboarding'");

    expect(onboardingCommandsSource).toContain("endpoint: '/api/admin/baseline-measurements'");
    expect(onboardingCommandsSource).toContain("endpoint: '/api/admin/clients/:clientId/onboarding'");
    expect(onboardingCommandsSource).not.toContain('/api/admin/onboarding/baseline-measurements');
    expect(onboardingCommandsSource).not.toContain('/api/admin/onboarding/clients/:clientId/onboarding');
  });
});
