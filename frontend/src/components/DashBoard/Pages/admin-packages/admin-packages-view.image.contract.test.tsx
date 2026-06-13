import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Admin Store Control — product image upload (AS-3b, 2026-06-13).
 * ============================================================================
 * Products (drink / supplements / merch) and packages need a real image on
 * their storefront card. This locks: a reusable ProductImageField that uploads
 * to R2 via the admin endpoint (or accepts a pasted URL) and previews it safely;
 * both dialogs render it; the parent persists imageUrl and shows a table
 * thumbnail. See docs/ai-workflow/brainstorms/storefront-commerce-expansion-2026-06-13.md
 */
const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const DIR = 'src/components/DashBoard/Pages/admin-packages';
const field = read(`${DIR}/ProductImageField.tsx`);
const dialogs = read(`${DIR}/admin-packages-view.dialogs.tsx`);
const view = read(`${DIR}/admin-packages-view.tsx`);
const tableStyles = read(`${DIR}/admin-packages-view.tableStyles.ts`);

describe('admin store control — product image upload', () => {
  it('ProductImageField uploads to the admin endpoint via FormData', () => {
    expect(field).toContain("authAxios.post('/api/admin/storefront/upload-image'");
    expect(field).toContain("formData.append('image', file)");
  });

  it('ProductImageField validates type + size and previews safely', () => {
    expect(field).toContain("['image/jpeg', 'image/png', 'image/webp']");
    expect(field).toContain('MAX_BYTES');
    // preview goes through the sanitizer (no raw URL injected into CSS)
    expect(field).toContain('sanitizeImageUrl');
    expect(field).toContain('cssUrlValue');
  });

  it('both dialogs render the image field wired to imageUrl', () => {
    expect(dialogs).toContain("import ProductImageField from './ProductImageField'");
    expect(dialogs).toContain('value={editImageUrl} onChange={setEditImageUrl}');
    expect(dialogs).toContain('value={newImageUrl} onChange={setNewImageUrl}');
  });

  it('the parent persists imageUrl on save + create', () => {
    expect(view).toContain('const [editImageUrl, setEditImageUrl]');
    expect(view).toContain('const [newImageUrl, setNewImageUrl]');
    expect(view).toContain('updatedPackageData.imageUrl = editImageUrl.trim() || null');
    expect(view).toContain('newPackageData.imageUrl = newImageUrl.trim() || null');
  });

  it('the admin table shows a sanitized image thumbnail with a dot fallback', () => {
    expect(tableStyles).toContain('export const RowThumb');
    expect(tableStyles).toContain('sanitizeImageUrl');
    expect(view).toContain('pkg.imageUrl ? (');
    expect(view).toContain('<RowThumb $src={pkg.imageUrl}');
  });
});
