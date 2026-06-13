import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Admin Store Control — physical-product management (AS-2 / AS-3, 2026-06-13).
 * ============================================================================
 * The store-management screen was package-only. To run supplements / merch /
 * the recovery drink, the admin needs to see and edit product fields
 * (itemKind / isTaxable / fulfillmentType / sku / stock) and create products
 * with a FLAT price (not price × sessions). This locks that wiring so a later
 * refactor can't silently regress products back to package-only.
 *
 * Backend: adminPackageRoutes.mjs (admin GET mapper + product-aware POST).
 * See docs/ai-workflow/brainstorms/storefront-commerce-expansion-2026-06-13.md
 */
const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const VIEW = 'src/components/DashBoard/Pages/admin-packages/admin-packages-view.tsx';
const DIALOGS = 'src/components/DashBoard/Pages/admin-packages/admin-packages-view.dialogs.tsx';

describe('admin store control — physical-product management', () => {
  const view = read(VIEW);
  const dialogs = read(DIALOGS);

  it('carries the commerce fields on the admin item type', () => {
    expect(view).toContain("itemKind?: 'training_package' | 'physical_product'");
    expect(view).toContain('isTaxable?: boolean');
    expect(view).toContain('fulfillmentType?:');
    expect(view).toContain('stockQuantity?: number | null');
  });

  it('shows a product meta line (kind/fulfillment/tax) in the table', () => {
    expect(view).toContain('isPhysicalProduct(pkg)');
    expect(view).toContain('FULFILLMENT_LABELS[pkg.fulfillmentType');
  });

  it('edits a product with a flat price (pricePerSession 0), not price × sessions', () => {
    expect(view).toContain("const isProduct = editItemKind === 'physical_product'");
    // product branch sends flat price + the commerce fields
    expect(view).toMatch(/price:\s*editProductPrice/);
    expect(view).toContain("itemKind: 'physical_product'");
    expect(view).toContain('isTaxable: editIsTaxable');
    expect(view).toContain('fulfillmentType: editFulfillmentType');
  });

  it('creates a product with a flat price + commerce fields', () => {
    expect(view).toContain("const isProduct = newItemKind === 'physical_product'");
    expect(view).toMatch(/price:\s*newProductPrice/);
    expect(view).toContain('isTaxable: newIsTaxable');
  });

  it('lets the admin filter to Products', () => {
    expect(view).toContain("setTypeFilter('product')");
    expect(view).toContain("typeFilter === 'product' ? isPhysicalProduct(pkg)");
  });

  it('exposes an Item Kind selector + product-only fields in both dialogs', () => {
    expect(view).toContain("from './admin-packages-view.dialogs'");
    expect(dialogs).toContain('id="edit-item-kind"');
    expect(dialogs).toContain('id="new-item-kind"');
    expect(dialogs).toContain('id="edit-product-price"');
    expect(dialogs).toContain('id="new-product-price"');
    // product-only blocks gated on itemKind
    expect(dialogs).toContain("editItemKind === 'physical_product'");
    expect(dialogs).toContain("newItemKind === 'physical_product'");
  });

  it('the parent renders both extracted dialogs wired to its handlers', () => {
    expect(view).toContain('<EditPackageDialog');
    expect(view).toContain('<NewPackageDialog');
    expect(view).toContain('onSave={handleSaveEditedPackage}');
    expect(view).toContain('onCreate={handleCreateNewPackage}');
  });
});
