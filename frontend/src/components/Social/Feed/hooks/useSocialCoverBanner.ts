/**
 * ============================================================================
 * FILE: useSocialCoverBanner.ts
 * PURPOSE: Fetch + normalize the user's banner composition for the /social
 *          cover backdrop (merge M5b, 2026-06-11).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: One lightweight GET /api/profile (via the existing
 * profileService) when the social cover mounts, normalized through the same
 * banner-composition helpers the dashboard editor uses. Returns null when the
 * user has no banner media or the fetch fails — the cover then falls back to
 * its decorative panels (honest degradation, never an error state).
 *
 * KEY DECISIONS:
 * - Deliberately NOT useProfile (that hook carries posts/stats/achievements/
 *   upload machinery — far too heavy for a backdrop read).
 * - Sticky-carousel is normalized for dashboard consumers. Public /social
 *   sections still pass bannerStickyCarousel={false} so the fixed mini strip
 *   never collides with social page chrome.
 */

import { useEffect, useState } from 'react';
import profileService, {
  DEFAULT_BANNER_FRAME_HEIGHT,
  DEFAULT_BANNER_OBJECT_FIT,
  isBannerObjectFit,
  normalizeBannerCollageLayout,
  normalizeBannerCollagePhotos,
  normalizeBannerFrameHeight,
  normalizeBannerImageScale,
  normalizeBannerObjectPosition,
  normalizeBannerStickyCarousel,
  type BannerCollageLayout,
  type BannerObjectFit,
  type BannerObjectPosition,
} from '../../../../services/profileService';

export interface SocialCoverBanner {
  backgroundImage: string | null;
  bannerObjectPosition: BannerObjectPosition;
  bannerObjectFit: BannerObjectFit;
  bannerImageScale: number;
  bannerFrameHeight: number;
  bannerCollagePhotos: string[];
  bannerCollageLayout: BannerCollageLayout;
  bannerStickyCarousel: boolean;
}

export function useSocialCoverBanner(refreshKey = 0): SocialCoverBanner | null {
  const [banner, setBanner] = useState<SocialCoverBanner | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await profileService.getCurrentProfile();
        if (cancelled || !profile) return;

        const bannerObjectFit = isBannerObjectFit(profile.bannerObjectFit)
          ? profile.bannerObjectFit
          : DEFAULT_BANNER_OBJECT_FIT;
        const bannerCollagePhotos = normalizeBannerCollagePhotos(profile.bannerCollagePhotos);
        const backgroundImage = typeof profile.bannerPhoto === 'string' && profile.bannerPhoto.trim()
          ? profile.bannerPhoto
          : null;

        const hasCollageMedia = bannerObjectFit === 'collage' && bannerCollagePhotos.length > 0;
        const hasSingleMedia = bannerObjectFit !== 'collage' && Boolean(backgroundImage);
        if (!hasCollageMedia && !hasSingleMedia) {
          // No media -> decorative fallback. Explicitly clear so a refetch
          // after the user REMOVES their media doesn't leave a stale banner.
          setBanner(null);
          return;
        }

        setBanner({
          backgroundImage,
          bannerObjectPosition: normalizeBannerObjectPosition(profile.bannerObjectPosition),
          bannerObjectFit,
          bannerImageScale: normalizeBannerImageScale(profile.bannerImageScale),
          bannerFrameHeight: normalizeBannerFrameHeight(profile.bannerFrameHeight ?? DEFAULT_BANNER_FRAME_HEIGHT),
          bannerCollagePhotos,
          bannerCollageLayout: normalizeBannerCollageLayout(profile.bannerCollageLayout),
          bannerStickyCarousel: normalizeBannerStickyCarousel(profile.bannerStickyCarousel),
        });
      } catch {
        // Fetch failure -> decorative fallback; the cover never errors.
      }
    })();
    return () => {
      cancelled = true;
    };
    // refreshKey lets the cover refetch after an edit session (M6a) without
    // polling — bumped by the parent when the embedded editor closes.
  }, [refreshKey]);

  return banner;
}

export default useSocialCoverBanner;
