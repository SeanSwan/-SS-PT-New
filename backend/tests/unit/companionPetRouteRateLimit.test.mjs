import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(
  resolve(__dirname, '../../routes/gamificationV1Routes.mjs'),
  'utf8',
);

describe('companion pet route rate limiting', () => {
  it('defines a dedicated per-user companion action limiter', () => {
    expect(routeSource).toContain('const companionActionLimiter = rateLimit({');
    expect(routeSource).toContain('keyGenerator: (req) => `companion:${req.user?.id || req.ip}`');
  });

  it('rate-limits every companion pet MUTATION route (limiter after auth/ownership)', () => {
    // /pet/activity is the cosmetic-unlock farming vector and is NOT called by the
    // frontend, so it gets the tighter point-action limiter.
    expect(routeSource).toContain("router.post('/users/:userId/pet/activity', authenticate, authorizeResourceAccess('userId'), pointActionLimiter, gamificationController.recordPetActivity)");
    // interactive + lifecycle mutations get the generous companion limiter
    expect(routeSource).toContain("router.post('/users/:userId/pet/adopt', authenticate, authorizeResourceAccess('userId'), companionActionLimiter, gamificationController.adoptPet)");
    expect(routeSource).toContain("router.post('/users/:userId/pet/interact', authenticate, authorizeResourceAccess('userId'), companionActionLimiter, gamificationController.interactWithPet)");
    expect(routeSource).toContain("router.put('/users/:userId/pet/rename', authenticate, authorizeResourceAccess('userId'), companionActionLimiter, gamificationController.renamePet)");
    expect(routeSource).toContain("router.delete('/users/:userId/pet', authenticate, authorizeResourceAccess('userId'), companionActionLimiter, gamificationController.releasePet)");
  });

  it('keeps read-only companion routes un-throttled by the mutation limiter', () => {
    expect(routeSource).toContain("router.get('/users/:userId/pet', authenticate, authorizeResourceAccess('userId'), gamificationController.getPet)");
    expect(routeSource).not.toContain("router.get('/users/:userId/pet', authenticate, authorizeResourceAccess('userId'), companionActionLimiter");
  });
});
