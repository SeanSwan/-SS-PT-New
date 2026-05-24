import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const layoutSource = read('../DashBoard/UniversalDashboardLayout.tsx');
const backendMountSource = read('../../../../backend/core/routes.mjs');
const badgeRoutesSource = read('../../../../backend/routes/badgeCreatorRoutes.mjs');

const sources = {
  page: stripComments(read('./BadgeCreatorPage.tsx')),
  gallery: stripComments(read('./BadgeGalleryPanel.tsx')),
  batch: stripComments(read('./BatchGenerationPanel.tsx')),
  marketplace: stripComments(read('./BadgeMarketplacePanel.tsx')),
};

const expectSharedTransport = (source: string) => {
  expect(source).toMatch(/import\s+apiService\s+from\s+['"]\.\.\/\.\.\/services\/api\.service['"]/);
  expect(source).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
  expect(source).not.toMatch(/Authorization\s*:/);
  expect(source).not.toMatch(/\bfetch\s*\(/);
};

describe('BadgeCreator auth pipeline', () => {
  it('is mounted as an admin dashboard surface backed by admin-only badge creator routes', () => {
    expect(layoutSource).toMatch(/const BadgeCreatorPage = React\.lazy\(\(\) => import\('\.\.\/BadgeCreator\/BadgeCreatorPage'\)\)/);
    expect(layoutSource).toMatch(/path: '\/badge-creator', component: BadgeCreatorPage/);
    expect(backendMountSource).toMatch(/app\.use\('\/api\/admin\/badge-creator', badgeCreatorRoutes\)/);
    expect(badgeRoutesSource).toMatch(/import\s+\{\s*protect,\s*adminOnly\s*\}\s+from\s+['"]\.\.\/middleware\/authMiddleware\.mjs['"]/);
    expect(badgeRoutesSource).toMatch(/router\.use\(protect,\s*adminOnly\)/);
  });

  it('keeps mounted badge creator calls on shared apiService auth transport', () => {
    Object.values(sources).forEach(expectSharedTransport);

    expect(sources.page).toContain('/api/admin/badge-creator/styles');
    expect(sources.page).toContain('/api/admin/badge-creator/credits');
    expect(sources.page).toContain('/api/admin/badge-creator/generate');
    expect(sources.page).toContain('/api/admin/badge-creator/save');
    expect(sources.page).toMatch(/apiService\.get/);
    expect(sources.page).toMatch(/apiService\.post/);

    expect(sources.gallery).toContain('/api/admin/badge-creator/gallery');
    expect(sources.gallery).toContain('/assign');
    expect(sources.gallery).toContain('/unassign');
    expect(sources.gallery).toContain('/api/admin/badge-creator/marketplace/share');
    expect(sources.gallery).toContain('/api/admin/badge-creator/marketplace/unshare');
    expect(sources.gallery).toMatch(/apiService\.get/);
    expect(sources.gallery).toMatch(/apiService\.patch/);
    expect(sources.gallery).toMatch(/apiService\.post/);

    expect(sources.batch).toContain('/api/admin/badge-creator/generate-batch');
    expect(sources.batch).toContain('/api/admin/badge-creator/generate-pet-avatar');
    expect(sources.batch).toContain('/api/admin/badge-creator/save');
    expect(sources.batch).toMatch(/apiService\.post/);

    expect(sources.marketplace).toContain('/api/admin/badge-creator/marketplace');
    expect(sources.marketplace).toContain('/api/admin/badge-creator/marketplace/claim/');
    expect(sources.marketplace).toMatch(/apiService\.get/);
    expect(sources.marketplace).toMatch(/apiService\.post/);
  });
});
