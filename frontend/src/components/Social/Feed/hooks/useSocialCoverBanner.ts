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
 * - Sticky-carousel is intentionally NOT exposed: the fixed-position sticky
 *   strip collides with the /social page chrome, so the feed never renders it.
 * - Read-only. Editing stays on the dashboard banner editor (M6 decides its
 *   long-term home).
 */

import { useEffect, useState } from 'react';
import profileService, {
  DEFAULT_BANNER_OBJECT_FIT,
  isBannerObjectFit,
  normalizeBannerCollageLayout,
  normalizeBannerCollagePhotos,
  normalizeBannerImageScale,
  normalizeBannerObjectPosition,
  type BannerCollageLayout,
  type BannerObjectFit,
  type BannerObjectPosition,
} from '../../../../services/profileService';

export interface SocialCoverBanner {
  backgroundImage: string | null;
  bannerObjectPosition: BannerObjectPosition;
  bannerObjectFit: BannerObjectFit;
  bannerImageScale: number;
  bannerCollagePhotos: string[];
  bannerCollageLayout: BannerCollageLayout;
}

export function useSocialCoverBanner(): SocialCoverBanner | null {
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
        if (!hasCollageMedia && !hasSingleMedia) return; // no media -> decorative fallback

        setBanner({
          backgroundImage,
          bannerObjectPosition: normalizeBannerObjectPosition(profile.bannerObjectPosition),
          bannerObjectFit,
          bannerImageScale: normalizeBannerImageScale(profile.bannerImageScale),
          bannerCollagePhotos,
          bannerCollageLayout: normalizeBannerCollageLayout(profile.bannerCollageLayout),
        });
      } catch {
        // Fetch failure -> decorative fallback; the cover never errors.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return banner;
}

export default useSocialCoverBanner;
