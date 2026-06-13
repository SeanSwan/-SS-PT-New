import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * ProductDetail image sanitize regression (AS-3b sibling-sweep fix, 2026-06-13).
 * ============================================================================
 * StorefrontItem.imageUrl is admin-settable (AS-3b upload/URL). Every storefront
 * surface that renders it into CSS url() MUST sanitize first (PackageCard,
 * ProductCard, RowThumb, ProductImageField all do). ProductDetail was the lone
 * outlier rendering it raw as a CSS-injection / off-origin-beacon sink. This locks
 * the fix so the public product page can't regress to a raw url() interpolation.
 */
const root = process.cwd();
const src = readFileSync(resolve(root, 'src/components/Shop/ProductDetail.tsx'), 'utf8');

describe('ProductDetail sanitizes imageUrl before CSS url()', () => {
  it('imports the storefront image sanitizer', () => {
    expect(src).toContain("import { sanitizeImageUrl, cssUrlValue } from '../../utils/imageUrl'");
  });

  it('renders the image through the sanitizer', () => {
    expect(src).toContain('sanitizeImageUrl(product.imageUrl)');
    expect(src).toContain('url(${cssUrlValue(safeImg)})');
  });

  it('never interpolates the raw imageUrl into url()', () => {
    expect(src).not.toContain('url(${product.imageUrl})');
  });
});
