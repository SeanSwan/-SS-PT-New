import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Admin Store Control — inline one-click on/off toggle (2026-06-13).
 * ============================================================================
 * Sean's ask: "100% full control of the store with buttons I can just slide on
 * and off." The store-management surface already has an active/visible switch,
 * but it was buried in the Edit dialog (open → flip → Save = 3+ clicks). This
 * locks the one-click inline row toggle that flips a product's visibility
 * straight from the table, with optimistic update + revert-on-error so it can't
 * silently desync from the backend.
 *
 * Canonical surface (verified 2026-06-13):
 *   /dashboard/admin-packages → AdminPackagesView → PUT /api/admin/storefront/:id
 *   → adminPackageRoutes.mjs (protect + requireAdmin) → StorefrontItem.isActive
 * See docs/ai-workflow/brainstorms/storefront-commerce-expansion-2026-06-13.md
 */
const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const VIEW = 'src/components/DashBoard/Pages/admin-packages/admin-packages-view.tsx';

describe('admin store control — inline one-click on/off toggle', () => {
  const view = read(VIEW);

  it('exposes a dedicated inline toggle handler (not just the edit dialog)', () => {
    expect(view).toContain('const handleToggleActive');
    // wired to the row's switch, not only the dialog
    expect(view).toContain('onChange={() => handleToggleActive(pkg)}');
  });

  it('sends only isActive to the existing admin update endpoint', () => {
    expect(view).toMatch(/authAxios\.put\(`\/api\/admin\/storefront\/\$\{pkg\.id\}`,\s*\{\s*isActive:\s*nextActive\s*\}\)/);
  });

  it('updates optimistically and reverts on error', () => {
    // optimistic flip
    expect(view).toContain('isActive: nextActive');
    // revert path flips back
    expect(view).toContain('isActive: !nextActive');
    // error branch toasts a failure
    expect(view).toContain("variant: 'destructive'");
  });

  it('guards against concurrent toggles on the same render', () => {
    expect(view).toContain('const [togglingId, setTogglingId]');
    expect(view).toContain('if (togglingId !== null) return;');
    expect(view).toContain('disabled={togglingId === pkg.id}');
  });

  it('reuses the accessible house switch (44px label, keyboard checkbox, aria-label)', () => {
    expect(view).toContain('<StyledBox as={SwitchLabel}');
    expect(view).not.toContain('<SwitchLabel');
    expect(view).toContain('<SwitchTrack $checked={pkg.isActive}>');
    expect(view).toContain('aria-label={`${pkg.isActive');
  });

  it('keeps the active-count stat in sync with the toggle', () => {
    expect(view).toContain('activePackages: Math.max(0, prev.activePackages');
  });
});
