import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const routeSource = readFileSync(resolve(__dirname, '../../routes/sessionDeductionRoutes.mjs'), 'utf8');
const serviceSource = readFileSync(resolve(__dirname, '../../services/sessionDeductionService.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const sessionsRouteSource = readFileSync(resolve(__dirname, '../../routes/sessions.mjs'), 'utf8');

describe('session deduction trainer access guard', () => {
  it('keeps the mounted payment recovery surface and guards package lookup by trainer assignment', () => {
    expect(coreRoutesSource).toContain("app.use('/api/sessions/deductions', sessionDeductionRoutes)");
    expect(routeSource).toContain("import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';");
    expect(routeSource).toContain(
      "router.get('/client-last-package/:clientId', authenticateToken, trainerOrAdminOnly, verifyClientAccessByUserId({ paramName: 'clientId' }), async (req, res) => {"
    );
  });

  it('scopes clients-needing-payment to the requesting trainer assignments', () => {
    expect(routeSource).toContain("getClientsNeedingPayment({ id: req.user.id, role: req.user.role })");
    expect(serviceSource).toMatch(
      /import \{[^}]*getClientTrainerAssignment[^}]*getSessionType[^}]*\} from '\.\.\/models\/index\.mjs';/
    );
    expect(serviceSource).toContain("if (requesterRole === 'trainer') {");
    expect(serviceSource).toContain("where: { trainerId: requesterId, status: 'active' }");
    expect(serviceSource).toContain("where.id = { [Op.in]: assignedClientIds };");
  });

  it('does not put payment mutations behind trainer access', () => {
    expect(routeSource).toContain("router.post('/process', authenticateToken, adminOnly");
    expect(routeSource).toContain("router.post('/apply-payment', authenticateToken, adminOnly");
    expect(routeSource).toContain("router.post('/apply-package-payment', authenticateToken, adminOnly");
  });

  it('keeps the settlement attention summary read-only and admin-only', () => {
    expect(routeSource).toContain("getSessionDeductionAttentionSummary");
    expect(routeSource).toContain("router.get('/attention', authenticateToken, adminOnly");
  });
  it('mounts deductions before /api/sessions and confirms deductions paths are not consumed by unified sessions', () => {
    const deductionMount = coreRoutesSource.indexOf("app.use('/api/sessions/deductions', sessionDeductionRoutes)");
    const sessionsMount = coreRoutesSource.indexOf("app.use('/api/sessions', sessionsRoutes)");
    expect(sessionsMount).toBeGreaterThan(-1);
    expect(deductionMount).toBeGreaterThan(-1);
    expect(deductionMount).toBeLessThan(sessionsMount);

    expect(sessionsRouteSource).not.toContain('router.use("/:id"');
    expect(sessionsRouteSource).not.toContain('router.get("/:id/deductions"');
    expect(sessionsRouteSource).not.toContain('router.post("/:id/deductions"');
  });
});
