import React from 'react';
import {
  BannerCollageImage,
  BannerCollageLayer,
  BannerCollageMediaFrame,
  BannerCollageVideo,
  BannerCarouselTrack,
  BannerCrossfadeDot,
  BannerCrossfadeDots,
  BannerCrossfadeImage,
  BannerCrossfadeLayer,
  BannerCrossfadeScrim,
  BannerCrossfadeVideo,
  BannerImage,
  BannerStageAtrium,
  BannerStageAtriumSlot,
  BannerStageAtriumTrack,
  BannerStageImage,
  BannerStagePlayOrb,
  BannerStageVideo,
  BannerStageVitrine,
  BannerStageVitrineHero,
  BannerStageVitrineRail,
  BannerStageVitrineThumb,
  BannerStickyCarouselFrame,
  BannerStickyCarouselImage,
  BannerStickyCarouselLayer,
  BannerStickyCarouselTrack,
  BannerStickyCarouselVideo,
  BannerTileImage,
  BannerTileLayer,
} from '../styles/DashboardV3Styles';
import {
  MAX_BANNER_COLLAGE_PHOTOS,
  isBannerCarouselLayout,
  type BannerCollageLayout,
  type BannerObjectFit,
  type BannerObjectPosition,
} from '../../../services/profileService';
import {
  buildBannerCollageFrameStyle,
  DEFAULT_BANNER_COLLAGE_ASPECT_RATIO,
  isBannerVideoUrl,
  normalizeBannerMediaAspectRatio,
  TILE_REPEAT_COUNT,
} from '../utils/bannerCompositionMedia';

const TILE_INDEXES = Array.from({ length: TILE_REPEAT_COUNT }, (_, index) => index);

/* Decorative play glyph over video stage frames (host is aria-hidden). */
const PlayGlyph: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

/* Atrium coverflow geometry (Slice 2): a frame's 3D transform from its signed
   offset to the active hero, ported from the Feed Banner Studio prototype.
   Returned as CSS custom properties consumed by BannerStageAtriumSlot, so the
   coverflow needs no per-frame styled-component. */
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

interface UserDashboardBannerMediaLayerProps {
  backgroundImage: string | null;
  bannerObjectPosition: BannerObjectPosition;
  bannerObjectFit: BannerObjectFit;
  bannerImageScale: number;
  bannerCollagePhotos: string[];
  bannerCollageLayout: BannerCollageLayout;
  bannerStickyCarousel: boolean;
}

