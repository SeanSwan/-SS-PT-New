import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');
const postsRoutes = read('routes/social/posts.mjs');
const coreRoutes = read('core/routes.mjs');
const middlewareRoutes = read('core/middleware/index.mjs');

function blockFrom(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`marker not found: ${marker}`);
  return source.slice(start, start + 2200);
}

describe('social post media proxy contract', () => {
  it('stores uploaded social images under the served social-photos category', () => {
    expect(postsRoutes).toContain("category: isVideo ? 'social-videos' : 'social-photos'");
    expect(postsRoutes).not.toContain("category: isVideo ? 'social-videos' : 'social',");
  });

  it('serves current and legacy social media categories through photo proxies', () => {
    const apiServeProxy = blockFrom(coreRoutes, "app.get('/api/serve-photo/photos/:category");
    const spaPhotoProxy = blockFrom(coreRoutes, "app.get('/photos/:category");
    const middlewareSpaPhotoProxy = blockFrom(middlewareRoutes, "app.get('/photos/*'");

    for (const category of ['social', 'social-photos', 'social-videos']) {
      expect(apiServeProxy).toContain(`'${category}'`);
      expect(spaPhotoProxy).toContain(`'${category}'`);
      expect(middlewareSpaPhotoProxy).toContain(category);
    }
  });
});