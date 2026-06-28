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
  BannerSmartFitBackdrop,
  BannerSmartFitImage,
  BannerSmartFitLayer,
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
import UserDashboardBannerStageLayouts from './UserDashboardBannerStageLayouts';

const TILE_INDEXES = Array.from({ length: TILE_REPEAT_COUNT }, (_, index) => index);

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

  const isCrossfade =
    bannerObjectFit === 'collage'
    && bannerCollageLayout === 'crossfade'
    && bannerCollagePhotos.length > 0;
  const crossfadePhotoCount = Math.min(bannerCollagePhotos.length, MAX_BANNER_COLLAGE_PHOTOS);
  const [crossfadeIndex, setCrossfadeIndex] = React.useState(0);

  React.useEffect(() => {
    if (!isCrossfade || crossfadePhotoCount < 2) return undefined;
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


  if (bannerObjectFit === 'smart' && backgroundImage) {
    const smartFitScale = Math.min(bannerImageScale, 1);

    return (
      <BannerSmartFitLayer
        data-testid="banner-smart-fit-layer"
        style={{
          '--banner-object-position': bannerObjectPosition,
          '--banner-image-scale': String(smartFitScale),
        } as React.CSSProperties}
      >
        <BannerSmartFitBackdrop src={backgroundImage} alt="" aria-hidden="true" draggable={false} />
        <BannerSmartFitImage src={backgroundImage} alt="Profile cover photo" draggable={false} />
      </BannerSmartFitLayer>
    );
  }

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

    if (bannerCollageLayout === 'smart-carousel' || bannerCollageLayout === 'atrium' || bannerCollageLayout === 'vitrine') {
      return (
        <UserDashboardBannerStageLayouts
          layout={bannerCollageLayout}
          bannerObjectPosition={bannerObjectPosition}
          bannerCollagePhotos={photos}
        />
      );
    }

    const isCarouselLayout = isBannerCarouselLayout(bannerCollageLayout);
    const displayPhotos = isCarouselLayout ? [...photos, ...photos] : photos;
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
            {isCarouselLayout ? (
              <BannerCarouselTrack style={carouselDurationStyle}>{collageFrames}</BannerCarouselTrack>
            ) : collageFrames}
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
