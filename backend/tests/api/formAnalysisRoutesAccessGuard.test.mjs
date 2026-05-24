import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/formAnalysisRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('form analysis route access guard', () => {
  it('keeps cross-client form-analysis reads behind assignment-or-admin access', () => {
    expect(coreRoutesSource).toContain("app.use('/api/form-analysis', formAnalysisRoutes)");
    expect(routeSource).toContain('assertAssignmentOrAdmin');
    expect(routeSource).toContain('verifyClientAccessByUserId');
    expect(routeSource).toContain('const resolveAnalysisHistoryUserId = async (req) =>');
    expect(routeSource).toContain('assertAssignmentOrAdmin(req.user.id, req.user.role, targetUserId)');
    expect(routeSource).toContain('const target = await resolveAnalysisHistoryUserId(req);');
    expect(routeSource).toContain("router.get('/profile/:userId', authorize(['admin', 'trainer']), verifyClientAccessByUserId({ paramName: 'userId' })");
    expect(routeSource).toContain("router.get('/stats', authorize(['admin'])");
    expect(routeSource).not.toContain("? parseInt(req.query.userId, 10)\n      : req.user.id");
  });
});
