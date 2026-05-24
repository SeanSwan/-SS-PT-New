import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/gamificationV1Routes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('gamification v1 route access guard', () => {
  it('keeps trainer gamification writes scoped to assigned clients', () => {
    expect(coreRoutesSource).toContain("app.use('/api/v1/gamification', gamificationV1Routes)");
    expect(coreRoutesSource).toContain("app.use('/api/gamification', gamificationV1Routes)");

    for (const signature of [
      "router.post('/users/:userId/achievements/:achievementId', authenticate, requireTrainer, authorizeResourceAccess('userId')",
      "router.put('/users/:userId/achievements/:achievementId/progress', authenticate, requireTrainer, authorizeResourceAccess('userId')",
      "router.post('/users/:userId/points', authenticate, requireTrainer, authorizeResourceAccess('userId')",
      "router.post('/users/:userId/check-milestones', authenticate, requireTrainer, authorizeResourceAccess('userId')",
    ]) {
      expect(routeSource).toContain(signature);
    }
  });

  it('keeps route adapter logs from storing raw exception messages', () => {
    expect(routeSource).not.toMatch(/logger\.error\([^;]+error\.message[^;]+;/);
  });
});
