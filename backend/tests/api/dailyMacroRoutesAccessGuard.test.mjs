import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/dailyMacroRoutes.mjs'), 'utf8');
const routeUtilsSource = readFileSync(resolve(__dirname, '../../routes/dailyMacroRoutes.utils.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('daily macro route access guard', () => {
  it('keeps targeted macro summary reads behind assignment-or-admin access', () => {
    expect(coreRoutesSource).toContain("app.use('/api/macros', dailyMacroRoutes)");
    expect(routeSource).toContain('resolveMacroTargetUserId,');
    expect(routeUtilsSource).toContain("import { assertAssignmentOrAdmin } from '../middleware/verifyClientAccess.mjs';");
    expect(routeUtilsSource).toContain('export const resolveMacroTargetUserId = async (req, queryField =');
    expect(routeUtilsSource).toContain('assertAssignmentOrAdmin(req.user.id, req.user.role, targetUserId)');
    expect(routeSource).toContain('const target = await resolveMacroTargetUserId(req);');
    expect(routeSource).not.toContain("Admin/trainer can view any client's macros");
  });
});
