import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/masterPrompt/privacy.mjs'), 'utf8');
const complianceSource = readFileSync(resolve(__dirname, '../../services/privacy/PrivacyCompliance.mjs'), 'utf8');
const minimizationSource = readFileSync(resolve(__dirname, '../../services/privacy/DataMinimization.mjs'), 'utf8');

describe('master prompt privacy truth contracts', () => {
  it('does not claim mock privacy export, deletion, or minimization operations succeeded', () => {
    expect(complianceSource).toContain('createPrivacyNotImplementedError');
    expect(complianceSource).toContain('statusCode = 501');
    expect(complianceSource).not.toContain("'mock_data'");
    expect(complianceSource).not.toContain("verificationHash: 'mock_hash'");
    expect(minimizationSource).toContain('createDataMinimizationNotImplementedError');
    expect(routeSource).toContain('error.statusCode || 500');
  });

  it('fails closed until a real minimization data store is connected', async () => {
    const { DataMinimization } = await import('../../services/privacy/DataMinimization.mjs');
    const service = new DataMinimization();

    await expect(service.runMinimization({ requestingUserId: 7 }))
      .rejects.toMatchObject({ statusCode: 501 });
  });

  it('does not report privacy framework compliance from static or random scores', () => {
    expect(complianceSource).not.toContain('compliant: true');
    expect(complianceSource).not.toContain("status: 'compliant'");
    expect(complianceSource).not.toContain('Math.floor(Math.random() * 10) + 90');
    expect(complianceSource).toContain('buildUnverifiedComplianceCheck');
    expect(complianceSource).toContain('verificationStatus');
  });

  it('does not generate random privacy inventory, consent, audit, or report data', () => {
    expect(complianceSource).not.toContain('Math.random()');
    expect(complianceSource).not.toContain('Mock');
    expect(complianceSource).toContain("dataSource: 'not_connected'");
    expect(complianceSource).toContain("consentSource: 'not_connected'");
    expect(complianceSource).toContain("auditSource: 'not_connected'");
  });

  it('does not leave dormant random data minimization helpers behind', () => {
    expect(minimizationSource).not.toContain('Math.random()');
    expect(minimizationSource).not.toContain('Mock');
    expect(minimizationSource).not.toContain('generateMockItems');
    expect(minimizationSource).toContain("this.dataSource = 'not_connected'");
  });

  it('normalizes privacy route user IDs before ownership checks', () => {
    expect(routeSource).toContain('const parsePositiveUserId = (value) =>');
    expect(routeSource).toContain('Number.isSafeInteger(parsed) && parsed > 0');
    expect(routeSource).toContain('const requestingUserId = requireAuthenticatedUserId(req, res);');
    expect(routeSource).toContain("const canAccess = userId === requestingUserId || req.user.role === 'admin';");
    expect(routeSource).not.toContain('const requestingUserId = req.user.id;');
  });

  it('blocks non-admin cross-user privacy deletion before service validation', () => {
    expect(routeSource).toContain("if (req.user.role !== 'admin' && targetUserId !== requestingUserId)");
    expect(routeSource).toContain("error: 'access_denied'");
    expect(routeSource).toContain('privacyCompliance.validateDeletionRequest(');
    expect(routeSource).toContain('targetUserId,');
    expect(routeSource).toContain('requestingUserId,');
  });

  it('does not expose raw operational errors in privacy route JSON responses', () => {
    const statusResponseBlocks = routeSource.match(/res\.status\([^)]*\)\.json\(\{[\s\S]*?\n\s*\}\);/g) || [];

    expect(statusResponseBlocks.length).toBeGreaterThan(0);
    expect(routeSource).toContain('const responseErrorCode = (error) =>');
    expect(routeSource).toContain("return 'not_implemented';");
    expect(routeSource).toContain("return 'internal_error';");
    expect(routeSource).not.toContain('error?.code');
    expect(statusResponseBlocks.some((block) => block.includes('error: error.message'))).toBe(false);
  });

  it('preserves admin system audit-log access when userId is omitted', () => {
    expect(routeSource).toContain('Admins may omit userId to request the system-level audit log.');
    expect(routeSource).toContain("if (req.user.role === 'admin')");
    expect(routeSource).toContain('targetUserId = userId ? parsePositiveUserId(userId) : null;');
    expect(routeSource).toContain('if (userId && targetUserId === null)');
  });
});