const UserDashboardBannerMediaLayer: React.FC<UserDashboardBannerMediaLayerProps> = ({
  backgroundImage,
  bannerObjectPosition,
  bannerObjectFit,
  bannerImageScale,
  bannerCollagePhotos,
  bannerCollageLayout,
  bannerStickyCarousel,
}) => {
  const [collageAspectRatios, setCollageAspectRatios] = React.useState<Record<string, number>>({});
  const updateCollageAspectRatio = React.useCallback((key: string, width: number, height: number) => {
    const nextAspectRatio = normalizeBannerMediaAspectRatio(width, height);
    setCollageAspectRatios((current) => (
      current[key] === nextAspectRatio ? current : { ...current, [key]: nextAspectRatio }
    ));
  }, []);

  /* M5b crossfade hero: JS-driven active index (adaptive to photo count —
     pure-CSS keyframe percentages can't parametrize N). Hooks stay top-level
     so the hook order never changes across layout switches. */
  const isCrossfade =
    bannerObjectFit === 'collage'
    && bannerCollageLayout === 'crossfade'
    && bannerCollagePhotos.length > 0;
  const crossfadePhotoCount = Math.min(bannerCollagePhotos.length, MAX_BANNER_COLLAGE_PHOTOS);
  const [crossfadeIndex, setCrossfadeIndex] = React.useState(0);
  React.useEffect(() => {
    if (!isCrossfade || crossfadePhotoCount < 2) return undefined;
    // Reduced-motion users keep a static first photo — no cycling.
    if (typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }
    const id = window.setInterval(
      () => setCrossfadeIndex((current) => (current + 1) % crossfadePhotoCount),
      6500,
    );
    return () => window.clearInterval(id);
  }, [isCrossfade, crossfadePhotoCount]);

  /* Slice 2 Stage hero (Atrium + Vitrine): one active index driven here, same
     adaptive + reduced-motion-safe pattern as crossfade. Hooks stay top-level
     so order never changes across layout switches. */
  const isStage =
    bannerObjectFit === 'collage'
    && (bannerCollageLayout === 'atrium' || bannerCollageLayout === 'vitrine')
    && bannerCollagePhotos.length > 0;
  const stagePhotoCount = Math.min(bannerCollagePhotos.length, MAX_BANNER_COLLAGE_PHOTOS);
  const [stageIndex, setStageIndex] = React.useState(0);
  React.useEffect(() => {
    if (!isStage || stagePhotoCount < 2) return undefined;
    // Reduced-motion users keep a static hero — no auto-advance.
    if (typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }
    const id = window.setInterval(
      () => setStageIndex((current) => (current + 1) % stagePhotoCount),
      5200,
    );
    return () => window.clearInterval(id);
  }, [isStage, stagePhotoCount]);

  if (bannerObjectFit === 'tile' && backgroundImage) {
    return (
      <BannerTileLayer style={{ '--banner-image-scale': String(bannerImageScale) } as React.CSSProperties}>
        {TILE_INDEXES.map((index) => (
          <BannerTileImage
            key={index}
            src={backgroundImage}
            alt=""
            data-testid="banner-tile-image"
            draggable={false}
          />
        ))}
      </BannerTileLayer>
    );
  }

  if (isCrossfade) {
    const photos = bannerCollagePhotos.slice(0, MAX_BANNER_COLLAGE_PHOTOS);
    const activeIndex = crossfadeIndex % photos.length;
    return (
      <BannerCrossfadeLayer data-testid="banner-crossfade-layer">
        {photos.map((photo, index) => (
          isBannerVideoUrl(photo) ? (
            <BannerCrossfadeVideo
              key={`${photo}-${index}`}
              src={photo}
              data-testid="banner-crossfade-video"
              $active={index === activeIndex}
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
            />
          ) : (
            <BannerCrossfadeImage
              key={`${photo}-${index}`}
              src={photo}
              alt=""
              data-testid="banner-crossfade-image"
              $active={index === activeIndex}
              draggable={false}
            />
          )
        ))}
        <BannerCrossfadeScrim />
        {photos.length > 1 && (
          <BannerCrossfadeDots aria-hidden="true">
            {photos.map((photo, index) => (
              <BannerCrossfadeDot key={`${photo}-dot-${index}`} $active={index === activeIndex} />
            ))}
          </BannerCrossfadeDots>
        )}
      </BannerCrossfadeLayer>
    );
  }

  if (bannerObjectFit === 'collage' && bannerCollagePhotos.length > 0) {
    const photos = bannerCollagePhotos.slice(0, MAX_BANNER_COLLAGE_PHOTOS);
    const positionStyle = { '--banner-object-position': bannerObjectPosition } as React.CSSProperties;

    /* Slice 2 — Atrium: a 3D coverflow stage. Each frame's transform comes from
       its signed offset to the active hero; the active index auto-advances
       (reduced-motion → static hero). Decorative: no in-cover nav. */
    if (bannerCollageLayout === 'atrium') {
      const stageCount = photos.length;
      const active = stageIndex % stageCount;
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
          {/* scrim/dots sit ABOVE the z-indexed coverflow frames (hero z=20);
             the scrim gradient is ~transparent at center, so the hero + play
             orb stay visible while the bottom darkens for legibility. */}
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

    /* Slice 2 — Vitrine: a full-bleed hero + a vertical thumbnail rail. The hero
       auto-advances through the media; the rail shows the next frames. */
    if (bannerCollageLayout === 'vitrine') {
      const stageCount = photos.length;
      const active = stageIndex % stageCount;
      const heroPhoto = photos[active];
      const railItems = photos
        .map((photo, index) => ({ photo, index }))
        .filter((entry) => entry.index !== active)
        .slice(0, 4);
      return (
        <BannerStageVitrine data-testid="banner-stage-vitrine" style={positionStyle}>
          <BannerStageVitrineHero>
            {isBannerVideoUrl(heroPhoto) ? (
              <BannerStageVideo src={heroPhoto} data-testid="banner-stage-video" muted loop autoPlay playsInline preload="metadata" />
            ) : (
              <BannerStageImage src={heroPhoto} alt="" data-testid="banner-stage-image" draggable={false} />
            )}
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
    }

    const isCarouselLayout = isBannerCarouselLayout(bannerCollageLayout);
    const displayPhotos = isCarouselLayout ? [...photos, ...photos] : photos;
    // Adaptive marquee speed (2026-06-11): ~6s of travel per photo, floored so
    // a 2-photo reel doesn't whip past. Keeps px/sec steady across photo counts.
    const carouselDurationStyle = {
      '--banner-carousel-duration': `${Math.max(20, photos.length * 6)}s`,
    } as React.CSSProperties;
    const collageFrames = displayPhotos.map((photo, index) => {
      const mediaKey = `${photo}-${index}`;
      const aspectRatio = collageAspectRatios[mediaKey] ?? DEFAULT_BANNER_COLLAGE_ASPECT_RATIO;
      return (
        <BannerCollageMediaFrame
          key={mediaKey}
          data-index={index % photos.length}
          style={buildBannerCollageFrameStyle(aspectRatio, bannerImageScale)}
        >
          {isBannerVideoUrl(photo) ? (
            <BannerCollageVideo
              src={photo}
              data-testid="banner-collage-video"
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
              onLoadedMetadata={(event) => updateCollageAspectRatio(
                mediaKey,
                event.currentTarget.videoWidth,
                event.currentTarget.videoHeight,
              )}
            />
          ) : (
            <BannerCollageImage
              src={photo}
              alt=""
              data-testid="banner-collage-image"
              draggable={false}
              onLoad={(event) => updateCollageAspectRatio(
                mediaKey,
                event.currentTarget.naturalWidth,
                event.currentTarget.naturalHeight,
              )}
            />
          )}
        </BannerCollageMediaFrame>
      );
    });

    return (
      <>
        {(!isCarouselLayout || !bannerStickyCarousel) && (
          <BannerCollageLayer
            data-layout={bannerCollageLayout}
            style={{
              '--banner-image-scale': String(bannerImageScale),
              '--banner-object-position': bannerObjectPosition,
            } as React.CSSProperties}
          >
            {isCarouselLayout ? <BannerCarouselTrack style={carouselDurationStyle}>{collageFrames}</BannerCarouselTrack> : collageFrames}
          </BannerCollageLayer>
        )}
        {isCarouselLayout && bannerStickyCarousel && (
          <BannerStickyCarouselLayer
            data-testid="banner-sticky-carousel"
            data-layout={bannerCollageLayout}
            aria-hidden="true"
          >
            <BannerStickyCarouselTrack style={carouselDurationStyle}>
              {displayPhotos.map((photo, index) => (
                <BannerStickyCarouselFrame key={`${photo}-sticky-${index}`}>
                  {isBannerVideoUrl(photo) ? (
                    <BannerStickyCarouselVideo
                      src={photo}
                      data-testid="banner-sticky-carousel-video"
                      muted
                      loop
                      autoPlay
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <BannerStickyCarouselImage
                      src={photo}
                      alt=""
                      data-testid="banner-sticky-carousel-image"
                      draggable={false}
                    />
                  )}
                </BannerStickyCarouselFrame>
              ))}
            </BannerStickyCarouselTrack>
          </BannerStickyCarouselLayer>
        )}
      </>
    );
  }

  if (!backgroundImage) return null;

  return (
    <BannerImage
      src={backgroundImage}
      alt="Profile cover photo"
      style={{
        objectFit: bannerObjectFit,
        objectPosition: bannerObjectPosition,
        '--banner-image-scale': String(bannerImageScale),
      } as React.CSSProperties}
      draggable={false}
    />
  );
};

export default React.memo(UserDashboardBannerMediaLayer);
