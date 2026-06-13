import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Feed Banner Studio Slice 3 (2026-06-13) contract: the public profile cover
 * (/profile/:userId) renders through the SAME shared banner engine as the
 * dashboard — single / tile / collage / carousel / crossfade / Atrium / Vitrine
 * — instead of the legacy flat single-photo background:url(). Grep-contract
 * (the page is too dependency-heavy for a full render test); locks the wiring,
 * the canonical normalization, and the security/fallback posture.
 */
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('UserProfilePage public cover wiring (Slice 3)', () => {
  const page = read('src/pages/Social/UserProfilePage.tsx');

  it('renders the public cover through the shared banner engine', () => {
    expect(page).toContain(
      "import UserDashboardBannerMediaLayer from '../../components/UserDashboard/components/UserDashboardBannerMediaLayer'",
    );
    expect(page).toContain('<UserDashboardBannerMediaLayer');
    // banner host respects the user's chosen frame height (same clamp as the
    // dashboard) — the old flat `height: 200px` single-photo backdrop is retired
    expect(page).toContain('height: clamp(180px, var(--banner-frame-height, 320px), 1000px)');
  });

  it('normalizes the viewed user banner through the canonical helpers (parity with useSocialCoverBanner)', () => {
    expect(page).toContain('isBannerObjectFit(profile.bannerObjectFit)');
    expect(page).toContain('normalizeBannerCollagePhotos(profile.bannerCollagePhotos)');
    expect(page).toContain('normalizeBannerObjectPosition(profile.bannerObjectPosition)');
    expect(page).toContain('normalizeBannerImageScale(profile.bannerImageScale)');
    expect(page).toContain('normalizeBannerFrameHeight(profile.bannerFrameHeight)');
    expect(page).toContain('normalizeBannerCollageLayout(profile.bannerCollageLayout)');
    // bannerPhoto is re-sanitized (it is another user's data)
    expect(page).toContain('sanitizeImageUrl(profile.bannerPhoto');
  });

  it('never renders the sticky carousel on a public profile (it collides with page chrome)', () => {
    expect(page).toContain('bannerStickyCarousel={false}');
  });

  it('falls back to a decorative gradient when the viewed user has no banner media', () => {
    // collage-with-no-photos and no single photo both resolve to null, exactly
    // like useSocialCoverBanner, so the BannerSection gradient backdrop shows
    expect(page).toContain('if (!hasCollageMedia && !hasSingleMedia) return null;');
    expect(page).toContain('{bannerComposition && (');
  });
});
