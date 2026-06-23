import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const dashboardLayoutSource = read('../DashBoard/UniversalDashboardLayout.tsx');
const backendMountSource = read('../../../../backend/core/routes.mjs');
const badgeRoutesSource = read('../../../../backend/routes/badgeCreatorRoutes.mjs');

const sources = {
  page: stripComments(read('./BadgeCreatorPage.tsx')),
  pageStyles: stripComments(read('./BadgeCreatorPage.styles.ts')),
  styleBrowser: stripComments(read('./StyleBrowser.tsx')),
  styleBrowserStyles: stripComments(read('./StyleBrowser.styles.ts')),
  gallery: stripComments(read('./BadgeGalleryPanel.tsx')),
  galleryStyles: stripComments(read('./BadgeGalleryPanel.styles.ts')),
  animated: stripComments(read('./AnimatedBadge.tsx')),
  batch: stripComments(read('./BatchGenerationPanel.tsx')),
  batchStyles: stripComments(read('./BatchGenerationPanel.styles.ts')),
  marketplace: stripComments(read('./BadgeMarketplacePanel.tsx')),
  marketplaceStyles: stripComments(read('./BadgeMarketplacePanel.styles.ts')),
  imageSafety: stripComments(read('./BadgeCreatorImageSafety.ts')),
  payloadSafety: stripComments(read('./BadgeCreatorPayloadSafety.ts')),
};

const rawSources = {
  gallery: read('./BadgeGalleryPanel.tsx'),
  page: read('./BadgeCreatorPage.tsx'),
  pageStyles: read('./BadgeCreatorPage.styles.ts'),
  styleBrowser: read('./StyleBrowser.tsx'),
  styleBrowserStyles: read('./StyleBrowser.styles.ts'),
  galleryStyles: read('./BadgeGalleryPanel.styles.ts'),
  animated: read('./AnimatedBadge.tsx'),
  batch: read('./BatchGenerationPanel.tsx'),
  batchStyles: read('./BatchGenerationPanel.styles.ts'),
  marketplace: read('./BadgeMarketplacePanel.tsx'),
  marketplaceStyles: read('./BadgeMarketplacePanel.styles.ts'),
  imageSafety: read('./BadgeCreatorImageSafety.ts'),
  payloadSafety: read('./BadgeCreatorPayloadSafety.ts'),
};

const lineCount = (source: string) => source.split(/\r?\n/).length;

