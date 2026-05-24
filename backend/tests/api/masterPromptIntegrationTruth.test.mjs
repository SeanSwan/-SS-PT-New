import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const routeSource = readFileSync(resolve(__dirname, '../../routes/masterPrompt/index.mjs'), 'utf8');
const integrationSource = readFileSync(resolve(__dirname, '../../services/integration/MasterPromptIntegration.mjs'), 'utf8');

describe('master prompt integration truth contracts', () => {
  it('stays anchored to the mounted master-prompt surface', () => {
    expect(coreRoutesSource).toContain("app.use('/api/master-prompt', masterPromptRoutes)");
    expect(routeSource).toContain('masterPromptIntegration.performSystemHealthCheck()');
    expect(routeSource).toContain('masterPromptIntegration.generateIntegrationReport()');
  });

  it('does not report generated infrastructure health as verified runtime status', () => {
    expect(integrationSource).not.toContain('Mock database health check');
    expect(integrationSource).not.toContain('Math.random() * 100 + 10');
    expect(integrationSource).not.toContain("connections: 'active'");
    expect(integrationSource).not.toContain("connections: 'stable'");
    expect(integrationSource).not.toContain("available: 'sufficient'");
    expect(integrationSource).toContain('healthVerified: false');
    expect(integrationSource).toContain("verificationStatus: 'not_checked'");
  });

  it('does not return static compliance success from report or compliance route', () => {
    expect(integrationSource).not.toContain('compliant: true');
    expect(integrationSource).not.toContain('score: 95');
    expect(integrationSource).not.toContain('score: 93');
    expect(integrationSource).not.toContain('score: 96');
    expect(integrationSource).not.toContain('score: 94');
    expect(routeSource).not.toContain("status: 'compliant'");
    expect(routeSource).not.toContain("rightToDeletion: 'supported'");
    expect(routeSource).not.toContain("noAddictivePatterns: 'verified'");
    expect(integrationSource).toContain("verificationStatus: 'not_verified'");
    expect(routeSource).toContain("verificationStatus: 'not_verified'");
  });
});
