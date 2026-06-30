/**
 * ============================================================================
 * FILE: useHomeCoverBanner.tsx
 * PURPOSE: The Home identity header's REAL cover machinery (workstream
 *          N2/N3, extracted in N4 for the rule-4 cap): renders the user's
 *          cover composition (photo / collage / carousel / crossfade) via the
 *          same media layer as the feed cover studio, and hosts the lazy
 *          embedded SocialCoverEditor - closing it bumps refreshKey so the
 *          live cover refetches once.
 * ============================================================================
 */
import React, { lazy, Suspense, useState } from 'react';
import { DEFAULT_BANNER_FRAME_HEIGHT } from '../../../services/profileService';
import { useSocialCoverBanner } from '../../Social/Feed/hooks/useSocialCoverBanner';
import UserDashboardBannerMediaLayer from './UserDashboardBannerMediaLayer';

const SocialCoverEditor = lazy(() => import('../../Social/Feed/components/SocialCoverEditor'));

export function useHomeCoverBanner(dashboardBackgroundControls?: React.ReactNode): {
  bannerLayer: React.ReactNode | null;
  coverEditorSlot: React.ReactNode | null;
  toggleCoverEditor: () => void;
  bannerFrameHeight: number;
} {
  const [editorOpen, setEditorOpen] = useState(false);
  const [coverRefreshKey, setCoverRefreshKey] = useState(0);
  const coverBanner = useSocialCoverBanner(coverRefreshKey);
  const bannerFrameHeight = coverBanner?.bannerFrameHeight ?? DEFAULT_BANNER_FRAME_HEIGHT;

  const bannerLayer = coverBanner ? (
    <UserDashboardBannerMediaLayer
      backgroundImage={coverBanner.backgroundImage}
      bannerObjectPosition={coverBanner.bannerObjectPosition}
      bannerObjectFit={coverBanner.bannerObjectFit}
      bannerImageScale={coverBanner.bannerImageScale}
      bannerCollagePhotos={coverBanner.bannerCollagePhotos}
      bannerCollageLayout={coverBanner.bannerCollageLayout}
      bannerStickyCarousel={coverBanner.bannerStickyCarousel}
    />
  ) : null;

  const coverEditorSlot = editorOpen ? (
    <Suspense fallback={null}>
      <SocialCoverEditor
        dashboardBackgroundControls={dashboardBackgroundControls}
        onClose={() => {
          setEditorOpen(false);
          setCoverRefreshKey((key) => key + 1);
        }}
      />
    </Suspense>
  ) : null;

  return {
    bannerLayer,
    coverEditorSlot,
    toggleCoverEditor: () => setEditorOpen((open) => !open),
    bannerFrameHeight,
  };
}

export default useHomeCoverBanner;