const expectSharedTransport = (source: string) => {
  expect(source).toMatch(/import\s+apiService\s+from\s+['"]\.\.\/\.\.\/services\/api\.service['"]/);
  expect(source).not.toMatch(/localStorage\.getItem\(['"]token['"]\)/);
  expect(source).not.toMatch(/Authorization\s*:/);
  expect(source).not.toMatch(/\bfetch\s*\(/);
};

describe('BadgeCreator auth pipeline', () => {
  it('is mounted as an admin dashboard surface backed by admin-only badge creator routes', () => {
    expect(dashboardLayoutSource).toMatch(/const BadgeCreatorPage = React\.lazy\(\(\) => import\('\.\.\/BadgeCreator\/BadgeCreatorPage'\)\)/);
    expect(dashboardLayoutSource).toMatch(/path: '\/badge-creator', component: BadgeCreatorPage/);
    expect(backendMountSource).toMatch(/app\.use\('\/api\/admin\/badge-creator', badgeCreatorRoutes\)/);
    expect(badgeRoutesSource).toMatch(/import\s+\{\s*protect,\s*adminOnly\s*\}\s+from\s+['"]\.\.\/middleware\/authMiddleware\.mjs['"]/);
    expect(badgeRoutesSource).toMatch(/router\.use\(protect,\s*adminOnly\)/);
  });

  it('keeps mounted badge creator calls on shared apiService auth transport', () => {
    [sources.page, sources.gallery, sources.batch, sources.marketplace].forEach(expectSharedTransport);

    expect(sources.page).toContain('/api/admin/badge-creator/styles');
    expect(sources.page).toContain('/api/admin/badge-creator/credits');
    expect(sources.page).toContain('/api/admin/badge-creator/generate');
    expect(sources.page).toContain('/api/admin/badge-creator/save');
    expect(sources.page).toMatch(/apiService\.get/);
    expect(sources.page).toMatch(/apiService\.post/);

    expect(sources.gallery).toContain('/api/admin/badge-creator/gallery');
    expect(sources.gallery).toContain('buildBadgeActionPath');
    expect(sources.gallery).toContain("'assign'");
    expect(sources.gallery).toContain("'unassign'");
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

  it('keeps the mounted default badge creator generation flow safe and touch-ready', () => {
    const defaultSurface = `${sources.page}\n${sources.pageStyles}\n${sources.styleBrowser}\n${sources.styleBrowserStyles}`;

    expect(lineCount(rawSources.page)).toBeLessThanOrEqual(300);
    expect(lineCount(rawSources.pageStyles)).toBeLessThanOrEqual(300);
    expect(lineCount(rawSources.styleBrowser)).toBeLessThanOrEqual(300);
    expect(lineCount(rawSources.styleBrowserStyles)).toBeLessThanOrEqual(300);
    expect(sources.page).toContain('BADGE_CREATOR_GENERATE_ERROR');
    expect(sources.page).toContain('BADGE_CREATOR_SAVE_ERROR');
    expect(sources.page).toContain('BADGE_CREATOR_NETWORK_ERROR');
    expect(sources.page).toContain("import { normalizeArtStyleRows, normalizeBadgeCreatorCredits, normalizeCreditCount } from './BadgeCreatorPayloadSafety'");
    expect(sources.page).toContain('setStyles(normalizeArtStyleRows(res.data.data))');
    expect(sources.page).toContain('setCredits(normalizeBadgeCreatorCredits(res.data.data))');
    expect(sources.page).toContain('const creditsRemaining = normalizeCreditCount(data?.creditsRemaining);');
    expect(sources.page).toContain('const generatingRef = useRef(false);');
    expect(sources.page).toContain('const savingRef = useRef(false);');
    expect(sources.page).toContain("import { safeBadgeImageUrl } from './BadgeCreatorImageSafety'");
    expect(sources.page).toContain('safeBadgeImageUrl(data?.imageUrl)');
    expect(sources.page).toContain('aria-busy={generating}');
    expect(sources.page).toContain('aria-busy={saving}');
    expect(sources.page).toContain("role={statusMsg.type === 'error' ? 'alert' : 'status'}");
    expect(sources.page).toContain("aria-live={statusMsg.type === 'error' ? 'assertive' : 'polite'}");
    expect(sources.styleBrowser).toContain('aria-pressed={category === cat}');
    expect(sources.styleBrowser).toContain('aria-pressed={selectedId === style.id}');
    expect(sources.pageStyles).toContain('prefers-reduced-motion');
    expect(sources.styleBrowserStyles).toContain('min-height: 44px');
    expect(defaultSurface).not.toContain('d.message');
    expect(defaultSurface).not.toContain('Generation failed');
    expect(defaultSurface).not.toContain('Save failed');
    expect(defaultSurface).not.toContain('Network error');
    expect(defaultSurface).not.toContain('style={{');
    expect(defaultSurface).not.toContain('rgba(');
    expect(defaultSurface).not.toContain('transition: all');
  });

  it('keeps the mounted badge marketplace claim flow safe and touch-ready', () => {
    const marketplaceSurface = `${sources.marketplace}\n${sources.marketplaceStyles}`;

    expect(lineCount(rawSources.marketplace)).toBeLessThanOrEqual(300);
    expect(lineCount(rawSources.marketplaceStyles)).toBeLessThanOrEqual(300);
    expect(sources.marketplace).toContain('BADGE_MARKETPLACE_CLAIM_ERROR');
    expect(sources.marketplace).toContain('BADGE_MARKETPLACE_NETWORK_ERROR');
    expect(sources.marketplace).toContain('const claimingRef = useRef<string | null>(null);');
    expect(sources.marketplace).toContain("import { safeBadgeImageUrl } from './BadgeCreatorImageSafety'");
    expect(sources.marketplace).toContain('safeBadgeImageUrl(badge.imageUrl)');
    expect(sources.marketplace).toContain('claimedIds.has(badgeId)');
    expect(sources.marketplace).toContain('buildClaimPath');
    expect(sources.marketplace).toContain('encodeURIComponent(badgeId)');
    expect(sources.marketplace).toContain('role="status"');
    expect(sources.marketplace).toContain('aria-live="polite"');
    expect(sources.marketplace).toContain('aria-busy={isClaiming}');
    expect(sources.marketplaceStyles).toContain('min-height: 44px');
    expect(marketplaceSurface).not.toContain('d.message');
    expect(marketplaceSurface).not.toContain('Claim failed');
    expect(marketplaceSurface).not.toContain('Network error');
    expect(marketplaceSurface).not.toContain('style={{');
    expect(marketplaceSurface).not.toContain('rgba(');
  });

  it('keeps the mounted badge gallery mutation flow safe and touch-ready', () => {
    const gallerySurface = `${sources.gallery}\n${sources.galleryStyles}\n${sources.animated}`;

    expect(lineCount(rawSources.gallery)).toBeLessThanOrEqual(300);
    expect(lineCount(rawSources.galleryStyles)).toBeLessThanOrEqual(300);
    expect(lineCount(rawSources.animated)).toBeLessThanOrEqual(300);
    expect(sources.gallery).toContain('BADGE_GALLERY_ASSIGN_ERROR');
    expect(sources.gallery).toContain('BADGE_GALLERY_SHARE_ERROR');
    expect(sources.gallery).toContain('const assigningRef = useRef(false);');
    expect(sources.gallery).toContain('const sharingRef = useRef(false);');
    expect(sources.gallery).toContain("import { safeBadgeImageUrl } from './BadgeCreatorImageSafety'");
    expect(sources.gallery).toContain('safeBadgeImageUrl(badge.imageUrl)');
    expect(sources.gallery).toContain('buildBadgeActionPath');
    expect(sources.gallery).toContain('encodeURIComponent(badgeId)');
    expect(sources.gallery).toContain('role="status"');
    expect(sources.gallery).toContain('aria-live="polite"');
    expect(sources.gallery).toContain('aria-busy={assigning}');
    expect(sources.gallery).toContain("import AnimatedBadge from './AnimatedBadge'");
    expect(sources.gallery).toContain('<AnimatedBadge');
    expect(sources.galleryStyles).toContain('min-height: 44px');
    expect(sources.animated).toContain('const BADGE_MIN_SIZE = 56;');
    expect(sources.animated).toContain('const BADGE_MAX_SIZE = 220;');
    expect(sources.animated).toContain('const clampBadgeSize');
    expect(sources.animated).toContain('const normalizedSize = clampBadgeSize(size);');
    expect(sources.animated).toContain("import { safeBadgeImageUrl } from './BadgeCreatorImageSafety'");
    expect(sources.animated).toContain('const safeSrc = safeBadgeImageUrl(src);');
    expect(sources.animated).toContain('aria-hidden="true"');
    expect(sources.animated).toContain('color-mix(in srgb, var(--accent-gold');
    expect(sources.animated).toContain('prefers-reduced-motion');
    expect(sources.animated).not.toContain('cursor: pointer');
    expect(gallerySurface).not.toContain('selected.id}/assign');
    expect(gallerySurface).not.toContain('selected.id}/unassign');
    expect(gallerySurface).not.toContain('d.message');
    expect(gallerySurface).not.toContain('Failed to assign');
    expect(gallerySurface).not.toContain('Network error');
    expect(gallerySurface).not.toContain('style={{');
    expect(gallerySurface).not.toContain('rgba(');
    expect(gallerySurface).not.toContain('transition: all');
  });

  it('keeps the mounted batch generation flow safe and touch-ready', () => {
    const batchSurface = `${sources.batch}\n${sources.batchStyles}`;

    expect(lineCount(rawSources.batch)).toBeLessThanOrEqual(300);
    expect(lineCount(rawSources.batchStyles)).toBeLessThanOrEqual(300);
    expect(sources.batch).toContain('BADGE_BATCH_GENERATE_ERROR');
    expect(sources.batch).toContain('BADGE_BATCH_PET_ERROR');
    expect(sources.batch).toContain('BADGE_BATCH_SAVE_ERROR');
    expect(sources.batch).toContain('BADGE_BATCH_NETWORK_ERROR');
    expect(sources.batch).toContain('const generatingRef = useRef(false);');
    expect(sources.batch).toContain('const savingRef = useRef(false);');
    expect(lineCount(rawSources.imageSafety)).toBeLessThanOrEqual(300);
    expect(lineCount(rawSources.payloadSafety)).toBeLessThanOrEqual(300);
    expect(sources.imageSafety).toContain("import { sanitizeImageUrl } from '../../utils/imageUrl'");
    expect(sources.imageSafety).toContain('normalizeBadgeImageResult');
    expect(sources.payloadSafety).toContain('const MAX_BATCH_IMAGE_ROWS = 5;');
    expect(sources.payloadSafety).toContain('.slice(0, MAX_BATCH_IMAGE_ROWS)');
    expect(sources.batch).toContain("import { normalizeBadgeImageResult, safeBadgeImageUrl } from './BadgeCreatorImageSafety'");
    expect(sources.batch).toContain("import { normalizeBatchImageRows, normalizeCreditCount, type BatchImageRow } from './BadgeCreatorPayloadSafety'");
    expect(sources.batch).toContain('const normalizedImages = normalizeBatchImageRows(data.images);');
    expect(sources.batch).toContain('const creditsRemaining = normalizeCreditCount(data.creditsRemaining);');
    expect(sources.batch).toContain('const safeImages = normalizedImages.map(normalizeBadgeImageResult);');
    expect(sources.batch).toContain('safeBadgeImageUrl(res.data.data?.imageUrl)');
    expect(sources.batch).toContain('const creditsRemaining = normalizeCreditCount(res.data.data?.creditsRemaining);');
    expect(sources.batch).toContain('const successCount = safeImages.filter(image => image.success).length;');
    expect(sources.batch).toContain('aria-busy={generating}');
    expect(sources.batch).toContain('aria-busy={saving}');
    expect(sources.batch).toContain('aria-pressed={selectedIdx === index}');
    expect(sources.batchStyles).toContain('min-height: 44px');
    expect(sources.batchStyles).toContain('prefers-reduced-motion');
    expect(batchSurface).not.toContain('d.message');
    expect(batchSurface).not.toContain('Batch generation failed');
    expect(batchSurface).not.toContain('Pet avatar generation failed');
    expect(batchSurface).not.toContain('Save failed');
    expect(batchSurface).not.toContain('Network error');
    expect(batchSurface).not.toContain('style={{');
    expect(batchSurface).not.toContain('rgba(');
    expect(batchSurface).not.toContain('transition: all');
  });
});
