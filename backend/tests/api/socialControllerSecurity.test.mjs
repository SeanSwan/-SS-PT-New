import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');
const readFrontend = (path) => readFileSync(resolve(process.cwd(), '../frontend', path), 'utf8');

const controllerSource = readBackend('../../controllers/socialController.mjs');
const routeSource = readBackend('../../routes/gamificationV1Routes.mjs');
const coreRoutesSource = readBackend('../../core/routes.mjs');

describe('social controller security hardening', () => {
  it('locks the active gamification social routes and explore consumer', () => {
    const exploreHookSource = readFrontend('src/components/Social/Explore/useExplore.ts');
    const gamificationSliceSource = readFrontend('src/redux/slices/gamificationSlice.ts');

    expect(coreRoutesSource).toContain("app.use('/api/v1/gamification', gamificationV1Routes)");
    expect(routeSource).toContain("router.post('/users/:userId/follow', authenticate, requireUser, socialController.followUser)");
    expect(routeSource).toContain("router.delete('/users/:userId/unfollow', authenticate, requireUser, socialController.unfollowUser)");
    expect(routeSource).toContain("router.get('/discover-users', authenticate, requireUser, socialController.discoverUsers)");
    expect(routeSource).toContain("router.get('/social-feed', authenticate, requireUser, socialController.getSocialFeed)");
    expect(exploreHookSource).toContain("authAxios.get('/api/v1/gamification/discover-users'");
    expect(exploreHookSource).toContain('authAxios.post(`/api/v1/gamification/users/${targetUserId}/follow`)');
    expect(gamificationSliceSource).toContain('fetch(`/api/v1/gamification/users/${userId}/follow`');
  });

  it('does not echo raw social exception details to API clients', () => {
    expect(controllerSource).toContain("const INTERNAL_ERROR = 'Internal server error';");
    expect(controllerSource).toContain('const sendSocialError =');
    expect(controllerSource).not.toContain('error: error.message');
  });

  it('strictly normalizes social ids and pagination', () => {
    expect(controllerSource).toContain('const targetUserId = parsePositiveInteger(req.params.userId);');
    expect(controllerSource).toContain('const followerId = parsePositiveInteger(req.user?.id);');
    expect(controllerSource).toContain('const currentUserId = parsePositiveInteger(req.user?.id);');
    expect(controllerSource).toContain('if (targetUserId === followerId)');
    expect(controllerSource).toContain('const normalizedPage = parsePositiveInteger(page, 1);');
    expect(controllerSource).toContain('const normalizedLimit = parseBoundedPositiveInteger(limit, 20, 100);');
    expect(controllerSource).toContain('const offset = (normalizedPage - 1) * normalizedLimit;');
    expect(controllerSource).toContain('const paginatedActivities = activities.slice(offset, offset + normalizedLimit);');
    expect(controllerSource).not.toContain('parseInt(');
  });
});
