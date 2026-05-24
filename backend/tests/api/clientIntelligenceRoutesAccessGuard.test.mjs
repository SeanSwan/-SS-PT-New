import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/clientIntelligenceRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');
const serviceSource = readFileSync(resolve(__dirname, '../../services/clientIntelligenceService.mjs'), 'utf8');
const normalizedServiceSource = serviceSource.replace(/\r\n/g, '\n');

describe('client intelligence route access guard', () => {
  it('keeps full client context behind assignment-or-admin access', () => {
    expect(coreRoutesSource).toContain("app.use('/api/client-intelligence', clientIntelligenceRoutes)");
    expect(routeSource).toContain("import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';");
    expect(routeSource).toContain("router.get('/:clientId', authorize(['admin', 'trainer']), verifyClientAccessByUserId({ paramName: 'clientId' })");
    expect(normalizedServiceSource).toContain("where: {\n          clientId: parseInt(clientId, 10),\n          trainerId: parseInt(trainerId, 10),\n          status: 'active',");
  });

  it('keeps the global intelligence overview admin-only', () => {
    expect(routeSource).toContain("router.get('/', authorize(['admin'])");
    expect(routeSource).not.toContain("router.get('/', authorize(['admin', 'trainer'])");
  });
});
