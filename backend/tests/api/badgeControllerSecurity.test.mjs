import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/badgeController.mjs'), 'utf8');
const routeSource = readFileSync(resolve(__dirname, '../../routes/badgeRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('badge controller security hardening', () => {
  it('locks the mounted badge API and user-badge access guard', () => {
    expect(coreRoutesSource).toContain("app.use('/api/badges', badgeRoutes)");
    expect(routeSource).toContain("router.get('/user/:userId'");
    expect(routeSource).toContain("verifyClientAccessByUserId({ paramName: 'userId' })");
    expect(routeSource).toContain("param('userId').isInt({ min: 1 }).withMessage('Invalid user ID')");
  });

  it('does not echo raw badge service exception details to API clients', () => {
    expect(controllerSource).toContain("const INTERNAL_ERROR = 'Internal server error';");
    expect(controllerSource).toContain('const sendBadgeError =');
    expect(controllerSource).not.toMatch(/error:\s*error\.message\s*\n\s*\}\);/);
  });

  it('strictly normalizes badge pagination and fallback self-access ids', () => {
    expect(controllerSource).toContain('const page = parsePositiveInteger(req.query.page, 1);');
    expect(controllerSource).toContain('const limit = parseBoundedPositiveInteger(req.query.limit, 20, 100);');
    expect(controllerSource).toContain('const targetUserId = parsePositiveInteger(userId);');
    expect(controllerSource).toContain('const requesterId = parsePositiveInteger(currentUserId);');
    expect(controllerSource).toContain('const isOwnProfile = targetUserId === requesterId;');
    expect(controllerSource).not.toContain('parseInt(req.query.page)');
    expect(controllerSource).not.toContain('parseInt(req.query.limit)');
    expect(controllerSource).not.toContain('Number(userId) === Number(currentUserId)');
  });
});
