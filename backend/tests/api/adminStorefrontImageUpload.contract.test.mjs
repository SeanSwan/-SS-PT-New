import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Admin storefront API — product image upload (AS-3b, 2026-06-13).
 * ============================================================================
 * Two backend contracts:
 *  1. An admin-gated POST /upload-image that reuses photoStorageService.uploadPhoto
 *     under category 'products', with image type/size validation.
 *  2. The serve-photo proxy allowlist MUST include 'products', or product image
 *     URLs (/api/serve-photo/photos/products/...) would 400 when R2_PUBLIC_URL
 *     is unset. See docs/ai-workflow/brainstorms/storefront-commerce-expansion-2026-06-13.md
 */
const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const routes = read('routes/adminPackageRoutes.mjs');
const coreRoutes = read('core/routes.mjs');

describe('admin storefront API — product image upload', () => {
  it('exposes an admin-gated upload endpoint reusing photoStorageService', () => {
    expect(routes).toContain("import { uploadPhoto } from '../services/photoStorageService.mjs'");
    expect(routes).toMatch(/router\.post\(\s*'\/upload-image'/);
    expect(routes).toContain("category: 'products'");
    // whole router is protect + requireAdmin (declared once at top)
    expect(routes).toContain('router.use(protect)');
    expect(routes).toContain('router.use(requireAdmin)');
  });

  it('validates image type/size before storing', () => {
    expect(routes).toContain("ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp']");
    expect(routes).toContain('fileSize: 5 * 1024 * 1024');
    expect(routes).toContain('rateLimiter(');
  });

  it('returns a clean 413 on oversize (not a generic 500)', () => {
    // multer is wrapped so LIMIT_FILE_SIZE returns 413 and other multer errors return 400,
    // instead of falling through to the global 500 handler.
    expect(routes).toContain('handleProductImageUpload');
    expect(routes).toContain("err.code === 'LIMIT_FILE_SIZE'");
    expect(routes).toMatch(/status\(413\)/);
  });

  it("the serve-photo proxy allowlist includes 'products'", () => {
    expect(coreRoutes).toMatch(/\['profiles'[^\]]*'products'\]/);
  });
});
