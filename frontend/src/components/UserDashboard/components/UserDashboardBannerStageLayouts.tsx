/**
 * ============================================================================
 * COMPONENT: UserDashboardBannerStageLayouts
 * PURPOSE: Renders Atrium and Vitrine cover-stage layouts for the mounted
 *          user-dashboard banner without bloating the base media renderer.
 * DATA FLOW: UserDashboardBannerMediaLayer -> stage layout -> DashboardV3Styles.
 * SAFETY: Decorative media only, reduced-motion aware auto-advance, no controls
 *         or route side effects.
 * ============================================================================
 */
import React from 'react';
import {
  BannerCrossfadeDot,
  BannerCrossfadeDots,
  BannerCrossfadeScrim,
  BannerStageAtrium,
  BannerStageAtriumSlot,
  BannerStageAtriumTrack,
  BannerStageHeroBackdrop,
  BannerStageImage,
  BannerStagePlayOrb,
  BannerStageSmart,
  BannerStageSmartAura,
  BannerStageSmartBackdrop,
  BannerStageSmartHero,
  BannerStageSmartRail,
  BannerStageSmartTile,
  BannerStageVideo,
  BannerStageVitrine,
  BannerStageVitrineHero,
  BannerStageVitrineRail,
  BannerStageVitrineThumb,
} from '../styles/DashboardV3Styles';
import { MAX_BANNER_COLLAGE_PHOTOS, type BannerObjectPosition } from '../../../services/profileService';
import { isBannerVideoUrl } from '../utils/bannerCompositionMedia';

type StageLayout = 'smart-carousel' | 'atrium' | 'vitrine';

interface UserDashboardBannerStageLayoutsProps {
  layout: StageLayout;
  bannerObjectPosition: BannerObjectPosition;
  bannerCollagePhotos: string[];
}

const SMART_SKINS = ['crystal', 'ocean', 'forest', 'forge'] as const;

const PlayGlyph: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const buildAtriumSlotStyle = (offset: number): React.CSSProperties => {
  const abs = Math.abs(offset);
  if (abs > 2) {
    return {
      '--atrium-op': 0,
      '--atrium-tx': '0%',
      '--atrium-tz': '-900px',
      '--atrium-ry': '0deg',
      '--atrium-sc': 0.5,
      '--atrium-sat': 0.6,
      '--atrium-br': 0.4,
      zIndex: 0,
    } as React.CSSProperties;
  }

  const dir = Math.sign(offset);
  const sc = offset === 0 ? 1 : 0.82 - (abs - 1) * 0.06;
  return {
    '--atrium-op': offset === 0 ? 1 : 0.85 - (abs - 1) * 0.25,
    '--atrium-tx': `${offset * 31}%`,
    '--atrium-tz': `${-abs * 230}px`,
    '--atrium-ry': `${-dir * Math.min(abs, 2) * 34}deg`,
    '--atrium-sc': sc,
    '--atrium-sat': offset === 0 ? 1.05 : 0.78,
    '--atrium-br': offset === 0 ? 1 : 0.62,
    zIndex: 20 - abs,
  } as React.CSSProperties;
};

const buildSmartRailItems = (photos: string[], active: number) => (
  Array.from({ length: 4 }, (_, slot) => ({
    photo: photos.length > 1 ? photos[(active + slot + 1) % photos.length] : slot === 0 ? photos[active] : null,
    skin: SMART_SKINS[(active + slot) % SMART_SKINS.length],
  }))
);

const renderStageMedia = (photo: string, testId?: string) => (
  isBannerVideoUrl(photo) ? (
    <BannerStageVideo src={photo} data-testid={testId} muted loop autoPlay playsInline preload="metadata" />
  ) : (
    <BannerStageImage src={photo} alt="" data-testid={testId} draggable={false} />
  )
);

