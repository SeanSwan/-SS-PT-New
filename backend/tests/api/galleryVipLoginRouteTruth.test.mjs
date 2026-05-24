import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

const readRepoFile = (relativePath) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('gallery VIP login route contract', () => {
  it('backs the active gallery VIP sign-in endpoint exposed by the frontend modal', () => {
    const modalSource = readRepoFile('frontend/src/pages/gallery/VIPConversionModal.tsx');
    const routeSource = readRepoFile('backend/routes/galleryRoutes.mjs');

    expect(modalSource).toContain('/api/gallery/vip-login');
    expect(routeSource).toMatch(
      /router\.post\('\/vip-login',\s*vipSignupLimiter,\s*requireGalleryAccess/
    );
  });
});
