import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (path) => readFileSync(resolve(__dirname, path), 'utf8');

const coreRoutesSource = readBackend('../../core/routes.mjs');
const socialIndexSource = readBackend('../../routes/social/index.mjs');
const postsSource = readBackend('../../routes/social/posts.mjs');
const friendshipsSource = readBackend('../../routes/social/friendships.mjs');

describe('social route disclosure guards', () => {
  it('locks the canonical community route mount chain', () => {
    expect(coreRoutesSource).toContain("app.use('/api/social', socialRoutes)");
    expect(socialIndexSource).toContain("router.use('/posts', postsRoutes)");
    expect(socialIndexSource).toContain("router.use('/friendships', friendshipsRoutes)");
  });

  it('does not expose raw post-route exception details to community clients', () => {
    expect(postsSource).toContain("import { getSocialPointsFailure, sendSocialRouteError } from './socialRouteResponse.helpers.mjs';");
    expect(postsSource).not.toContain('error: error.message');
    expect(postsSource).not.toContain('error: error.message,');
    expect(postsSource).not.toContain('error: error.message }');
    expect(postsSource).toContain('getSocialPointsFailure()');
    expect(postsSource).toContain('sendSocialRouteError(res, 500');
  });

  it('does not expose raw friendship-route exception details to community clients', () => {
    expect(friendshipsSource).toContain("import { sendSocialRouteError } from './socialRouteResponse.helpers.mjs';");
    expect(friendshipsSource).not.toContain('error: error.message');
    expect(friendshipsSource).not.toContain('error: error.message,');
    expect(friendshipsSource).toContain('sendSocialRouteError(res, 500');
  });
});