const UserDashboardBannerStageLayouts: React.FC<UserDashboardBannerStageLayoutsProps> = ({
  layout,
  bannerObjectPosition,
  bannerCollagePhotos,
}) => {
  const photos = bannerCollagePhotos.slice(0, MAX_BANNER_COLLAGE_PHOTOS);
  const stageCount = photos.length;
  const [stageIndex, setStageIndex] = React.useState(0);

  React.useEffect(() => {
    if (stageCount < 2) return undefined;
    if (typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }
    const id = window.setInterval(
      () => setStageIndex((current) => (current + 1) % stageCount),
      5200,
    );
    return () => window.clearInterval(id);
  }, [stageCount]);

  if (stageCount === 0) return null;

  const active = stageIndex % stageCount;
  const positionStyle = { '--banner-object-position': bannerObjectPosition } as React.CSSProperties;

  if (layout === 'smart-carousel') {
    const heroPhoto = photos[active];
    const railItems = buildSmartRailItems(photos, active);

    return (
      <BannerStageSmart data-testid="banner-stage-smart-carousel" style={positionStyle}>
        <BannerStageSmartBackdrop aria-hidden="true">
          {renderStageMedia(heroPhoto)}
        </BannerStageSmartBackdrop>
        <BannerStageSmartAura />
        <BannerStageSmartHero data-testid="banner-stage-smart-hero">
          {renderStageMedia(heroPhoto, 'banner-stage-smart-hero-media')}
          {isBannerVideoUrl(heroPhoto) && (
            <BannerStagePlayOrb aria-hidden="true"><PlayGlyph /></BannerStagePlayOrb>
          )}
          <BannerCrossfadeScrim />
        </BannerStageSmartHero>
        <BannerStageSmartRail data-testid="banner-stage-smart-rail">
          {railItems.map(({ photo, skin }, index) => (
            <BannerStageSmartTile
              key={`${photo ?? skin}-${index}`}
              $skin={skin}
              data-testid={photo ? 'banner-stage-smart-media-tile' : 'banner-stage-smart-theme-tile'}
            >
              {photo && renderStageMedia(photo)}
            </BannerStageSmartTile>
          ))}
        </BannerStageSmartRail>
        {stageCount > 1 && (
          <BannerCrossfadeDots aria-hidden="true" style={{ zIndex: 31 }}>
            {photos.map((photo, index) => (
              <BannerCrossfadeDot key={`${photo}-dot-${index}`} $active={index === active} />
            ))}
          </BannerCrossfadeDots>
        )}
      </BannerStageSmart>
    );
  }

  if (layout === 'atrium') {
    return (
      <BannerStageAtrium data-testid="banner-stage-atrium" style={positionStyle}>
        <BannerStageAtriumTrack>
          {photos.map((photo, index) => {
            let offset = index - active;
            if (offset > stageCount / 2) offset -= stageCount;
            if (offset < -stageCount / 2) offset += stageCount;
            const hero = offset === 0;

            return (
              <BannerStageAtriumSlot key={`${photo}-${index}`} $hero={hero} style={buildAtriumSlotStyle(offset)}>
                {isBannerVideoUrl(photo) ? (
                  <BannerStageVideo src={photo} data-testid="banner-stage-video" muted loop autoPlay playsInline preload="metadata" />
                ) : (
                  <BannerStageImage src={photo} alt="" data-testid="banner-stage-image" draggable={false} />
                )}
                {hero && isBannerVideoUrl(photo) && (
                  <BannerStagePlayOrb aria-hidden="true"><PlayGlyph /></BannerStagePlayOrb>
                )}
              </BannerStageAtriumSlot>
            );
          })}
        </BannerStageAtriumTrack>
        <BannerCrossfadeScrim style={{ zIndex: 30 }} />
        {stageCount > 1 && (
          <BannerCrossfadeDots aria-hidden="true" style={{ zIndex: 31 }}>
            {photos.map((photo, index) => (
              <BannerCrossfadeDot key={`${photo}-dot-${index}`} $active={index === active} />
            ))}
          </BannerCrossfadeDots>
        )}
      </BannerStageAtrium>
    );
  }

  const heroPhoto = photos[active];
  const railItems = photos
    .map((photo, index) => ({ photo, index }))
    .filter((entry) => entry.index !== active)
    .slice(0, 4);

  return (
    <BannerStageVitrine data-testid="banner-stage-vitrine" style={positionStyle}>
      <BannerStageVitrineHero>
        <BannerStageHeroBackdrop aria-hidden="true">
          {renderStageMedia(heroPhoto)}
        </BannerStageHeroBackdrop>
        {renderStageMedia(heroPhoto, isBannerVideoUrl(heroPhoto) ? 'banner-stage-video' : 'banner-stage-image')}
        {isBannerVideoUrl(heroPhoto) && (
          <BannerStagePlayOrb aria-hidden="true"><PlayGlyph /></BannerStagePlayOrb>
        )}
        <BannerCrossfadeScrim />
      </BannerStageVitrineHero>
      {railItems.length > 0 && (
        <BannerStageVitrineRail>
          {railItems.map(({ photo, index }) => (
            <BannerStageVitrineThumb key={`${photo}-${index}`}>
              {isBannerVideoUrl(photo) ? (
                <BannerStageVideo src={photo} muted loop autoPlay playsInline preload="metadata" />
              ) : (
                <BannerStageImage src={photo} alt="" draggable={false} />
              )}
            </BannerStageVitrineThumb>
          ))}
        </BannerStageVitrineRail>
      )}
      {stageCount > 1 && (
        <BannerCrossfadeDots aria-hidden="true" style={{ zIndex: 31 }}>
          {photos.map((photo, index) => (
            <BannerCrossfadeDot key={`${photo}-dot-${index}`} $active={index === active} />
          ))}
        </BannerCrossfadeDots>
      )}
    </BannerStageVitrine>
  );
};

export default React.memo(UserDashboardBannerStageLayouts);
