import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('gallery donation checkout return path contract', () => {
  it('returns card and Venmo donation buyers to the active event gallery route', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../../routes/galleryRoutes.mjs'), 'utf8');

    expect(source).toContain("const gallerySlug = req.galleryAccess.slug || ''");
    expect(source).toContain("const galleryPath = gallerySlug ? `/gallery/${encodeURIComponent(gallerySlug)}` : '/gallery'");

    const successUrls = source.match(/success_url: `\$\{frontendUrl\}\$\{galleryPath\}\?donation=success`/g) || [];
    const cancelUrls = source.match(/cancel_url: `\$\{frontendUrl\}\$\{galleryPath\}\?donation=cancelled`/g) || [];

    expect(successUrls).toHaveLength(2);
    expect(cancelUrls).toHaveLength(2);
    expect(source).not.toContain('/gallery?donation=success');
    expect(source).not.toContain('/gallery?donation=cancelled');
  });
});
