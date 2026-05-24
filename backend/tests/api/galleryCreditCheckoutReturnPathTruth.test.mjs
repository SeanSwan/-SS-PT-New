import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('gallery credit checkout return path contract', () => {
  it('returns paid credit buyers to the active event gallery route', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../../routes/galleryRoutes.mjs'), 'utf8');

    expect(source).toContain("const frontendUrl = (process.env.FRONTEND_URL || 'https://sswanstudios.com').replace(/\\/$/, '')");
    expect(source).toContain("const gallerySlug = req.galleryAccess.slug || ''");
    expect(source).toContain("const galleryPath = gallerySlug ? `/gallery/${encodeURIComponent(gallerySlug)}` : '/gallery'");
    expect(source).toContain("success_url: `${frontendUrl}${galleryPath}?credits=success&package=${pkg}`");
    expect(source).toContain("cancel_url: `${frontendUrl}${galleryPath}?credits=cancelled`");

    expect(source).not.toContain('/gallery?credits=success');
    expect(source).not.toContain('/gallery?credits=cancelled');
  });
});
