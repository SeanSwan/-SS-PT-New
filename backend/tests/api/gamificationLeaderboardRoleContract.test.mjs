import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/gamificationV1Routes.mjs'), 'utf8');

describe('gamification leaderboard role contract', () => {
  it('allows user/client/trainer/admin to read the global leaderboard only', () => {
    expect(routeSource).toContain("const requireUser = requireAnyRole('client', 'trainer', 'admin');");
    expect(routeSource).toContain("const requireProfileReader = requireAnyRole('user', 'client', 'trainer', 'admin');");
    expect(routeSource).toContain("router.get('/leaderboard', authenticate, requireProfileReader, progressController.getLeaderboard);");
    expect(routeSource).toContain("router.post('/challenges/:id/join', authenticate, requireUser, challengeController.joinChallenge);");
    expect(routeSource).toContain("router.post('/goals', authenticate, requireUser, goalController.createGoal);");
  });
});