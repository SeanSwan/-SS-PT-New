import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * ProductVariantsManager contract - admin product variant controls.
 * ============================================================================
 * Physical products such as the recovery drink need size/tier variants that can
 * be managed from the existing admin store editor. This locks the mounted edit
 * dialog wiring and the API paths used by the inline manager without requiring a
 * brittle full modal render test.
 */
const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const DIR = 'src/components/DashBoard/Pages/admin-packages';
const manager = read(`${DIR}/ProductVariantsManager.tsx`);
const styles = read(`${DIR}/ProductVariantsManager.styles.ts`);
const dialogs = read(`${DIR}/admin-packages-view.dialogs.tsx`);
const view = read(`${DIR}/admin-packages-view.tsx`);

describe('ProductVariantsManager admin variant controls', () => {
  it('is mounted only in the physical-product edit dialog with the selected item id', () => {
    expect(dialogs).toContain("import ProductVariantsManager from './ProductVariantsManager'");
    expect(dialogs).toContain("editItemKind === 'physical_product' && itemId");
    expect(dialogs).toContain('<ProductVariantsManager itemId={itemId} />');
    expect(view).toContain('itemId={selectedPackage?.id ?? null}');
  });

  it('uses the admin storefront variant endpoints', () => {
    expect(manager).toContain("const ADMIN_STOREFRONT_BASE = '/api/admin/storefront'");
    expect(manager).toContain('`${ADMIN_STOREFRONT_BASE}/${itemId}/variants`');
    expect(manager).toContain('`${ADMIN_STOREFRONT_BASE}/variants/${editingId}`');
    expect(manager).toContain('`${ADMIN_STOREFRONT_BASE}/variants/${variant.id}`');
  });

  it('keeps destructive and busy controls explicit and accessible', () => {
    // Was window.confirm; converted to the branded dialog 2026-08-05.
    expect(manager).toContain('<ConfirmActionDialog');
    expect(manager).toContain('setPendingDelete');
    expect(manager).toContain('aria-label={`${variant.isActive ?');
    expect(manager).toContain('aria-label={`Edit ${variant.label}`');
    expect(manager).toContain('aria-label={`Delete ${variant.label}`');
    expect(styles).toContain('min-height: 44px');
  });

  it('keeps the new component ASCII-only to avoid mojibake regressions', () => {
    expect(manager).not.toMatch(/\P{ASCII}/u);
    expect(styles).not.toMatch(/\P{ASCII}/u);
  });
});
